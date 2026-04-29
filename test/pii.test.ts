import { describe, it, expect } from 'vitest'
import { stripPII } from '../lib/pii'

describe('stripPII', () => {
  describe('UK phone numbers', () => {
    it('redacts 07xxx xxxxxx with space', () => {
      expect(stripPII('Call me on 07911 123456')).toBe('Call me on [PHONE REDACTED]')
    })

    it('redacts 07xxxxxxxxxx with no spaces', () => {
      expect(stripPII('Mobile: 07911123456')).toBe('Mobile: [PHONE REDACTED]')
    })

    it('redacts +44 7xxx xxxxxx', () => {
      expect(stripPII('+44 7911 123456')).toBe('[PHONE REDACTED]')
    })

    it('redacts +44 without space before 7', () => {
      expect(stripPII('+447911123456')).toBe('[PHONE REDACTED]')
    })

    it('redacts phone in a sentence', () => {
      const text = 'Please contact Sarah on 07700 900123 for the interview.'
      expect(stripPII(text)).toBe('Please contact Sarah on [PHONE REDACTED] for the interview.')
    })
  })

  describe('email addresses', () => {
    it('redacts a standalone email', () => {
      expect(stripPII('john.doe@example.com')).toBe('[EMAIL REDACTED]')
    })

    it('redacts an email in a sentence', () => {
      expect(stripPII('Contact me at jane@acme.org for details')).toBe(
        'Contact me at [EMAIL REDACTED] for details'
      )
    })

    it('redacts an email with plus addressing', () => {
      expect(stripPII('Sent from j.smith+cv@company.co.uk')).toBe(
        'Sent from [EMAIL REDACTED]'
      )
    })
  })

  describe('UK postcodes', () => {
    it('redacts SW1A 1AA format', () => {
      expect(stripPII('Address: London SW1A 1AA')).toBe('Address: London [POSTCODE REDACTED]')
    })

    it('redacts EC2A 4NE format', () => {
      expect(stripPII('Office: EC2A 4NE')).toBe('Office: [POSTCODE REDACTED]')
    })

    it('redacts single-letter area code postcode W1A 0AX', () => {
      expect(stripPII('W1A 0AX')).toBe('[POSTCODE REDACTED]')
    })

    it('redacts postcode without space M11AA', () => {
      expect(stripPII('Postcode: M11AA')).toBe('Postcode: [POSTCODE REDACTED]')
    })
  })

  describe('National Insurance numbers', () => {
    it('redacts AB123456C format', () => {
      expect(stripPII('NI Number: AB123456C')).toBe('NI Number: [NI REDACTED]')
    })

    it('redacts NI number in running text', () => {
      expect(stripPII('National Insurance: QQ123456A provided for tax purposes')).toBe(
        'National Insurance: [NI REDACTED] provided for tax purposes'
      )
    })
  })

  describe('dates of birth', () => {
    it('redacts DOB: dd/mm/yyyy', () => {
      expect(stripPII('DOB: 14/03/1990')).toBe('[DOB REDACTED]')
    })

    it('redacts Date of Birth: dd-mm-yyyy', () => {
      expect(stripPII('Date of Birth: 01-07-1985')).toBe('[DOB REDACTED]')
    })

    it('redacts case-insensitive date of birth label', () => {
      expect(stripPII('date of birth: 22.11.1978')).toBe('[DOB REDACTED]')
    })

    it('does not redact a bare date with no DOB label', () => {
      const text = 'Graduated in June 2015'
      expect(stripPII(text)).toBe(text)
    })
  })

  describe('preserves non-PII content', () => {
    it('does not strip company names', () => {
      const text = 'Worked at Google and Microsoft'
      expect(stripPII(text)).toBe(text)
    })

    it('does not strip job titles', () => {
      const text = 'Senior Software Engineer at Acme Ltd'
      expect(stripPII(text)).toBe(text)
    })

    it('does not strip employment dates', () => {
      const text = 'January 2019 – March 2022'
      expect(stripPII(text)).toBe(text)
    })

    it('does not strip performance metrics', () => {
      const text = 'Grew revenue by 40% in Q3 2021'
      expect(stripPII(text)).toBe(text)
    })

    it('does not strip financial figures', () => {
      const text = 'Managed a budget of £2.4m across 12 product lines'
      expect(stripPII(text)).toBe(text)
    })
  })

  describe('multiple redactions in one string', () => {
    it('strips all PII types from a CV block', () => {
      const cv = [
        'John Smith',
        'Email: john.smith@gmail.com',
        'Phone: 07700 900456',
        'Address: 12 High Street, London, SW1A 2AA',
        'NI: AB123456C',
        'DOB: 15/06/1988',
        'Senior Engineer at Acme Ltd, January 2018 – Present',
      ].join('\n')

      const result = stripPII(cv)
      expect(result).toContain('[EMAIL REDACTED]')
      expect(result).toContain('[PHONE REDACTED]')
      expect(result).toContain('[POSTCODE REDACTED]')
      expect(result).toContain('[NI REDACTED]')
      expect(result).toContain('[DOB REDACTED]')
      // Preserved
      expect(result).toContain('John Smith')
      expect(result).toContain('Senior Engineer at Acme Ltd')
      expect(result).toContain('January 2018')
    })
  })
})
