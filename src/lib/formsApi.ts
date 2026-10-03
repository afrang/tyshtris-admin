import { getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5068'

function withLang(path: string, lang?: string): string {
  if (!lang) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}lang=${encodeURIComponent(lang)}`
}

export type FormFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'url'

export const FORM_FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select', label: 'Select' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL' },
]

export type FormListItem = {
  id: string
  title: string
  slug: string
  isPublished: boolean
  fieldCount: number
  submissionCount: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
  languagePrefix?: string | null
}

export type FormFieldItem = {
  id: string
  fieldKey: string
  fieldType: FormFieldType
  label: string
  placeholder: string | null
  helpText: string | null
  options: string[]
  isRequired: boolean
  sortOrder: number
}

export type FormDetail = {
  id: string
  title: string
  slug: string
  description: string | null
  submitButtonText: string
  successMessage: string | null
  isPublished: boolean
  createdBy: string | null
  createdAt: string
  updatedAt: string
  languagePrefix?: string | null
  fields: FormFieldItem[]
}

export type UpsertFormInput = {
  title: string
  slug: string
  description?: string | null
  submitButtonText?: string | null
  successMessage?: string | null
  isPublished: boolean
}

export type UpsertFormFieldInput = {
  id?: string | null
  fieldKey: string
  fieldType: FormFieldType
  label: string
  placeholder?: string | null
  helpText?: string | null
  options?: string[]
  isRequired: boolean
  sortOrder: number
}

export type FormSubmission = {
  id: string
  formId: string
  payloadJson: string
  languagePrefix: string | null
  ipAddress: string | null
  createdAt: string
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

export function listForms(lang?: string): Promise<FormListItem[]> {
  return apiFetch<FormListItem[]>(withLang('/api/admin/forms', lang))
}

export function getForm(id: string, lang?: string): Promise<FormDetail> {
  return apiFetch<FormDetail>(withLang(`/api/admin/forms/${id}`, lang))
}

export function createForm(input: UpsertFormInput, lang: string): Promise<FormDetail> {
  return apiFetch<FormDetail>(withLang('/api/admin/forms', lang), {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateForm(id: string, input: UpsertFormInput, lang: string): Promise<FormDetail> {
  return apiFetch<FormDetail>(withLang(`/api/admin/forms/${id}`, lang), {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteForm(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/forms/${id}`, {
    method: 'DELETE',
  })
}

export function syncFormFields(
  id: string,
  fields: UpsertFormFieldInput[],
  lang: string,
): Promise<FormDetail> {
  return apiFetch<FormDetail>(withLang(`/api/admin/forms/${id}/fields`, lang), {
    method: 'PUT',
    body: JSON.stringify({ fields }),
  })
}

export function listFormSubmissions(id: string): Promise<FormSubmission[]> {
  return apiFetch<FormSubmission[]>(`/api/admin/forms/${id}/submissions`)
}

export function deleteFormSubmission(formId: string, submissionId: string): Promise<void> {
  return apiFetch<void>(`/api/admin/forms/${formId}/submissions/${submissionId}`, {
    method: 'DELETE',
  })
}
