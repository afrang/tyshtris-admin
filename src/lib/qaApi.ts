import { getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5068'

export type QaAnswer = {
  id: string
  ordered: number
  publish: boolean
  answerText: string
}

export type QaQuestion = {
  id: string
  ordered: number
  publish: boolean
  questionText: string
  answers: QaAnswer[]
}

export type QaTree = {
  component: string
  parentId: string
  languagePrefix: string
  questions: QaQuestion[]
}

export type SaveQaTreeInput = {
  questions: Array<{
    id?: string | null
    ordered: number
    publish: boolean
    questionText: string
    answers?: Array<{
      id?: string | null
      ordered: number
      publish: boolean
      answerText: string
    }>
  }>
}

function withLang(path: string, lang: string): string {
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}lang=${encodeURIComponent(lang)}`
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!response.ok) {
    let message = `Request failed (${response.status}).`
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function getQa(component: string, parentId: string, lang: string): Promise<QaTree> {
  return apiFetch(withLang(`/api/admin/qa/${encodeURIComponent(component)}/${parentId}`, lang))
}

export function saveQa(
  component: string,
  parentId: string,
  input: SaveQaTreeInput,
  lang: string,
): Promise<QaTree> {
  return apiFetch(withLang(`/api/admin/qa/${encodeURIComponent(component)}/${parentId}`, lang), {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function cloneQa(
  component: string,
  parentId: string,
  fromLang: string,
  toLang: string,
): Promise<QaTree> {
  const path = `/api/admin/qa/${encodeURIComponent(component)}/${parentId}/clone?from=${encodeURIComponent(fromLang)}&to=${encodeURIComponent(toLang)}`
  return apiFetch(path, { method: 'POST' })
}
