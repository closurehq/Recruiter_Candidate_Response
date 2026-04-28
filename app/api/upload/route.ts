import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { uploadFile } from '@/lib/upload'

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const allowedTypes = ['application/pdf', 'text/plain']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only PDF and plain text files are accepted' },
      { status: 400 }
    )
  }

  const maxSize = 10 * 1024 * 1024 // 10 MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: 'File size exceeds 10 MB limit' },
      { status: 400 }
    )
  }

  const path = await uploadFile(file, `${Date.now()}-${file.name}`)

  return NextResponse.json({ path }, { status: 201 })
}
