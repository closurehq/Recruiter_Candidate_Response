import Link from 'next/link'
import { getServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Status = 'active' | 'pending-review' | 'closed-pending' | 'closed-sent'

const STATUS_META: Record<Status, { label: string; dot: string }> = {
  'active':         { label: 'Active',      dot: 'bg-neutral-400' },
  'pending-review': { label: 'Pending',     dot: 'bg-amber-500' },
  'closed-pending': { label: 'Draft ready', dot: 'bg-accent' },
  'closed-sent':    { label: 'Sent',        dot: 'bg-emerald-500' },
}

async function getRole(id: string) {
  const client = getServiceClient()
  const { data, error } = await client
    .from('roles')
    .select('id, title, job_description, created_at, candidates(id, name, email, status, created_at)')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const role = await getRole(id)
  if (!role) notFound()

  const candidates = (role.candidates ?? []) as {
    id: string
    name: string
    email: string
    status: string
    created_at: string
  }[]

  return (
    <div>
      <Link
        href="/"
        className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 hover:text-foreground transition-colors"
      >
        ← Roles
      </Link>

      <div className="flex items-start justify-between mt-6 mb-8">
        <div>
          <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-0.5">
            Role
          </p>
          <h1 className="text-xl font-semibold">{role.title}</h1>
        </div>
        <Link
          href={`/candidates/new?role=${role.id}`}
          className="bg-accent text-white text-xs font-medium px-4 py-2 tracking-wide hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          + Add candidate
        </Link>
      </div>

      <details className="mb-8 border border-neutral-200 bg-white">
        <summary className="px-6 py-4 cursor-pointer select-none flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-widest uppercase text-neutral-500">
            Job description
          </span>
          <span className="text-xs text-neutral-400">Toggle</span>
        </summary>
        <div className="px-6 pb-6 pt-2 border-t border-neutral-200">
          <pre className="text-sm text-neutral-700 whitespace-pre-wrap font-sans leading-relaxed">
            {role.job_description}
          </pre>
        </div>
      </details>

      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500">
          Candidates
        </p>
        <p className="text-xs font-mono text-neutral-500">{candidates.length}</p>
      </div>

      {candidates.length === 0 ? (
        <div className="border border-dashed border-neutral-300 py-14 text-center">
          <p className="text-sm text-neutral-500">No candidates yet.</p>
          <Link
            href={`/candidates/new?role=${role.id}`}
            className="text-sm text-accent mt-2 inline-block hover:underline"
          >
            Add first candidate →
          </Link>
        </div>
      ) : (
        <div className="border border-neutral-200 bg-white divide-y divide-neutral-200">
          {candidates.map((c) => {
            const meta = STATUS_META[c.status as Status] ?? STATUS_META['active']
            return (
              <Link
                key={c.id}
                href={`/candidates/${c.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5 truncate">{c.email}</p>
                </div>
                <div className="flex items-center gap-6 ml-4 shrink-0">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    <span className="text-[11px] text-neutral-500">{meta.label}</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {new Date(c.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
