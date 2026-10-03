import { getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5068'

export type CommentItem = {
  id: string
  component: string
  parentId: string
  parentCommentId: string | null
  userId: string
  authorDisplayName: string
  authorEmail: string | null
  body: string
  status: string
  createdAt: string
  updatedAt: string
  replies: CommentItem[]
}

export type CommentList = {
  component: string
  parentId: string
  commentsEnabled: boolean
  comments: CommentItem[]
}

export type AdminCommentListItem = {
  id: string
  component: string
  parentId: string
  parentTitle: string | null
  parentCommentId: string | null
  userId: string
  authorDisplayName: string
  authorEmail: string | null
  body: string
  status: string
  createdAt: string
  updatedAt: string
}

export type AdminCommentList = {
  total: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  items: AdminCommentListItem[]
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
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

function mapAdminItem(raw: Record<string, unknown>): AdminCommentListItem {
  return {
    id: String(raw.id ?? raw.Id ?? ''),
    component: String(raw.component ?? raw.Component ?? ''),
    parentId: String(raw.parentId ?? raw.ParentId ?? ''),
    parentTitle: (raw.parentTitle ?? raw.ParentTitle ?? null) as string | null,
    parentCommentId: (raw.parentCommentId ?? raw.ParentCommentId ?? null) as string | null,
    userId: String(raw.userId ?? raw.UserId ?? ''),
    authorDisplayName: String(raw.authorDisplayName ?? raw.AuthorDisplayName ?? ''),
    authorEmail: (raw.authorEmail ?? raw.AuthorEmail ?? null) as string | null,
    body: String(raw.body ?? raw.Body ?? ''),
    status: String(raw.status ?? raw.Status ?? ''),
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.UpdatedAt ?? ''),
  }
}

export function listAllCommentsAdmin(params?: {
  status?: string
  component?: string
  q?: string
}): Promise<AdminCommentList> {
  const search = new URLSearchParams()
  if (params?.status) search.set('status', params.status)
  if (params?.component) search.set('component', params.component)
  if (params?.q) search.set('q', params.q)
  const qs = search.toString()
  return apiFetch<Record<string, unknown>>(`/api/admin/comments${qs ? `?${qs}` : ''}`).then((raw) => {
    const itemsRaw = (raw.items ?? raw.Items ?? []) as Array<Record<string, unknown>>
    return {
      total: Number(raw.total ?? raw.Total ?? itemsRaw.length),
      pendingCount: Number(raw.pendingCount ?? raw.PendingCount ?? 0),
      approvedCount: Number(raw.approvedCount ?? raw.ApprovedCount ?? 0),
      rejectedCount: Number(raw.rejectedCount ?? raw.RejectedCount ?? 0),
      items: itemsRaw.map(mapAdminItem),
    }
  })
}

export function listCommentsAdmin(component: string, parentId: string): Promise<CommentList> {
  return apiFetch(`/api/admin/comments/${encodeURIComponent(component)}/${parentId}`)
}

export function updateCommentStatus(
  commentId: string,
  status: 'pending' | 'approved' | 'rejected',
): Promise<CommentItem> {
  return apiFetch(`/api/admin/comments/${commentId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

export function deleteCommentAdmin(commentId: string): Promise<void> {
  return apiFetch(`/api/admin/comments/${commentId}`, { method: 'DELETE' })
}

export function listCommentsPublic(component: string, parentId: string): Promise<CommentList> {
  return apiFetch(`/api/public/comments/${encodeURIComponent(component)}/${parentId}`)
}

export function createComment(
  component: string,
  parentId: string,
  body: string,
  parentCommentId?: string | null,
): Promise<CommentItem> {
  return apiFetch(`/api/public/comments/${encodeURIComponent(component)}/${parentId}`, {
    method: 'POST',
    body: JSON.stringify({ body, parentCommentId: parentCommentId ?? null }),
  })
}
