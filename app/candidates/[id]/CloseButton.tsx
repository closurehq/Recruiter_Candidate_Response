'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/client'

export default function CloseButton({
  candidateId,
  hasCvText,
}: {
  candidateId: string
  hasCvText: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!hasCvText) {
    return (
      <p className="text-xs text-neutral-400">
        No CV text available — cannot generate evaluation.
      </p>
    )
  }

  async function handleClose() {
    setError('')
    setLoading(true)

    const res = await apiFetch(`/api/candidates/${candidateId}/close`, {
      method: 'POST',
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div>
      <button
        onClick={handleClose}
        disabled={loading}
        className="bg-foreground text-white text-xs font-medium px-4 py-2 tracking-wide hover:opacity-80 transition-opacity disabled:opacity-50"
      >
        {loading ? 'Generating evaluation...' : 'Generate evaluation'}
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
