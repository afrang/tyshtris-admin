import { getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5068'

function withLang(path: string, lang?: string): string {
  if (!lang) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}lang=${encodeURIComponent(lang)}`
}

export type BlogGroup = {
  id: string
  title: string
  slug: string
  keyword: string | null
  description: string | null
  parentId: string | null
  showTimestamp: boolean
  languagePrefix?: string | null
}

export type BlogGroupTree = BlogGroup & {
  children: BlogGroupTree[]
}

export type CreateBlogGroupInput = {
  title: string
  slug: string
  keyword?: string | null
  description?: string | null
  parentId?: string | null
  showTimestamp?: boolean
}

export type RelatedItem = {
  id: string
  title: string
}

export type BlogPostListItem = {
  id: string
  title: string
  slug: string
  status: string
  createdAt: string
  groups: RelatedItem[]
  tags: RelatedItem[]
  languagePrefix?: string | null
}

export type BlogPost = {
  id: string
  title: string
  slug: string
  keyword: string | null
  description: string | null
  content: string | null
  metaTitle: string | null
  metaDescription: string | null
  status: string
  commentsEnabled: boolean
  createdAt: string
  updatedAt: string
  groups: RelatedItem[]
  tags: RelatedItem[]
  languagePrefix?: string | null
}

export type UpsertBlogPostInput = {
  title: string
  slug: string
  keyword?: string | null
  description?: string | null
  content?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  status?: string
  commentsEnabled?: boolean
  groups?: string[]
  tags?: string[]
}

export type Tag = {
  id: string
  title: string
  slug: string
  description: string | null
  languagePrefix?: string | null
}

export type UpsertTagInput = {
  title: string
  slug: string
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

export function listBlogGroups(lang?: string): Promise<BlogGroup[]> {
  return apiFetch<BlogGroup[]>(withLang('/api/admin/blog-groups', lang))
}

export function getBlogGroupTree(lang?: string): Promise<BlogGroupTree[]> {
  return apiFetch<BlogGroupTree[]>(withLang('/api/admin/blog-groups/tree', lang))
}

export function getBlogGroup(id: string, lang?: string): Promise<BlogGroup> {
  return apiFetch<BlogGroup>(withLang(`/api/admin/blog-groups/${id}`, lang))
}

export function createBlogGroup(input: CreateBlogGroupInput, lang: string): Promise<BlogGroup> {
  return apiFetch<BlogGroup>(withLang('/api/admin/blog-groups', lang), {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateBlogGroup(id: string, input: CreateBlogGroupInput, lang: string): Promise<BlogGroup> {
  return apiFetch<BlogGroup>(withLang(`/api/admin/blog-groups/${id}`, lang), {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteBlogGroup(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/blog-groups/${id}`, {
    method: 'DELETE',
  })
}

export function listBlogPosts(lang?: string): Promise<BlogPostListItem[]> {
  return apiFetch<BlogPostListItem[]>(withLang('/api/admin/blog-posts', lang))
}

export function getBlogPost(id: string, lang?: string): Promise<BlogPost> {
  return apiFetch<BlogPost>(withLang(`/api/admin/blog-posts/${id}`, lang))
}

export function createBlogPost(input: UpsertBlogPostInput, lang: string): Promise<BlogPost> {
  return apiFetch<BlogPost>(withLang('/api/admin/blog-posts', lang), {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateBlogPost(id: string, input: UpsertBlogPostInput, lang: string): Promise<BlogPost> {
  return apiFetch<BlogPost>(withLang(`/api/admin/blog-posts/${id}`, lang), {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteBlogPost(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/blog-posts/${id}`, {
    method: 'DELETE',
  })
}

export function listTags(lang?: string): Promise<Tag[]> {
  return apiFetch<Tag[]>(withLang('/api/admin/tags', lang))
}

export function searchTags(query: string, lang?: string): Promise<Tag[]> {
  const q = encodeURIComponent(query)
  return apiFetch<Tag[]>(withLang(`/api/admin/tags/search?q=${q}`, lang))
}

export function createTag(input: UpsertTagInput, lang: string): Promise<Tag> {
  return apiFetch<Tag>(withLang('/api/admin/tags', lang), {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export type TranslatePostInput = {
  title: string
  slug: string
  keyword?: string | null
  description?: string | null
  content?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
}

export type TranslatePostOutput = TranslatePostInput & {
  translatedLang: string
}

export function translateBlogPost(
  input: TranslatePostInput,
  sourceLang: string,
  targetLang: string
): Promise<TranslatePostOutput> {
  return apiFetch<TranslatePostOutput>('/api/ai/translate', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      sourceLang,
      targetLang,
    }),
  })
}

export function updateTag(id: string, input: UpsertTagInput, lang: string): Promise<Tag> {
  return apiFetch<Tag>(withLang(`/api/admin/tags/${id}`, lang), {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteTag(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/tags/${id}`, {
    method: 'DELETE',
  })
}
