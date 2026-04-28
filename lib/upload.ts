import { getServiceClient } from './supabase'

const BUCKET = 'candidate-files'

export async function uploadFile(file: File, destinationPath: string): Promise<string> {
  const client = getServiceClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await client.storage
    .from(BUCKET)
    .upload(destinationPath, buffer, { contentType: file.type })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  return destinationPath
}

export async function deleteFile(path: string): Promise<void> {
  const client = getServiceClient()
  await client.storage.from(BUCKET).remove([path])
}

export async function downloadFile(path: string): Promise<Buffer> {
  const client = getServiceClient()
  const { data, error } = await client.storage.from(BUCKET).download(path)
  if (error) throw new Error(`Download failed: ${error.message}`)
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
