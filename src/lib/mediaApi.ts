import { getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5068'

export type MediaFile = {
  id: string
  component: string
  parentId: string | null
  ordered: number
  publish: boolean
  folder: string | null
  filename: string
  extension: string
  fullAddress: string
  namefile: string | null
  createdAt: string
  updatedAt: string | null
}

export type UpdateOrderItem = {
  id: string
  ordered: number
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    if (body.error) return body.error
  } catch {
    // ignore
  }
  return `Request failed (${response.status}).`
}

function authHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

export function mediaUrl(fullAddress: string): string {
  if (fullAddress.startsWith('http://') || fullAddress.startsWith('https://')) {
    return fullAddress
  }
  return `${API_URL}${fullAddress.startsWith('/') ? '' : '/'}${fullAddress}`
}

export async function getMediaFiles(component: string, parentId: string): Promise<MediaFile[]> {
  const response = await fetch(
    `${API_URL}/api/admin/file-manager/${encodeURIComponent(component)}/${parentId}`,
    { headers: authHeaders() },
  )
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as MediaFile[]
}

export async function uploadMediaFile(input: {
  component: string
  parentId: string
  file: File
  ordered?: number
}): Promise<MediaFile> {
  const form = new FormData()
  form.append('component', input.component)
  form.append('parent_id', input.parentId)
  form.append('file', input.file)
  if (typeof input.ordered === 'number') {
    form.append('ordered', String(input.ordered))
  }

  const response = await fetch(`${API_URL}/api/admin/file-manager/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as MediaFile
}

export type ChunkUploadSession = {
  uploadId: string
  chunkSize: number
  fileSize: number
  totalChunks: number
}

export async function initChunkUpload(input: {
  component: string
  parentId: string
  fileName: string
  fileSize: number
  ordered?: number
}): Promise<ChunkUploadSession> {
  const response = await fetch(`${API_URL}/api/admin/file-manager/uploads/init`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      component: input.component,
      parentId: input.parentId,
      fileName: input.fileName,
      fileSize: input.fileSize,
      ordered: input.ordered ?? null,
    }),
  })
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as ChunkUploadSession
}

export async function uploadMediaChunk(
  uploadId: string,
  chunkIndex: number,
  chunk: Blob,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/admin/file-manager/uploads/${uploadId}/chunks/${chunkIndex}`,
    {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/octet-stream' }),
      body: chunk,
    },
  )
  if (!response.ok) throw new Error(await parseError(response))
}

export async function completeChunkUpload(uploadId: string): Promise<MediaFile> {
  const response = await fetch(`${API_URL}/api/admin/file-manager/uploads/complete`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ uploadId }),
  })
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json()) as MediaFile
}

export async function uploadMediaFileChunked(input: {
  component: string
  parentId: string
  file: File
  ordered?: number
  onProgress?: (percent: number) => void
}): Promise<MediaFile> {
  const session = await initChunkUpload({
    component: input.component,
    parentId: input.parentId,
    fileName: input.file.name,
    fileSize: input.file.size,
    ordered: input.ordered,
  })

  for (let index = 0; index < session.totalChunks; index += 1) {
    const start = index * session.chunkSize
    const end = Math.min(input.file.size, start + session.chunkSize)
    const chunk = input.file.slice(start, end)
    await uploadMediaChunk(session.uploadId, index, chunk)
    input.onProgress?.(Math.round(((index + 1) / session.totalChunks) * 100))
  }

  return completeChunkUpload(session.uploadId)
}

export async function deleteMediaFile(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/file-manager/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error(await parseError(response))
}

export async function updateMediaOrder(items: UpdateOrderItem[]): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/file-manager/order`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(items),
  })
  if (!response.ok) throw new Error(await parseError(response))
}
