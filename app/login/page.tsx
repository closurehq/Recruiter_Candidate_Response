'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!secret.trim()) {
      setError('Enter the admin secret')
      return
    }

    setError('')
    setSubmitting(true)

    // POST with empty body — 401 = wrong secret, 400 = secret accepted (validation failed as expected)
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': secret.trim(),
      },
      body: JSON.stringify({}),
    })

    if (res.status === 401) {
      setError('Incorrect secret')
      setSubmitting(false)
      return
    }

    localStorage.setItem('admin_secret', secret.trim())
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">Closure</h1>
        <p className="text-sm text-gray-500 mb-6">Enter the admin secret to continue.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin secret"
            autoFocus
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-600"
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gray-900 text-white text-sm px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {submitting ? 'Checking...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
