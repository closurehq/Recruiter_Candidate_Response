import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { runEvaluationAgent } from '@/lib/agent'

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

  const { data: candidate, error: candError } = await client
    .from('candidates')
    .select('*, roles(job_description)')
    .eq('id', id)
    .single()

  if (candError || !candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }

  if (candidate.status !== 'active' && candidate.status !== 'pending-review') {
    return NextResponse.json(
      { error: 'Candidate must be active or pending-review to close' },
      { status: 400 }
    )
  }

  if (!candidate.cv_text) {
    return NextResponse.json(
      { error: 'CV text is required — re-upload the CV to extract text' },
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
    const result = await runEvaluationAgent({
      jobDescription,
      cvText: candidate.cv_text,
      transcriptText: candidate.transcript_text ?? null,
      recruiterNotes: candidate.recruiter_notes ?? null,
    })

    // Validate agent returned all required fields
    if (!result.evaluation || !result.evidence_statement || !result.draft_message) {
      throw new Error('Agent response missing required fields')
    }

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

    await client
      .from('candidates')
      .update({ status: 'closed-pending' })
      .eq('id', id)

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
