import { NextRequest, NextResponse } from 'next/server'
import { runEvaluationAgent } from '@/lib/agent'
import { extractText } from '@/lib/pdf'

// In-memory rate limiter — 5 requests per IP per hour.
// Note: resets on cold start and is per-instance on multi-region deploys.
// Sufficient for a demo endpoint.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS = 5
const WINDOW_MS = 60 * 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }

  if (entry.count >= MAX_REQUESTS) return false
  entry.count++
  return true
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in an hour.' },
      { status: 429 }
    )
  }

  const formData = await req.formData()
  const jobDescription = (formData.get('job_description') as string | null)?.trim() ?? ''
  const cvFile = formData.get('cv') as File | null
  const transcriptFile = formData.get('transcript') as File | null
  const interviewNotes = (formData.get('interview_notes') as string | null)?.trim() || null

  if (!jobDescription) {
    return NextResponse.json({ error: 'job_description is required' }, { status: 400 })
  }

  if (!cvFile) {
    return NextResponse.json({ error: 'cv file is required' }, { status: 400 })
  }

  const ALLOWED_TYPES = ['application/pdf', 'text/plain']
  const MAX_SIZE = 10 * 1024 * 1024

  if (!ALLOWED_TYPES.includes(cvFile.type)) {
    return NextResponse.json(
      { error: 'CV must be a PDF or plain text file' },
      { status: 400 }
    )
  }

  if (cvFile.size > MAX_SIZE) {
    return NextResponse.json({ error: 'CV file size exceeds 10 MB' }, { status: 400 })
  }

  const cvBuffer = Buffer.from(await cvFile.arrayBuffer())
  const cvText = await extractText(cvBuffer, cvFile.type)

  if (!cvText) {
    return NextResponse.json(
      { error: 'Could not extract text from CV. Please try a different file.' },
      { status: 400 }
    )
  }

  let transcriptText: string | null = null
  if (transcriptFile) {
    if (!ALLOWED_TYPES.includes(transcriptFile.type)) {
      return NextResponse.json(
        { error: 'Transcript must be a PDF or plain text file' },
        { status: 400 }
      )
    }
    if (transcriptFile.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Transcript file size exceeds 10 MB' }, { status: 400 })
    }
    const transcriptBuffer = Buffer.from(await transcriptFile.arrayBuffer())
    transcriptText = await extractText(transcriptBuffer, transcriptFile.type) || null
  }

  const result = await runEvaluationAgent({
    jobDescription,
    cvText,
    transcriptText,
    recruiterNotes: interviewNotes,
  })

  // No database writes — demo evaluations are ephemeral
  return NextResponse.json({
    evaluation: result.evaluation,
    evidence_statement: result.evidence_statement,
    draft_message: result.draft_message,
  })
}
