import { getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5068'

export type TicketReply = {
  id: string
  authorName: string
  fromStaff: boolean
  body: string
  createdAtUtc: string
}

export type TicketDetail = {
  id: string
  userId: string
  authorName: string
  authorEmail: string
  category: string
  title: string
  body: string
  status: string
  createdAtUtc: string
  updatedAtUtc: string
  replies: TicketReply[]
}

export type TicketListItem = {
  id: string
  authorName: string
  authorEmail: string
  category: string
  title: string
  status: string
  replyCount: number
  createdAtUtc: string
  updatedAtUtc: string
}

export type TicketList = {
  total: number
  openCount: number
  answeredCount: number
  closedCount: number
  items: TicketListItem[]
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

export function listTickets(params?: { category?: string; status?: string }): Promise<TicketList> {
  const query = new URLSearchParams()
  if (params?.category) query.set('category', params.category)
  if (params?.status) query.set('status', params.status)
  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiFetch<TicketList>(`/api/admin/tickets${suffix}`)
}

export function getTicket(id: string): Promise<TicketDetail> {
  return apiFetch<TicketDetail>(`/api/admin/tickets/${id}`)
}

export function replyTicket(id: string, body: string): Promise<TicketDetail> {
  return apiFetch<TicketDetail>(`/api/admin/tickets/${id}/replies`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

export function setTicketStatus(id: string, status: string): Promise<TicketDetail> {
  return apiFetch<TicketDetail>(`/api/admin/tickets/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}
