'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    <div className="flex justify-center pt-[20vh]">
      <div className="w-full max-w-[400px]">
        <div className="mb-8">
          <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-1">
            Closure
          </p>
          <h1 className="text-xl font-semibold mb-4">
            Candidate response, done properly.
          </h1>
          <p className="text-sm text-neutral-500 leading-relaxed mb-3">
            Closure helps recruiters send specific, evidenced responses to every candidate they
            interview. No templates. No ghosting.
          </p>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Not a recruiter?{' '}
            <Link href="/demo" className="text-accent hover:underline">
              Try the demo
            </Link>{' '}
            to see what a good rejection email looks like.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin secret"
            autoFocus
            className="w-full border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors"
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-white text-xs font-medium px-4 py-2.5 tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Checking...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
