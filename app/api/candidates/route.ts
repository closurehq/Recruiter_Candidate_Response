import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { uploadFile } from '@/lib/upload'
import { extractText } from '@/lib/pdf'

const ALLOWED_TYPES = ['application/pdf', 'text/plain']
const MAX_SIZE = 10 * 1024 * 1024

async function processUpload(
  file: File,
  prefix: string
): Promise<{ path: string; text: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`${prefix}: only PDF and plain text files are accepted`)
  }
  if (file.size > MAX_SIZE) {
    throw new Error(`${prefix}: file size exceeds 10 MB limit`)
  }
  const path = await uploadFile(file, `${Date.now()}-${file.name}`)
  const buffer = Buffer.from(await file.arrayBuffer())
  const text = await extractText(buffer, file.type)
  return { path, text }
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const role_id = formData.get('role_id') as string | null
  const name = formData.get('name') as string | null
  const email = formData.get('email') as string | null
  const recruiter_notes = formData.get('recruiter_notes') as string | null
  const cvFile = formData.get('cv') as File | null
  const transcriptFile = formData.get('transcript') as File | null

  if (!role_id || !name?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: 'role_id, name, and email are required' },
      { status: 400 }
    )
  }

  if (!cvFile) {
    return NextResponse.json({ error: 'cv file is required' }, { status: 400 })
  }

  try {
    const cv = await processUpload(cvFile, 'cv')
    let transcript: { path: string; text: string } | null = null
    if (transcriptFile) {
      transcript = await processUpload(transcriptFile, 'transcript')
    }

    const client = getServiceClient()
    const { data, error } = await client
      .from('candidates')
      .insert({
        role_id,
        name: name.trim(),
        email: email.trim(),
        cv_path: cv.path,
        cv_text: cv.text,
        transcript_path: transcript?.path ?? null,
        transcript_text: transcript?.text ?? null,
        recruiter_notes: recruiter_notes?.trim() ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
