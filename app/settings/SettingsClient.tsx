'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/client'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type EmailProvider = 'gmail-mcp' | 'resend'

const EMAIL_PROVIDERS: { value: EmailProvider; label: string }[] = [
  { value: 'gmail-mcp', label: 'Gmail MCP' },
  { value: 'resend', label: 'Resend' },
]

function SaveStatusText({ status }: { status: SaveStatus }) {
  if (status === 'saving') return <span className="text-xs text-neutral-400">Saving...</span>
  if (status === 'saved') return <span className="text-xs text-emerald-600">Saved</span>
  if (status === 'error') return <span className="text-xs text-red-600">Save failed</span>
  return null
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 hover:text-foreground transition-colors whitespace-nowrap"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

async function saveSetting(key: string, value: string): Promise<void> {
  const res = await apiFetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Save failed')
  }
}

export default function SettingsClient({
  webhookUrl,
  initialEmailProvider,
  resendFromEmail,
  adminSecretLength,
  hasGreenhouseApiKey,
  hasWebhookSecret,
}: {
  webhookUrl: string
  initialEmailProvider: EmailProvider
  resendFromEmail: string
  adminSecretLength: number
  hasGreenhouseApiKey: boolean
  hasWebhookSecret: boolean
}) {
  // Greenhouse section
  const [apiKey, setApiKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [greenhouseStatus, setGreenhouseStatus] = useState<SaveStatus>('idle')

  // Email section
  const [emailProvider, setEmailProvider] = useState<EmailProvider>(initialEmailProvider)
  const [emailStatus, setEmailStatus] = useState<SaveStatus>('idle')

  async function saveGreenhouse() {
    setGreenhouseStatus('saving')
    try {
      if (apiKey.trim()) {
        await saveSetting('greenhouse_api_key', apiKey.trim())
      }
      if (webhookSecret.trim()) {
        await saveSetting('greenhouse_webhook_secret', webhookSecret.trim())
      }
      setApiKey('')
      setWebhookSecret('')
      setGreenhouseStatus('saved')
      setTimeout(() => setGreenhouseStatus('idle'), 3000)
    } catch {
      setGreenhouseStatus('error')
      setTimeout(() => setGreenhouseStatus('idle'), 4000)
    }
  }

  async function saveEmail() {
    setEmailStatus('saving')
    try {
      await saveSetting('email_provider', emailProvider)
      setEmailStatus('saved')
      setTimeout(() => setEmailStatus('idle'), 3000)
    } catch {
      setEmailStatus('error')
      setTimeout(() => setEmailStatus('idle'), 4000)
    }
  }

  return (
    <div className="space-y-10 max-w-2xl">

      {/* ── Greenhouse ── */}
      <section>
        <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-4">
          Greenhouse integration
        </p>

        <div className="border border-neutral-200 bg-white divide-y divide-neutral-200">

          {/* Harvest API key */}
          <div className="px-6 py-5">
            <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Harvest API key
            </label>
            {hasGreenhouseApiKey && (
              <p className="text-xs text-neutral-400 mb-2">
                API key is set. Enter a new value to replace it.
              </p>
            )}
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasGreenhouseApiKey ? '••••••••••••' : 'Enter Harvest API key'}
              autoComplete="off"
              className="w-full border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors font-mono"
            />
          </div>

          {/* Webhook secret */}
          <div className="px-6 py-5">
            <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Webhook secret key
            </label>
            {hasWebhookSecret && (
              <p className="text-xs text-neutral-400 mb-2">
                Secret is set. Enter a new value to replace it.
              </p>
            )}
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={hasWebhookSecret ? '••••••••••••' : 'Enter webhook secret key'}
              autoComplete="off"
              className="w-full border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors font-mono"
            />
          </div>

          {/* Webhook URL */}
          <div className="px-6 py-5">
            <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Webhook endpoint URL
            </p>
            <div className="flex items-center gap-3 border border-neutral-200 bg-neutral-50 px-3 py-2.5">
              <span className="text-sm font-mono text-neutral-600 flex-1 truncate min-w-0">
                {webhookUrl}
              </span>
              <CopyButton value={webhookUrl} />
            </div>
          </div>

          {/* Setup instructions */}
          <div className="px-6 py-5">
            <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Setup instructions
            </p>
            <p className="text-xs text-neutral-500 leading-relaxed">
              In Greenhouse: <span className="font-medium text-foreground">Settings → Dev Center → Web Hooks → Create webhook</span>.
              Set trigger to <span className="font-medium text-foreground">Candidate/Prospect Rejected</span>.
              Paste the webhook URL above as the endpoint.
              Paste your webhook secret into the <span className="font-medium text-foreground">Secret Key</span> field.
            </p>
          </div>

          {/* Save */}
          <div className="px-6 py-5 flex items-center gap-4">
            <button
              onClick={saveGreenhouse}
              disabled={greenhouseStatus === 'saving'}
              className="bg-accent text-white text-xs font-medium px-4 py-2 tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Save
            </button>
            <SaveStatusText status={greenhouseStatus} />
          </div>
        </div>
      </section>

      {/* ── Email delivery ── */}
      <section>
        <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-4">
          Email delivery
        </p>

        <div className="border border-neutral-200 bg-white divide-y divide-neutral-200">

          {/* Provider selection */}
          <div className="px-6 py-5">
            <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-3">
              Provider
            </p>
            <div className="flex border border-neutral-200 w-fit">
              {EMAIL_PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setEmailProvider(p.value)}
                  className={`px-5 py-2 text-xs font-medium tracking-wide transition-colors border-r border-neutral-200 last:border-r-0 ${
                    emailProvider === p.value
                      ? 'bg-foreground text-white'
                      : 'bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Provider details */}
          {emailProvider === 'resend' && (
            <div className="px-6 py-5">
              <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
                Sender address
              </p>
              {resendFromEmail ? (
                <p className="text-sm font-mono text-neutral-600">{resendFromEmail}</p>
              ) : (
                <p className="text-xs text-neutral-400">
                  Set <span className="font-mono">RESEND_FROM_EMAIL</span> environment variable to configure the sender address.
                </p>
              )}
            </div>
          )}

          {emailProvider === 'gmail-mcp' && (
            <div className="px-6 py-5">
              <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
                Connection
              </p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Gmail MCP authentication is managed externally via the MCP connector.
                Ensure the connector is authenticated before sending email through this provider.
                The app will fall back to Resend automatically if authentication fails.
              </p>
            </div>
          )}

          {/* Save */}
          <div className="px-6 py-5 flex items-center gap-4">
            <button
              onClick={saveEmail}
              disabled={emailStatus === 'saving'}
              className="bg-accent text-white text-xs font-medium px-4 py-2 tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Save
            </button>
            <SaveStatusText status={emailStatus} />
          </div>
        </div>
      </section>

      {/* ── Account ── */}
      <section>
        <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-4">
          Account
        </p>

        <div className="border border-neutral-200 bg-white divide-y divide-neutral-200">
          <div className="px-6 py-5">
            <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Admin secret
            </p>
            {adminSecretLength > 0 ? (
              <p className="text-sm">
                <span className="font-mono text-neutral-400 tracking-widest">
                  {'•'.repeat(Math.min(adminSecretLength, 24))}
                </span>
                <span className="text-xs text-neutral-400 ml-3">{adminSecretLength} characters</span>
              </p>
            ) : (
              <p className="text-xs text-red-600">ADMIN_SECRET is not set</p>
            )}
          </div>
          <div className="px-6 py-5">
            <p className="text-xs text-neutral-500 leading-relaxed">
              To change the admin secret, update the{' '}
              <span className="font-mono">ADMIN_SECRET</span> environment variable and redeploy.
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
