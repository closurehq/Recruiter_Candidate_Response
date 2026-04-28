import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export interface AgentInput {
  jobDescription: string
  cvText: string
  transcriptText: string | null
  recruiterNotes: string | null
}

export interface AgentOutput {
  evaluation: string
  evidence_statement: string
  draft_message: string
}

export async function runEvaluationAgent(
  input: AgentInput
): Promise<AgentOutput> {
  const { jobDescription, cvText, transcriptText, recruiterNotes } = input

  if (!jobDescription || !cvText) {
    throw new Error('Job description and CV are required for evaluation.')
  }

  const prompt = `You are evaluating a job candidate against a role's requirements on behalf of a recruiter.

You have been given:
- Job description (defines the requirements)
- CV (candidate's stated experience)
- Interview transcript (what the candidate actually said)
- Recruiter notes (the recruiter's observations)

Your job is to produce three outputs:

1. EVALUATION: A structured assessment of how the candidate maps to the role requirements. Name specific strengths. Name specific gaps. Be precise. Do not generalise. Reference actual content from the inputs.

2. EVIDENCE STATEMENT: A plain statement of what data was used in the assessment. Format: "We assessed [X]. We found [Y]. The gap was [Z]." One to three sentences. Not a score. A statement of evidence.

3. DRAFT MESSAGE: A rejection message to send to the candidate. Requirements:
   - Direct and respectful
   - References at least one specific strength from the evaluation
   - Names the primary gap plainly
   - No template language. Not "we've decided to move forward with other candidates."
   - Signed off as coming from the recruiter (use "we" not "I")
   - Maximum 150 words

Return valid JSON only. No preamble. No markdown. Schema:
{
  "evaluation": "string",
  "evidence_statement": "string",
  "draft_message": "string"
}

---

JOB DESCRIPTION:
${jobDescription}

CV:
${cvText}

INTERVIEW TRANSCRIPT:
${transcriptText ?? 'Not provided.'}

RECRUITER NOTES:
${recruiterNotes ?? 'Not provided.'}`

  const message = await client.messages.create(
    {
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    },
    { timeout: 45000 }
  )

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from agent')
  }

  const parsed: AgentOutput = JSON.parse(content.text)

  if (!parsed.evaluation || !parsed.evidence_statement || !parsed.draft_message) {
    throw new Error('Agent response missing required fields')
  }

  return parsed
}
