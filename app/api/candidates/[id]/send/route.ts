import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { evaluation_id, final_message } = await req.json()

  if (!evaluation_id || !final_message?.trim()) {
    return NextResponse.json(
      { error: 'evaluation_id and final_message are required' },
      { status: 400 }
    )
  }

  const client = getServiceClient()

  // Load evaluation
  const { data: evaluation, error: evalError } = await client
    .from('evaluations')
    .select('*')
    .eq('id', evaluation_id)
    .eq('candidate_id', id)
    .single()

  if (evalError || !evaluation) {
    return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
  }

  if (evaluation.sent_at) {
    return NextResponse.json({ ok: true })
  }

  // Load candidate
  const { data: candidate, error: candError } = await client
    .from('candidates')
    .select('name, email')
    .eq('id', id)
    .single()

  if (candError || !candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }

  await sendEmail({
    to: candidate.email,
    subject: 'Update on your application',
    body: final_message.trim(),
    senderName: 'The Recruitment Team',
  })

  const now = new Date().toISOString()

  await client
    .from('evaluations')
    .update({
      final_message: final_message.trim(),
      approved_at: now,
      sent_at: now,
    })
    .eq('id', evaluation_id)

  await client
    .from('candidates')
    .update({ status: 'closed-sent' })
    .eq('id', id)

  await client.from('audit_log').insert({
    candidate_id: id,
    event: 'email_sent',
    detail: `Email sent to ${candidate.email}`,
  })

  return NextResponse.json({ ok: true })
}
