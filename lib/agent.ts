import Anthropic from '@anthropic-ai/sdk'
import { BANNED_PHRASES, BANNED_CONSTRUCTIONS } from './banned-phrases'
import { stripPII } from './pii'

const client = new Anthropic()

export interface AgentInput {
  jobDescription: string
  cvText: string
  transcriptText?: string | null
  recruiterNotes?: string | null
}

export interface AgentOutput {
  evaluation: string
  evidence_statement: string
  draft_message: string
}

const SYSTEM_PROMPT = `You are evaluating a job candidate against a role's requirements on behalf of a recruiter.

You have been given:
- Job description (defines the requirements)
- CV (candidate's stated experience)
- Interview transcript (what the candidate actually said, if available)
- Recruiter notes (the recruiter's observations, if available)

Produce three outputs:

1. EVALUATION: Structured assessment of how the candidate maps to requirements. Name specific strengths with evidence. Name specific gaps with evidence. Be precise. Reference actual content from the inputs.

2. EVIDENCE STATEMENT: Plain statement of what data was used. Format: "We assessed [X]. We found [Y]. The gap was [Z]." One to three sentences. Not a score. If the interview transcript was not provided, state that explicitly in this field.

3. DRAFT MESSAGE: Rejection message to send to the candidate. Requirements:
- Direct and respectful
- References at least one specific strength
- Names the primary gap plainly
- Maximum 150 words
- Signs off as "we" not "I"

The opening and closing lines of the draft message are where template language is most likely to appear. You must be especially vigilant here. Do not open with a decision statement. Do not close with a generic sign-off. The closing line should reference something specific to this candidate or this role — not a generic expression of thanks or good wishes.

The following phrase is the single most common template rejection phrase in existence. Never use it or any variation of it under any circumstances: "We have decided not to progress your application"

BANNED PHRASES — never use any of these or close variations:
${BANNED_PHRASES.map(p => `- "${p}"`).join('\n')}

BANNED CONSTRUCTIONS — never use any of these:
${BANNED_CONSTRUCTIONS.map(c => `- ${c}`).join('\n')}

Return valid JSON only. No preamble. No markdown fences. Schema:
{"evaluation":"string","evidence_statement":"string","draft_message":"string"}`

export async function runEvaluationAgent(input: AgentInput): Promise<AgentOutput> {
  const { jobDescription, cvText, transcriptText, recruiterNotes } = input

  if (!jobDescription?.trim()) {
    throw new Error('Job description is required for evaluation')
  }
  if (!cvText?.trim()) {
    throw new Error('CV text is required for evaluation')
  }

  // PII stripped before sending to Anthropic API — see lib/pii.ts for redaction rules
  const safeCvText = stripPII(cvText)
  const safeTranscriptText = transcriptText ? stripPII(transcriptText) : null

  const userMessage = `JOB DESCRIPTION:
${jobDescription}

CV:
${safeCvText}

INTERVIEW TRANSCRIPT:
${safeTranscriptText?.trim() || 'Not provided.'}

RECRUITER NOTES:
${recruiterNotes?.trim() || 'Not provided.'}`

  const message = await client.messages.create(
    {
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    },
    { timeout: 45000 }
  )

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from agent')
  }

  const rawText = content.text.trim()

  // Extract the JSON object regardless of surrounding text or code fences
  const start = rawText.indexOf('{')
  const end = rawText.lastIndexOf('}')
  const jsonText = start !== -1 && end !== -1 ? rawText.slice(start, end + 1) : rawText

  let parsed: AgentOutput
  try {
    parsed = JSON.parse(jsonText) as AgentOutput
  } catch {
    throw new Error(
      `Agent returned invalid JSON. Raw response: ${rawText.slice(0, 200)}`
    )
  }

  if (!parsed.evaluation?.trim()) {
    throw new Error('Agent response missing evaluation field')
  }
  if (!parsed.evidence_statement?.trim()) {
    throw new Error('Agent response missing evidence_statement field')
  }
  if (!parsed.draft_message?.trim()) {
    throw new Error('Agent response missing draft_message field')
  }

  return parsed
}
