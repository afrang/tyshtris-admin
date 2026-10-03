import { getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5068'

function withLang(path: string, lang?: string): string {
  if (!lang) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}lang=${encodeURIComponent(lang)}`
}

export type MenuLinkFunction = 'GroupBlog' | 'Post' | 'Gallery' | 'Form' | 'Custom'

export type MenuGroup = {
  id: string
  title: string
  key: string
  description: string | null
  sortOrder: number
  isActive: boolean
  languagePrefix?: string | null
}

export type UpsertMenuGroupInput = {
  title: string
  key: string
  description?: string | null
  sortOrder: number
  isActive: boolean
}

export type MenuItem = {
  id: string
  groupId: string
  title: string
  url: string
  parentId: string | null
  data: string | null
  function: MenuLinkFunction
  targetId: string | null
  isMegaMenu: boolean
  sortOrder: number
  isActive: boolean
  languagePrefix?: string | null
}

export type MenuItemTree = MenuItem & {
  children: MenuItemTree[]
}

export type CreateMenuItemInput = {
  groupId: string
  title: string
  function: MenuLinkFunction
  targetId?: string | null
  url?: string | null
  parentId?: string | null
  data?: string | null
  isMegaMenu: boolean
  sortOrder: number
  isActive: boolean
}

export type UpdateMenuItemInput = {
  title: string
  function: MenuLinkFunction
  targetId?: string | null
  url?: string | null
  parentId?: string | null
  data?: string | null
  isMegaMenu: boolean
  sortOrder: number
  isActive: boolean
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

export function listMenuGroups(lang?: string): Promise<MenuGroup[]> {
  return apiFetch<MenuGroup[]>(withLang('/api/admin/menu-groups', lang))
}

export function getMenuGroup(id: string, lang?: string): Promise<MenuGroup> {
  return apiFetch<MenuGroup>(withLang(`/api/admin/menu-groups/${id}`, lang))
}

export function createMenuGroup(input: UpsertMenuGroupInput, lang: string): Promise<MenuGroup> {
  return apiFetch<MenuGroup>(withLang('/api/admin/menu-groups', lang), {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateMenuGroup(id: string, input: UpsertMenuGroupInput, lang: string): Promise<MenuGroup> {
  return apiFetch<MenuGroup>(withLang(`/api/admin/menu-groups/${id}`, lang), {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteMenuGroup(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/menu-groups/${id}`, { method: 'DELETE' })
}

export function listMenuItems(groupId: string, lang?: string): Promise<MenuItem[]> {
  return apiFetch<MenuItem[]>(
    withLang(`/api/admin/menu-items?groupId=${encodeURIComponent(groupId)}`, lang),
  )
}

export function getMenuItemTree(groupId: string, lang?: string): Promise<MenuItemTree[]> {
  return apiFetch<MenuItemTree[]>(
    withLang(`/api/admin/menu-items/tree?groupId=${encodeURIComponent(groupId)}`, lang),
  )
}

export function getMenuItem(id: string, lang?: string): Promise<MenuItem> {
  return apiFetch<MenuItem>(withLang(`/api/admin/menu-items/${id}`, lang))
}

export function createMenuItem(input: CreateMenuItemInput, lang: string): Promise<MenuItem> {
  return apiFetch<MenuItem>(withLang('/api/admin/menu-items', lang), {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateMenuItem(id: string, input: UpdateMenuItemInput, lang: string): Promise<MenuItem> {
  return apiFetch<MenuItem>(withLang(`/api/admin/menu-items/${id}`, lang), {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteMenuItem(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/menu-items/${id}`, { method: 'DELETE' })
}

export type MenuItemOrderItem = {
  id: string
  sortOrder: number
}

export function reorderMenuItems(items: MenuItemOrderItem[]): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/api/admin/menu-items/order', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  })
}

export function buildMenuUrl(
  functionType: MenuLinkFunction,
  slug: string | null | undefined,
  customUrl: string,
): string {
  if (functionType === 'Custom') return customUrl.trim()
  if (!slug) return ''
  if (functionType === 'GroupBlog') return `/${slug}`
  if (functionType === 'Post') return `/post/${slug}`
  if (functionType === 'Gallery') return `/gallery/${slug}`
  if (functionType === 'Form') return `/form/${slug}`
  return ''
}
