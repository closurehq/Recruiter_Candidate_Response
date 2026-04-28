import { describe, it, expect } from 'vitest'

/**
 * The agent JSON parsing and validation logic from lib/agent.ts,
 * replicated inline per the edge-function testing pattern.
 * Guards against regressions if the parsing logic is changed.
 */

interface AgentOutput {
  evaluation: string
  evidence_statement: string
  draft_message: string
}

function parseAgentResponse(text: string): AgentOutput {
  const parsed = JSON.parse(text) as AgentOutput
  if (!parsed.evaluation || !parsed.evidence_statement || !parsed.draft_message) {
    throw new Error('Agent response missing required fields')
  }
  return parsed
}

describe('agent response parsing', () => {
  it('parses a valid response', () => {
    const raw = JSON.stringify({
      evaluation: 'Strong technical background, lacks leadership experience.',
      evidence_statement: 'We assessed CV and transcript. We found 5 years engineering, zero management. The gap was seniority.',
      draft_message: 'Thank you for your time. Your technical depth was clear, but the role requires prior team leadership which was not evident.',
    })
    const result = parseAgentResponse(raw)
    expect(result.evaluation).toContain('technical')
    expect(result.evidence_statement).toContain('We assessed')
    expect(result.draft_message).toContain('Thank you')
  })

  it('throws when evaluation field is missing', () => {
    const raw = JSON.stringify({
      evidence_statement: 'We assessed.',
      draft_message: 'Thank you.',
    })
    expect(() => parseAgentResponse(raw)).toThrow('Agent response missing required fields')
  })

  it('throws when evidence_statement field is missing', () => {
    const raw = JSON.stringify({
      evaluation: 'Good candidate.',
      draft_message: 'Thank you.',
    })
    expect(() => parseAgentResponse(raw)).toThrow('Agent response missing required fields')
  })

  it('throws when draft_message field is missing', () => {
    const raw = JSON.stringify({
      evaluation: 'Good candidate.',
      evidence_statement: 'We assessed.',
    })
    expect(() => parseAgentResponse(raw)).toThrow('Agent response missing required fields')
  })

  it('throws on invalid JSON', () => {
    expect(() => parseAgentResponse('not json')).toThrow()
  })

  it('throws when fields are empty strings', () => {
    const raw = JSON.stringify({
      evaluation: '',
      evidence_statement: 'We assessed.',
      draft_message: 'Thank you.',
    })
    expect(() => parseAgentResponse(raw)).toThrow('Agent response missing required fields')
  })
})
