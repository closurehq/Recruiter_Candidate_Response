'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/client'

export default function ReviewForm({
  candidateId,
  evaluationId,
  draftMessage,
  emailProvider,
}: {
  candidateId: string
  evaluationId: string
  draftMessage: string
  emailProvider: 'resend' | 'gmail-mcp'
}) {
  const router = useRouter()
  const [message, setMessage] = useState(draftMessage)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const wordCount = message.trim().split(/\s+/).filter(Boolean).length

  function handleSendClick() {
    if (!message.trim()) {
      setError('Message cannot be empty')
      return
    }
    setError('')
    setShowConfirm(true)
  }

  async function confirmSend() {
    setShowConfirm(false)
    setSending(true)

    const res = await apiFetch(`/api/candidates/${candidateId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evaluation_id: evaluationId,
        final_message: message,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Send failed')
      setSending(false)
      return
    }

    router.push(`/candidates/${candidateId}`)
    router.refresh()
  }

  return (
    <>
      <div className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={14}
          className="w-full border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors font-sans leading-relaxed resize-y"
        />

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-neutral-400 font-mono">{wordCount} words</p>
          <p className="text-[11px] text-neutral-400 uppercase tracking-widest">
            via {emailProvider === 'gmail-mcp' ? 'Gmail' : 'Resend'}
          </p>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          onClick={handleSendClick}
          disabled={sending}
          className="bg-accent text-white text-xs font-medium px-4 py-2 tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Approve and send'}
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border border-neutral-200 p-6 max-w-sm w-full mx-4">
            <p className="text-sm font-medium mb-1">Send this email?</p>
            <p className="text-xs text-neutral-500 mb-6">
              This will send the email to the candidate. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={confirmSend}
                className="bg-accent text-white text-xs font-medium px-4 py-2 tracking-wide hover:opacity-90 transition-opacity"
              >
                Send
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-xs text-neutral-500 px-4 py-2 hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
