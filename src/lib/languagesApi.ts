import { getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5068'

export type TextDirection = 'ltr' | 'rtl'

export type Language = {
  id: string
  name: string
  prefix: string
  isDefault: boolean
  direction: TextDirection
}

export type UpsertLanguageInput = {
  name: string
  prefix: string
  isDefault: boolean
  direction: TextDirection
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

function mapLanguage(raw: Record<string, unknown>): Language {
  const directionRaw = String(raw.direction ?? raw.Direction ?? 'ltr').toLowerCase()
  return {
    id: String(raw.id ?? raw.Id ?? ''),
    name: String(raw.name ?? raw.Name ?? ''),
    prefix: String(raw.prefix ?? raw.Prefix ?? ''),
    isDefault: Boolean(raw.isDefault ?? raw.IsDefault ?? false),
    direction: directionRaw === 'rtl' ? 'rtl' : 'ltr',
  }
}

export async function listLanguages(): Promise<Language[]> {
  const items = await apiFetch<Array<Record<string, unknown>>>('/api/admin/languages')
  return items.map(mapLanguage)
}

export async function createLanguage(input: UpsertLanguageInput): Promise<Language> {
  const raw = await apiFetch<Record<string, unknown>>('/api/admin/languages', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return mapLanguage(raw)
}

export async function updateLanguage(id: string, input: UpsertLanguageInput): Promise<Language> {
  const raw = await apiFetch<Record<string, unknown>>(`/api/admin/languages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  return mapLanguage(raw)
}

export function deleteLanguage(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/languages/${id}`, {
    method: 'DELETE',
  })
}
