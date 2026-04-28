import { headers } from 'next/headers'
import Link from 'next/link'
import { getServiceClient } from '@/lib/supabase'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

type EmailProvider = 'gmail-mcp' | 'resend'

async function getSettings() {
  const client = getServiceClient()
  const { data } = await client.from('settings').select('key, value')
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))
  return {
    hasGreenhouseApiKey: Boolean(map['greenhouse_api_key']),
    hasWebhookSecret: Boolean(map['greenhouse_webhook_secret']),
    emailProvider: (map['email_provider'] ?? 'resend') as EmailProvider,
  }
}

export default async function SettingsPage() {
  const [settings, headersList] = await Promise.all([
    getSettings(),
    headers(),
  ])

  const host =
    headersList.get('x-forwarded-host') ??
    headersList.get('host') ??
    'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') ?? 'http'
  const webhookUrl = `${proto}://${host}/api/webhooks/greenhouse`

  const resendFromEmail = process.env.RESEND_FROM_EMAIL ?? ''
  const adminSecretLength = process.env.ADMIN_SECRET?.length ?? 0

  return (
    <div>
      <Link
        href="/"
        className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 hover:text-foreground transition-colors"
      >
        ← Roles
      </Link>

      <div className="mt-6 mb-8">
        <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-0.5">
          Closure
        </p>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      <SettingsClient
        webhookUrl={webhookUrl}
        initialEmailProvider={settings.emailProvider}
        resendFromEmail={resendFromEmail}
        adminSecretLength={adminSecretLength}
        hasGreenhouseApiKey={settings.hasGreenhouseApiKey}
        hasWebhookSecret={settings.hasWebhookSecret}
      />
    </div>
  )
}
