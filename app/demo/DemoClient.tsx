'use client'

import { useState, useRef } from 'react'

type Result = {
  evaluation: string
  evidence_statement: string
  draft_message: string
}

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; result: Result }
  | { phase: 'error'; message: string }

export default function DemoClient() {
  const [jobDescription, setJobDescription] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
  const [interviewNotes, setInterviewNotes] = useState('')
  const [state, setState] = useState<State>({ phase: 'idle' })
  const cvInputRef = useRef<HTMLInputElement>(null)
  const transcriptInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  async function handleGenerate() {
    if (!jobDescription.trim()) return
    if (!cvFile) return

    setState({ phase: 'loading' })

    try {
      const formData = new FormData()
      formData.append('job_description', jobDescription.trim())
      formData.append('cv', cvFile)
      if (transcriptFile) {
        formData.append('transcript', transcriptFile)
      }
      if (interviewNotes.trim()) {
        formData.append('interview_notes', interviewNotes.trim())
      }

      const res = await fetch('/api/demo/evaluate', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setState({ phase: 'error', message: data.error ?? 'Something went wrong. Please try again.' })
        return
      }

      setState({ phase: 'done', result: data })
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch {
      setState({ phase: 'error', message: 'Network error. Please try again.' })
    }
  }

  const canGenerate = jobDescription.trim().length > 0 && cvFile !== null && state.phase !== 'loading'

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Framing */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold leading-snug mb-3">
            What your rejection email should have looked like.
          </h1>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Paste the job description you applied for, upload your CV, and optionally add what
            happened in the interview. See the specific, evidenced response you deserved — the one
            that most recruiters don't send.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">

          {/* Job description */}
          <div>
            <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Job description
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={10}
              className="w-full border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors resize-y"
              placeholder="Paste the full job description here..."
            />
          </div>

          {/* CV upload */}
          <div>
            <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Your CV
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
                  <p className="text-sm text-neutral-500">Click to upload your CV</p>
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

          {/* Transcript upload */}
          <div>
            <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Interview transcript <span className="normal-case font-normal tracking-normal">— optional</span>
            </label>
            {transcriptFile ? (
              <div className="w-full border border-dashed border-neutral-400 bg-white px-4 py-8 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{transcriptFile.name}</p>
                  <p className="text-xs text-neutral-400 mt-1">PDF or .txt</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTranscriptFile(null)}
                  className="text-xs text-neutral-400 hover:text-foreground transition-colors ml-4"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => transcriptInputRef.current?.click()}
                className="w-full border border-dashed border-neutral-300 bg-white px-4 py-8 text-center hover:border-neutral-400 transition-colors"
              >
                <p className="text-sm text-neutral-500">Click to upload interview transcript</p>
                <p className="text-xs text-neutral-400 mt-1">PDF or .txt · max 10 MB</p>
              </button>
            )}
            <input
              ref={transcriptInputRef}
              type="file"
              accept=".pdf,.txt,text/plain,application/pdf"
              onChange={(e) => setTranscriptFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </div>

          {/* Interview notes */}
          <div>
            <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Interview notes <span className="normal-case font-normal tracking-normal">— optional</span>
            </label>
            <textarea
              value={interviewNotes}
              onChange={(e) => setInterviewNotes(e.target.value)}
              rows={5}
              className="w-full border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors resize-y"
              placeholder="What did you discuss? What questions did you answer? Any observations about how it went."
            />
          </div>

          {/* Error */}
          {state.phase === 'error' && (
            <p className="text-xs text-red-600">{state.message}</p>
          )}

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="bg-accent text-white text-xs font-medium px-5 py-2.5 tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {state.phase === 'loading' ? 'Generating...' : 'Generate response'}
          </button>

          {state.phase === 'loading' && (
            <p className="text-xs text-neutral-400">
              Reading your documents and building a specific response — this takes about 15 seconds.
            </p>
          )}
        </div>

        {/* Results */}
        {state.phase === 'done' && (
          <div ref={resultsRef} className="mt-14 pt-10 border-t border-neutral-200">
            <div className="mb-6">
              <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-1">
                Results
              </p>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Based on your CV and the role requirements, here is the response a recruiter
                with this data could have sent.
              </p>
            </div>

            <div className="space-y-6">
              {/* Evaluation */}
              <div className="border border-neutral-200 bg-white">
                <div className="px-6 py-4 border-b border-neutral-200">
                  <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500">
                    How you mapped to the role
                  </p>
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {state.result.evaluation}
                  </p>
                </div>
              </div>

              {/* Evidence */}
              <div className="border border-neutral-200 bg-white">
                <div className="px-6 py-4 border-b border-neutral-200">
                  <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500">
                    What a recruiter with this data would conclude
                  </p>
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {state.result.evidence_statement}
                  </p>
                </div>
              </div>

              {/* Draft email */}
              <div className="border border-accent/20 bg-white">
                <div className="px-6 py-4 border-b border-accent/20 bg-accent/[0.03]">
                  <p className="text-[11px] font-medium tracking-widest uppercase text-accent">
                    The email you should have received
                  </p>
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {state.result.draft_message}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-8 text-xs text-neutral-400 leading-relaxed">
              This is generated from the documents you provided. No data has been stored.
              If you are a recruiter and want to send emails like this to your candidates,{' '}
              <a
                href="https://github.com/closurehq/Recruiter_Candidate_Response"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Closure is open source
              </a>.
            </p>
          </div>
        )}
      </div>
  )
}
