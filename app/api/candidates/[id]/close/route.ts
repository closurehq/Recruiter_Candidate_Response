import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { runEvaluationAgent } from '@/lib/agent'
import { downloadFile } from '@/lib/upload'
import { extractText } from '@/lib/pdf'

export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const client = getServiceClient()

  // Load candidate with role
  const { data: candidate, error: candError } = await client
    .from('candidates')
    .select('*, roles(job_description)')
    .eq('id', id)
    .single()

  if (candError || !candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }

  if (candidate.status !== 'active') {
    return NextResponse.json(
      { error: 'Candidate is already closed' },
      { status: 400 }
    )
  }

  if (!candidate.cv_path) {
    return NextResponse.json(
      { error: 'CV is required to close a candidate' },
      { status: 400 }
    )
  }

  const jobDescription = candidate.roles?.job_description
  if (!jobDescription) {
    return NextResponse.json(
      { error: 'Role job description not found' },
      { status: 400 }
    )
  }

  try {
    // Extract text from CV
    console.log('[close] downloading CV:', candidate.cv_path)
    const cvBuffer = await downloadFile(candidate.cv_path)
    console.log('[close] CV downloaded, bytes:', cvBuffer.length)
    const cvExt = candidate.cv_path.split('.').pop()?.toLowerCase()
    const cvMime = cvExt === 'pdf' ? 'application/pdf' : 'text/plain'
    console.log('[close] extracting CV text, mime:', cvMime)
    const cvText = await extractText(cvBuffer, cvMime)
    console.log('[close] CV text extracted, chars:', cvText.length)

    // Extract text from transcript if present
    let transcriptText: string | null = null
    if (candidate.transcript_path) {
      console.log('[close] downloading transcript')
      const tBuffer = await downloadFile(candidate.transcript_path)
      const tExt = candidate.transcript_path.split('.').pop()?.toLowerCase()
      const tMime = tExt === 'pdf' ? 'application/pdf' : 'text/plain'
      transcriptText = await extractText(tBuffer, tMime)
      console.log('[close] transcript extracted, chars:', transcriptText.length)
    }

    // Run agent
    console.log('[close] calling evaluation agent')
    const result = await runEvaluationAgent({
      jobDescription,
      cvText,
      transcriptText,
      recruiterNotes: candidate.recruiter_notes ?? null,
    })
    console.log('[close] agent complete')

    // Save evaluation
    const { data: evaluation, error: evalError } = await client
      .from('evaluations')
      .insert({
        candidate_id: id,
        evaluation_text: result.evaluation,
        evidence_statement: result.evidence_statement,
        draft_message: result.draft_message,
      })
      .select()
      .single()

    if (evalError) {
      return NextResponse.json({ error: evalError.message }, { status: 500 })
    }

    // Update candidate status
    await client
      .from('candidates')
      .update({ status: 'closed' })
      .eq('id', id)

    // Audit log
    await client.from('audit_log').insert({
      candidate_id: id,
      event: 'evaluation_generated',
      detail: `Evaluation ${evaluation.id} created`,
    })

    return NextResponse.json(evaluation, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[close] unhandled error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
