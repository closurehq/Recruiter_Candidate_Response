import Link from 'next/link'
import { getServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import CloseButton from './CloseButton'

export const dynamic = 'force-dynamic'

type Status = 'active' | 'pending-review' | 'closed-pending' | 'closed-sent'

const STATUS_META: Record<Status, { label: string; dot: string }> = {
  'active':         { label: 'Active',      dot: 'bg-neutral-400' },
  'pending-review': { label: 'Pending review', dot: 'bg-amber-500' },
  'closed-pending': { label: 'Draft ready', dot: 'bg-accent' },
  'closed-sent':    { label: 'Sent',        dot: 'bg-emerald-500' },
}

async function getCandidate(id: string) {
  const client = getServiceClient()
  const { data, error } = await client
    .from('candidates')
    .select('*, roles(id, title), evaluations(*)')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const candidate = await getCandidate(id)
  if (!candidate) notFound()

  const evaluation = candidate.evaluations?.[0] ?? null
  const status = candidate.status as Status
  const meta = STATUS_META[status] ?? STATUS_META['active']
  const canGenerate = status === 'active' || status === 'pending-review'

  return (
    <div>
      <Link
        href={`/roles/${candidate.roles?.id ?? ''}`}
        className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 hover:text-foreground transition-colors"
      >
        ← {candidate.roles?.title ?? 'Back'}
      </Link>

      <div className="flex items-start justify-between mt-6 mb-8">
        <div>
          <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-0.5">
            Candidate
          </p>
          <h1 className="text-xl font-semibold">{candidate.name}</h1>
          <p className="text-sm text-neutral-500 font-mono mt-0.5">{candidate.email}</p>
        </div>
        <span className="flex items-center gap-1.5 mt-1">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
          <span className="text-[11px] text-neutral-500">{meta.label}</span>
        </span>
      </div>

      <div className="border border-neutral-200 bg-white divide-y divide-neutral-200 mb-8">
        <div className="px-6 py-5">
          <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-1.5">CV</p>
          {candidate.cv_path ? (
            <p className="text-sm">Uploaded</p>
          ) : (
            <p className="text-sm text-neutral-400">Not provided</p>
          )}
        </div>
        <div className="px-6 py-5">
          <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-1.5">Interview transcript</p>
          {candidate.transcript_path ? (
            <p className="text-sm">Uploaded</p>
          ) : (
            <p className="text-sm text-neutral-400">Not provided</p>
          )}
        </div>
        {candidate.recruiter_notes && (
          <div className="px-6 py-5">
            <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-1.5">Recruiter notes</p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{candidate.recruiter_notes}</p>
          </div>
        )}
      </div>

      {canGenerate && !evaluation && (
        <div className="mb-8">
          <CloseButton candidateId={id} hasCvText={!!candidate.cv_text} />
        </div>
      )}

      {evaluation && (
        <div>
          <p className="text-[11px] font-medium tracking-widests uppercase text-neutral-500 mb-4">
            Evaluation
          </p>

          <div className="border border-neutral-200 bg-white divide-y divide-neutral-200 mb-6">
            <div className="px-6 py-5">
              <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">Assessment</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{evaluation.evaluation_text}</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">Evidence statement</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{evaluation.evidence_statement}</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">Draft message</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {evaluation.final_message ?? evaluation.draft_message}
              </p>
            </div>
          </div>

          {!evaluation.sent_at ? (
            <Link
              href={`/candidates/${id}/review`}
              className="bg-accent text-white text-xs font-medium px-4 py-2 tracking-wide hover:opacity-90 transition-opacity inline-block"
            >
              Review and send →
            </Link>
          ) : (
            <p className="text-xs text-neutral-500 font-mono">
              Sent {new Date(evaluation.sent_at).toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
