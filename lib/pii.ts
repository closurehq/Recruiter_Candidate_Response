/**
 * PII redaction for CV and transcript text before sending to external APIs.
 * Original stored text is never modified — stripping happens only at the point of the API call.
 *
 * Patterns covered:
 * - UK and +1 international phone numbers
 * - Email addresses
 * - UK postcodes
 * - UK National Insurance numbers
 * - Dates of birth (only when explicitly labelled as DOB / Date of Birth)
 *
 * NOT stripped: names, job titles, company names, employment dates, performance metrics.
 */

const PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Email — before phone to avoid partial overlap on address-containing strings
  {
    pattern: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
    replacement: '[EMAIL REDACTED]',
  },
  // UK mobile: 07xxx xxxxxx, 07xxxxxxxxxx, +44 7xxx xxxxxx
  {
    pattern: /(\+44[\s\-]?7\d{3}|\b07\d{3})[\s\-]?\d{3}[\s\-]?\d{3,4}\b/g,
    replacement: '[PHONE REDACTED]',
  },
  // International: +1 xxx xxx xxxx and common variants
  {
    pattern: /\+1[\s\-.]?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}\b/g,
    replacement: '[PHONE REDACTED]',
  },
  // UK postcode: SW1A 1AA, EC2A 4NE, W1A 0AX, etc.
  {
    pattern: /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/g,
    replacement: '[POSTCODE REDACTED]',
  },
  // UK National Insurance: AB123456C
  {
    pattern: /\b[A-Z]{2}\d{6}[A-Z]\b/g,
    replacement: '[NI REDACTED]',
  },
  // Date of birth — only when explicitly labelled
  {
    pattern: /\b(DOB|Date of Birth|date of birth|dob)\s*[:\-]?\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/gi,
    replacement: '[DOB REDACTED]',
  },
]

export function stripPII(text: string): string {
  let result = text
  for (const { pattern, replacement } of PATTERNS) {
    result = result.replace(pattern, replacement)
  }
  return result
}
