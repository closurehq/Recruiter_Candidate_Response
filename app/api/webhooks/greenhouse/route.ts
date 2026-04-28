import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getServiceClient } from '@/lib/supabase'
import { extractText } from '@/lib/pdf'

const BUCKET = 'candidate-files'

function verifyGreenhouseSignature(
  rawBody: string,
  header: string,
  secret: string
): boolean {
  const pairs: Record<string, string> = {}
  for (const part of header.split(',')) {
    const idx = part.indexOf('=')
    if (idx !== -1) pairs[part.slice(0, idx).trim()] = part.slice(idx + 1).trim()
  }
  const { t, v1 } = pairs
  if (!t || !v1) return false

  const signedPayload = `${t}.${rawBody}`
  const expected = createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex')

  try {
    return timingSafeEqual(
      Buffer.from(v1.toLowerCase(), 'hex'),
      Buffer.from(expected, 'hex')
    )
  } catch {
    return false
  }
}

async function harvestGet(url: string, authHeader: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Authorization: authHeader } })
  if (!res.ok) {
    throw new Error(`Harvest ${url} returned ${res.status}`)
  }
  return res.json()
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signatureHeader = req.headers.get('Greenhouse-Signature') ?? ''
  const secret = process.env.GREENHOUSE_WEBHOOK_SECRET ?? ''

  if (!secret || !verifyGreenhouseSignature(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    action: string
    payload: {
      application: {
        id: number
        candidate_id: number
        jobs: { id: number; name: string }[]
        rejection_reason?: { name: string } | null
      }
    }
  }

  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.action !== 'candidate_rejected') {
    return NextResponse.json({ ok: true })
  }

  const application = body.payload?.application
  if (!application) {
    return NextResponse.json({ error: 'Missing application payload' }, { status: 400 })
  }

  const applicationId = application.id
  const ghCandidateId = application.candidate_id
  const jobId = application.jobs?.[0]?.id
  const rejectionReason = application.rejection_reason?.name ?? null

  if (!applicationId || !ghCandidateId || !jobId) {
    return NextResponse.json({ error: 'Missing required IDs in payload' }, { status: 400 })
  }

  const client = getServiceClient()

  const { data: apiKeySetting } = await client
    .from('settings')
    .select('value')
    .eq('key', 'greenhouse_api_key')
    .maybeSingle()

  if (!apiKeySetting?.value) {
    return NextResponse.json(
      { error: 'greenhouse_api_key not configured in settings' },
      { status: 500 }
    )
  }

  const authHeader = `Basic ${Buffer.from(`${apiKeySetting.value}:`).toString('base64')}`

  // Deduplication check
  const { data: existingCandidate } = await client
    .from('candidates')
    .select('id')
    .eq('greenhouse_application_id', applicationId)
    .maybeSingle()

  if (existingCandidate) {
    await client.from('audit_log').insert({
      candidate_id: existingCandidate.id,
      event: 'greenhouse_duplicate_skipped',
      detail: `Application ${applicationId} already imported`,
    })
    return NextResponse.json({ ok: true })
  }

  // Parallel Harvest calls
  const [ghCandidate, ghJob, activityFeed] = await Promise.all([
    harvestGet(`https://harvest.greenhouse.io/v1/candidates/${ghCandidateId}`, authHeader),
    harvestGet(`https://harvest.greenhouse.io/v1/jobs/${jobId}`, authHeader),
    harvestGet(
      `https://harvest.greenhouse.io/v1/applications/${applicationId}/activity_feed`,
      authHeader
    ),
  ]) as [
    {
      first_name?: string
      last_name?: string
      email_addresses?: { value: string; type: string }[]
      attachments?: { filename?: string; url: string; type: string; content_type?: string }[]
    },
    { name?: string; title?: string; notes?: string },
    { notes?: { body: string }[] },
  ]

  const candidateName =
    `${ghCandidate.first_name ?? ''} ${ghCandidate.last_name ?? ''}`.trim() || 'Unknown'
  const candidateEmail = ghCandidate.email_addresses?.[0]?.value ?? ''

  if (!candidateEmail) {
    return NextResponse.json(
      { error: 'Candidate has no email address in Greenhouse' },
      { status: 400 }
    )
  }

  const jobTitle = ghJob.name ?? ghJob.title ?? 'Untitled role'
  const jobDescription = ghJob.notes ?? ''

  // Build recruiter notes from activity feed + rejection reason
  const activityNotes = (activityFeed.notes ?? [])
    .map((n) => n.body)
    .filter(Boolean)
  const notesParts: string[] = []
  if (rejectionReason) notesParts.push(`Rejection reason: ${rejectionReason}`)
  notesParts.push(...activityNotes)
  const recruiterNotes = notesParts.length > 0 ? notesParts.join('\n\n') : null

  // Find or create role
  let roleId: string

  const { data: existingRole } = await client
    .from('roles')
    .select('id')
    .eq('greenhouse_job_id', jobId)
    .maybeSingle()

  if (existingRole) {
    roleId = existingRole.id
  } else {
    const { data: newRole, error: roleError } = await client
      .from('roles')
      .insert({
        title: jobTitle,
        job_description: jobDescription,
        greenhouse_job_id: jobId,
      })
      .select('id')
      .single()

    if (roleError || !newRole) {
      return NextResponse.json(
        { error: `Failed to create role: ${roleError?.message}` },
        { status: 500 }
      )
    }
    roleId = newRole.id
  }

  // Download CV and upload to storage
  let cvPath: string | null = null
  let cvText: string | null = null

  const resume = (ghCandidate.attachments ?? []).find((a) => a.type === 'resume')
  if (resume?.url) {
    try {
      const cvRes = await fetch(resume.url)
      if (cvRes.ok) {
        const contentType = cvRes.headers.get('content-type') ?? 'application/octet-stream'
        const mimeType = contentType.split(';')[0].trim()
        const buffer = Buffer.from(await cvRes.arrayBuffer())
        const filename = resume.filename ?? `greenhouse-cv-${ghCandidateId}.pdf`
        const storagePath = `${Date.now()}-${filename}`

        const { error: uploadError } = await client.storage
          .from(BUCKET)
          .upload(storagePath, buffer, { contentType: mimeType })

        if (!uploadError) {
          cvPath = storagePath
          try {
            cvText = await extractText(buffer, mimeType)
          } catch {
            // non-fatal: candidate created without extracted text
          }
        }
      }
    } catch {
      // non-fatal: proceed without CV
    }
  }

  // Create candidate
  const { data: newCandidate, error: candError } = await client
    .from('candidates')
    .insert({
      role_id: roleId,
      name: candidateName,
      email: candidateEmail,
      cv_path: cvPath,
      cv_text: cvText,
      recruiter_notes: recruiterNotes,
      status: 'pending-review',
      greenhouse_candidate_id: ghCandidateId,
      greenhouse_application_id: applicationId,
    })
    .select('id')
    .single()

  if (candError || !newCandidate) {
    return NextResponse.json(
      { error: `Failed to create candidate: ${candError?.message}` },
      { status: 500 }
    )
  }

  await client.from('audit_log').insert({
    candidate_id: newCandidate.id,
    event: 'greenhouse_candidate_imported',
    detail: `Imported from Greenhouse application ${applicationId}`,
  })

  return NextResponse.json({ ok: true })
}
