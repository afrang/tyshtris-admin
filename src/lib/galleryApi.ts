import { getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5068'

function withLang(path: string, lang?: string): string {
  if (!lang) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}lang=${encodeURIComponent(lang)}`
}

export type GalleryListItem = {
  id: string
  title: string
  slug: string
  keyword: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  languagePrefix?: string | null
}

export type Gallery = {
  id: string
  title: string
  slug: string
  keyword: string | null
  description: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  languagePrefix?: string | null
}

export type UpsertGalleryInput = {
  title: string
  slug: string
  keyword?: string | null
  description?: string | null
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    let message = `Request failed (${response.status}).`
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export function listGalleries(lang?: string): Promise<GalleryListItem[]> {
  return apiFetch<GalleryListItem[]>(withLang('/api/admin/galleries', lang))
}

export function getGallery(id: string, lang?: string): Promise<Gallery> {
  return apiFetch<Gallery>(withLang(`/api/admin/galleries/${id}`, lang))
}

export function createGallery(input: UpsertGalleryInput, lang: string): Promise<Gallery> {
  return apiFetch<Gallery>(withLang('/api/admin/galleries', lang), {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateGallery(id: string, input: UpsertGalleryInput, lang: string): Promise<Gallery> {
  return apiFetch<Gallery>(withLang(`/api/admin/galleries/${id}`, lang), {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteGallery(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/galleries/${id}`, {
    method: 'DELETE',
  })
}
