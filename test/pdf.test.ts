import { describe, it, expect } from 'vitest'
import { extractText } from '@/lib/pdf'

describe('extractText', () => {
  it('returns utf-8 string for plain text mime type', async () => {
    const input = 'Hello, candidate.\nStrong background in TypeScript.'
    const buffer = Buffer.from(input, 'utf-8')
    const result = await extractText(buffer, 'text/plain')
    expect(result).toBe(input.trim())
  })

  it('trims leading and trailing whitespace from plain text', async () => {
    const buffer = Buffer.from('  \n  some notes  \n  ', 'utf-8')
    const result = await extractText(buffer, 'text/plain')
    expect(result).toBe('some notes')
  })

  it('handles empty plain text buffer', async () => {
    const buffer = Buffer.from('', 'utf-8')
    const result = await extractText(buffer, 'text/plain')
    expect(result).toBe('')
  })

  it('preserves internal newlines in plain text', async () => {
    const input = 'Line one\nLine two\nLine three'
    const buffer = Buffer.from(input, 'utf-8')
    const result = await extractText(buffer, 'text/plain')
    expect(result).toBe(input)
  })
})
