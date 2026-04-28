// Import from lib directly — pdf-parse v1's main entry runs test code on require()
// which crashes in serverless environments. The lib file is the parser only.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
  buffer: Buffer
) => Promise<{ text: string }>

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer)
  return result.text.trim()
}

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPdf(buffer)
  }
  return buffer.toString('utf-8').trim()
}
