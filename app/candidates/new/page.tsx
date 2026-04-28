'use client'

import { useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/client'

function NewCandidateForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleId = searchParams.get('role') ?? ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [recruiterNotes, setRecruiterNotes] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const cvInputRef = useRef<HTMLInputElement>(null)
  const transcriptInputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cvFile) {
      setError('CV is required')
      return
    }
    setError('')
    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('role_id', roleId)
      formData.append('name', name)
      formData.append('email', email)
      formData.append('cv', cvFile)
      if (transcriptFile) formData.append('transcript', transcriptFile)
      if (recruiterNotes.trim()) formData.append('recruiter_notes', recruiterNotes.trim())

      const res = await apiFetch('/api/candidates', { method: 'POST', body: formData })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create candidate')
      }

      const candidate = await res.json()
      router.push(`/candidates/${candidate.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Link
        href={roleId ? `/roles/${roleId}` : '/'}
        className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 hover:text-foreground transition-colors"
      >
        ← Back
      </Link>

      <div className="mt-6 mb-8">
        <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-0.5">
          Candidate
        </p>
        <h1 className="text-xl font-semibold">Add candidate</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-[11px] font-medium tracking-widests uppercase text-neutral-500 mb-2">
            Full name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
            CV <span className="normal-case font-normal tracking-normal">— required to generate evaluation</span>
          </label>
          <button
            type="button"
            onClick={() => cvInputRef.current?.click()}
            className={`w-full border border-dashed px-4 py-8 text-center transition-colors ${
              cvFile
                ? 'border-neutral-400 bg-white'
                : 'border-neutral-300 bg-white hover:border-neutral-400'
            }`}
          >
            {cvFile ? (
              <div>
                <p className="text-sm font-medium">{cvFile.name}</p>
                <p className="text-xs text-neutral-400 mt-1">Click to replace</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-neutral-500">Click to upload CV</p>
                <p className="text-xs text-neutral-400 mt-1">PDF or .txt · max 10 MB</p>
              </div>
            )}
          </button>
          <input
            ref={cvInputRef}
            type="file"
            accept=".pdf,.txt,text/plain,application/pdf"
            onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
            Interview transcript <span className="normal-case font-normal tracking-normal">— optional</span>
          </label>
          <button
            type="button"
            onClick={() => transcriptInputRef.current?.click()}
            className={`w-full border border-dashed px-4 py-8 text-center transition-colors ${
              transcriptFile
                ? 'border-neutral-400 bg-white'
                : 'border-neutral-300 bg-white hover:border-neutral-400'
            }`}
          >
            {transcriptFile ? (
              <div>
                <p className="text-sm font-medium">{transcriptFile.name}</p>
                <p className="text-xs text-neutral-400 mt-1">Click to replace</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-neutral-500">Click to upload transcript</p>
                <p className="text-xs text-neutral-400 mt-1">PDF or .txt · Teams/Zoom exports accepted · max 10 MB</p>
              </div>
            )}
          </button>
          <input
            ref={transcriptInputRef}
            type="file"
            accept=".pdf,.txt,text/plain,application/pdf"
            onChange={(e) => setTranscriptFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
            Recruiter notes <span className="normal-case font-normal tracking-normal">— optional</span>
          </label>
          <textarea
            value={recruiterNotes}
            onChange={(e) => setRecruiterNotes(e.target.value)}
            rows={5}
            className="w-full border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors resize-y"
            placeholder="Any observations from the interview..."
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="bg-accent text-white text-xs font-medium px-4 py-2 tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Uploading and saving...' : 'Save candidate'}
          </button>
          <Link
            href={roleId ? `/roles/${roleId}` : '/'}
            className="text-xs text-neutral-500 hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

export default function NewCandidatePage() {
  return (
    <Suspense>
      <NewCandidateForm />
    </Suspense>
  )
}
