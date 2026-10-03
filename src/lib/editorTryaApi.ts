import { getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5068'

export type EditorComponentType = {
  type: string
  name: string
  defaultData: Record<string, unknown>
  defaultOptions: Record<string, unknown>
}

export type EditorComponent = {
  id: string
  type: string
  ordered: number
  publish: boolean
  data: Record<string, unknown> | null
  options: Record<string, unknown> | null
}

export type EditorContainer = {
  id: string
  parentId: string | null
  component: string | null
  cols: number | null
  ordered: number
  publish: boolean
  options: Record<string, unknown> | null
  components: EditorComponent[]
}

export type EditorTree = {
  id: string
  component: string
  parentId: string
  publish: boolean
  languagePrefix?: string | null
  containers: EditorContainer[]
}

function withLang(path: string, lang: string): string {
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}lang=${encodeURIComponent(lang)}`
}

export type SaveEditorTreeInput = {
  publish?: boolean
  containers: Array<{
    id?: string | null
    parentId?: string | null
    component?: string | null
    cols?: number | null
    ordered: number
    publish: boolean
    options?: Record<string, unknown> | null
    components?: Array<{
      id?: string | null
      type: string
      ordered: number
      publish: boolean
      data?: Record<string, unknown> | null
      options?: Record<string, unknown> | null
    }>
  }>
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

export function listEditorComponentTypes(): Promise<EditorComponentType[]> {
  return apiFetch('/api/admin/editor-trya/component-types')
}

export function getEditor(component: string, parentId: string, lang: string): Promise<EditorTree> {
  return apiFetch(
    withLang(`/api/admin/editor-trya/${encodeURIComponent(component)}/${parentId}`, lang),
  )
}

export function saveEditor(
  component: string,
  parentId: string,
  input: SaveEditorTreeInput,
  lang: string,
): Promise<EditorTree> {
  return apiFetch(
    withLang(`/api/admin/editor-trya/${encodeURIComponent(component)}/${parentId}`, lang),
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  )
}

export function createEditorContainer(
  component: string,
  parentId: string,
  input: {
    component?: string
    cols?: number
    publish?: boolean
    options?: Record<string, unknown>
  },
  lang: string,
): Promise<EditorContainer> {
  return apiFetch(
    withLang(
      `/api/admin/editor-trya/${encodeURIComponent(component)}/${parentId}/containers`,
      lang,
    ),
    {
      method: 'POST',
      body: JSON.stringify({
        parentId: null,
        component: input.component ?? 'section',
        cols: input.cols ?? 12,
        publish: input.publish ?? true,
        options: input.options ?? {},
      }),
    },
  )
}

export function cloneEditor(
  component: string,
  parentId: string,
  fromLang: string,
  toLang: string,
): Promise<EditorTree> {
  const path = `/api/admin/editor-trya/${encodeURIComponent(component)}/${parentId}/clone?from=${encodeURIComponent(fromLang)}&to=${encodeURIComponent(toLang)}`
  return apiFetch(path, { method: 'POST' })
}

export function updateEditorContainer(
  containerId: string,
  input: {
    parentId?: string | null
    component?: string | null
    cols?: number | null
    ordered: number
    publish: boolean
    options?: Record<string, unknown> | null
  },
): Promise<EditorContainer> {
  return apiFetch(`/api/admin/editor-trya/containers/${containerId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function createEditorComponent(
  containerId: string,
  input: {
    type: string
    data?: Record<string, unknown>
    options?: Record<string, unknown>
    publish?: boolean
  },
): Promise<EditorComponent> {
  return apiFetch(`/api/admin/editor-trya/containers/${containerId}/components`, {
    method: 'POST',
    body: JSON.stringify({
      type: input.type,
      data: input.data ?? {},
      options: input.options ?? {},
      publish: input.publish ?? true,
    }),
  })
}

export function updateEditorComponent(
  componentId: string,
  input: {
    type: string
    ordered: number
    publish: boolean
    data?: Record<string, unknown> | null
    options?: Record<string, unknown> | null
  },
): Promise<EditorComponent> {
  return apiFetch(`/api/admin/editor-trya/components/${componentId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteEditorComponent(componentId: string): Promise<void> {
  return apiFetch(`/api/admin/editor-trya/components/${componentId}`, { method: 'DELETE' })
}

export function deleteEditorContainer(containerId: string): Promise<void> {
  return apiFetch(`/api/admin/editor-trya/containers/${containerId}`, { method: 'DELETE' })
}

export function reorderEditorContainers(items: Array<{ id: string; ordered: number }>): Promise<void> {
  return apiFetch('/api/admin/editor-trya/containers/reorder', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  })
}

export function reorderEditorComponents(
  items: Array<{ id: string; ordered: number; containerId?: string }>,
): Promise<void> {
  return apiFetch('/api/admin/editor-trya/components/reorder', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  })
}
