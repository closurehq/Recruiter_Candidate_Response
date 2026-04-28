import Link from 'next/link'
import { getServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Status = 'active' | 'pending-review' | 'closed-pending' | 'closed-sent'

const STATUS_META: Record<Status, { label: string; dot: string }> = {
  'active':         { label: 'Active',      dot: 'bg-neutral-400' },
  'pending-review': { label: 'Pending',     dot: 'bg-amber-500' },
  'closed-pending': { label: 'Draft ready', dot: 'bg-accent' },
  'closed-sent':    { label: 'Sent',        dot: 'bg-emerald-500' },
}

async function getDashboardData() {
  const client = getServiceClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [rolesRes, awaitingRes, sentRes] = await Promise.all([
    client
      .from('roles')
      .select('id, title, candidates(id, status)')
      .order('created_at', { ascending: false }),
    client
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending-review', 'closed-pending']),
    client
      .from('evaluations')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', startOfMonth)
      .not('sent_at', 'is', null),
  ])

  return {
    roles: rolesRes.data ?? [],
    awaitingReview: awaitingRes.count ?? 0,
    sentThisMonth: sentRes.count ?? 0,
  }
}

export default async function DashboardPage() {
  const { roles, awaitingReview, sentThisMonth } = await getDashboardData()

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-0.5">
            Closure
          </p>
          <h1 className="text-xl font-semibold">Roles</h1>
        </div>
        <Link
          href="/roles/new"
          className="bg-accent text-white text-xs font-medium px-4 py-2 tracking-wide hover:opacity-90 transition-opacity"
        >
          + New role
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 border border-neutral-200 bg-white mb-8">
        <div className="px-6 py-5 border-r border-neutral-200">
          <p className="text-2xl font-semibold font-mono">{roles.length}</p>
          <p className="text-[11px] text-neutral-500 mt-1.5 uppercase tracking-widest">Roles</p>
        </div>
        <div className="px-6 py-5 border-r border-neutral-200">
          <p className="text-2xl font-semibold font-mono">{awaitingReview}</p>
          <p className="text-[11px] text-neutral-500 mt-1.5 uppercase tracking-widest">Awaiting review</p>
        </div>
        <div className="px-6 py-5">
          <p className="text-2xl font-semibold font-mono">{sentThisMonth}</p>
          <p className="text-[11px] text-neutral-500 mt-1.5 uppercase tracking-widest">Sent this month</p>
        </div>
      </div>

      {/* Roles grid */}
      {roles.length === 0 ? (
        <div className="border border-dashed border-neutral-300 py-14 text-center">
          <p className="text-sm text-neutral-500">No roles yet.</p>
          <Link href="/roles/new" className="text-sm text-accent mt-2 inline-block hover:underline">
            Create a role →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-neutral-200">
          {roles.map((role) => {
            const candidates = (role.candidates ?? []) as { id: string; status: string }[]
            const total = candidates.length
            const counts = candidates.reduce<Partial<Record<Status, number>>>((acc, c) => {
              const s = c.status as Status
              acc[s] = (acc[s] ?? 0) + 1
              return acc
            }, {})
            const statuses = Object.keys(STATUS_META) as Status[]

            return (
              <Link
                key={role.id}
                href={`/roles/${role.id}`}
                className="bg-white p-6 hover:bg-neutral-50 transition-colors"
              >
                <p className="font-medium text-sm mb-1">{role.title}</p>
                <p className="text-xs text-neutral-500 mb-4 font-mono">
                  {total} candidate{total !== 1 ? 's' : ''}
                </p>
                {total > 0 ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {statuses.map((s) => {
                      const count = counts[s]
                      if (!count) return null
                      return (
                        <span key={s} className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_META[s].dot}`} />
                          <span className="text-[11px] text-neutral-500">
                            {count} {STATUS_META[s].label}
                          </span>
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400">No candidates yet</span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
