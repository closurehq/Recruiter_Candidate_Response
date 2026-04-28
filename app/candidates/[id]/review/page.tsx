import { getServiceClient } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ReviewForm from './ReviewForm'

export const dynamic = 'force-dynamic'

async function getData(candidateId: string) {
  const client = getServiceClient()

  const [candidateRes, providerRes] = await Promise.all([
    client
      .from('candidates')
      .select('id, name, email, status, roles(id, title), evaluations(*)')
      .eq('id', candidateId)
      .single(),
    client
      .from('settings')
      .select('value')
      .eq('key', 'email_provider')
      .maybeSingle(),
  ])

  if (candidateRes.error || !candidateRes.data) return null

  return {
    candidate: candidateRes.data,
    emailProvider: (providerRes.data?.value ?? 'resend') as 'resend' | 'gmail-mcp',
  }
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getData(id)

  if (!result) notFound()

  const { candidate, emailProvider } = result
  const evaluation = candidate.evaluations?.[0]
  if (!evaluation) redirect(`/candidates/${id}`)
  if (evaluation.sent_at) redirect(`/candidates/${id}`)

  return (
    <div>
      <Link
        href={`/candidates/${id}`}
        className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 hover:text-foreground transition-colors"
      >
        ← {candidate.name}
      </Link>

      <div className="mt-6 mb-8">
        <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-0.5">
          Review and send
        </p>
        <h1 className="text-xl font-semibold">{candidate.name}</h1>
        <p className="text-sm text-neutral-500 font-mono mt-0.5">{candidate.email}</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div className="border border-neutral-200 bg-white">
          <div className="px-6 py-4 border-b border-neutral-200">
            <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500">Assessment</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{evaluation.evaluation_text}</p>
          </div>
        </div>

        <div className="border border-neutral-200 bg-white">
          <div className="px-6 py-4 border-b border-neutral-200">
            <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500">Evidence statement</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{evaluation.evidence_statement}</p>
          </div>
        </div>

        <div className="border border-neutral-200 bg-white">
          <div className="px-6 py-4 border-b border-neutral-200">
            <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500">
              Email draft — edit before sending
            </p>
          </div>
          <div className="p-6">
            <ReviewForm
              candidateId={id}
              evaluationId={evaluation.id}
              draftMessage={evaluation.draft_message}
              emailProvider={emailProvider}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
