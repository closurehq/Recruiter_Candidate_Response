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

  async function uploadFile(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiFetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Upload failed')
    }
    const data = await res.json()
    return data.path
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      let cvPath: string | null = null
      let transcriptPath: string | null = null

      if (cvFile) cvPath = await uploadFile(cvFile)
      if (transcriptFile) transcriptPath = await uploadFile(transcriptFile)

      const res = await apiFetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_id: roleId,
          name,
          email,
          cv_path: cvPath,
          transcript_path: transcriptPath,
          recruiter_notes: recruiterNotes || null,
        }),
      })

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
      <Link href={roleId ? `/roles/${roleId}` : '/'} className="text-sm text-gray-500 hover:text-gray-900">
        ← Back
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-6">Add candidate</h1>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            CV <span className="text-gray-400 font-normal">— required to generate evaluation</span>
          </label>
          <button
            type="button"
            onClick={() => cvInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-lg px-4 py-6 text-center transition-colors ${
              cvFile
                ? 'border-gray-400 bg-gray-50'
                : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            {cvFile ? (
              <div>
                <p className="text-sm font-medium text-gray-900">{cvFile.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Click to replace</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500">Click to upload CV</p>
                <p className="text-xs text-gray-400 mt-1">PDF or .txt · max 10 MB</p>
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
          <label className="block text-sm font-medium mb-1">
            Interview transcript <span className="text-gray-400 font-normal">— optional</span>
          </label>
          <button
            type="button"
            onClick={() => transcriptInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-lg px-4 py-6 text-center transition-colors ${
              transcriptFile
                ? 'border-gray-400 bg-gray-50'
                : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            {transcriptFile ? (
              <div>
                <p className="text-sm font-medium text-gray-900">{transcriptFile.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Click to replace</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500">Click to upload interview transcript</p>
                <p className="text-xs text-gray-400 mt-1">PDF or .txt · Teams/Zoom exports accepted · max 10 MB</p>
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
          <label className="block text-sm font-medium mb-1">Recruiter notes <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea
            value={recruiterNotes}
            onChange={(e) => setRecruiterNotes(e.target.value)}
            rows={5}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-600"
            placeholder="Any observations from the interview..."
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-gray-900 text-white text-sm px-5 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save candidate'}
        </button>
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
