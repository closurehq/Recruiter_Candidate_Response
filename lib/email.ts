import { Resend } from 'resend'
import { getServiceClient } from './supabase'

export interface EmailInput {
  to: string
  subject: string
  body: string
  senderName: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
}

async function getEmailProvider(): Promise<string> {
  try {
    const client = getServiceClient()
    const { data } = await client
      .from('settings')
      .select('value')
      .eq('key', 'email_provider')
      .maybeSingle()
    return data?.value ?? 'resend'
  } catch {
    return 'resend'
  }
}

async function sendViaResend(input: EmailInput): Promise<EmailResult> {
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!fromEmail) throw new Error('RESEND_FROM_EMAIL is not configured')

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: `${input.senderName} <${fromEmail}>`,
    to: input.to,
    subject: input.subject,
    text: input.body,
  })

  if (error) throw new Error(`Resend: ${error.message}`)
  return { success: true, messageId: data?.id ?? undefined }
}

async function sendViaGmailMcp(input: EmailInput): Promise<EmailResult> {
  const client = getServiceClient()
  const { data: tokenRow } = await client
    .from('settings')
    .select('value')
    .eq('key', 'gmail_oauth_token')
    .maybeSingle()

  const token = tokenRow?.value
  if (!token) throw new Error('Gmail MCP: gmail_oauth_token not found in settings')

  const response = await fetch('https://gmailmcp.googleapis.com/mcp/v1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: crypto.randomUUID(),
      params: {
        name: 'send_email',
        arguments: {
          to: input.to,
          subject: input.subject,
          body: input.body,
        },
      },
    }),
  })

  if (response.status === 401 || response.status === 403) {
    throw new Error(`Gmail MCP: not authenticated (${response.status})`)
  }
  if (!response.ok) {
    throw new Error(`Gmail MCP: unexpected status ${response.status}`)
  }

  const json = (await response.json()) as {
    result?: { content?: Array<{ text?: string }> }
    error?: { message?: string }
  }

  if (json.error) {
    throw new Error(`Gmail MCP: ${json.error.message ?? 'unknown error'}`)
  }

  const messageId = json.result?.content?.[0]?.text ?? undefined
  return { success: true, messageId }
}

export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const provider = await getEmailProvider()

  if (provider === 'gmail-mcp') {
    try {
      return await sendViaGmailMcp(input)
    } catch (err) {
      console.warn(
        '[email] Gmail MCP failed, falling back to Resend:',
        err instanceof Error ? err.message : String(err)
      )
      return sendViaResend(input)
    }
  }

  return sendViaResend(input)
}
