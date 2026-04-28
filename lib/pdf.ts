import { PDFParse } from 'pdf-parse'

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  const text = result.text.trim()
  if (!text) {
    throw new Error(
      'PDF text extraction returned empty content — the file may be scanned, image-only, or encrypted'
    )
  }
  return text
}

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPdf(buffer)
  }
  const text = buffer.toString('utf-8').trim()
  if (!text) {
    throw new Error('File text extraction returned empty content')
  }
  return text
}
