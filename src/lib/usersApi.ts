import { getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5068'

export type UserRole = 'Admin' | 'User' | 'SuperAdmin'

export type ManagedUser = {
  id: string
  email: string
  displayName: string
  role: UserRole | string
  isActive: boolean
  createdAtUtc: string
}

export type CreateUserInput = {
  email: string
  displayName: string
  password: string
  role: 'Admin' | 'User'
}

export type UpdateUserProfileInput = {
  email: string
  displayName: string
  isActive?: boolean | null
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

export function listUsers(): Promise<ManagedUser[]> {
  return apiFetch<ManagedUser[]>('/api/admin/users')
}

export function createUser(input: CreateUserInput): Promise<ManagedUser> {
  return apiFetch<ManagedUser>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateUser(id: string, input: UpdateUserProfileInput): Promise<ManagedUser> {
  return apiFetch<ManagedUser>(`/api/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function changeUserRole(id: string, role: 'Admin' | 'User'): Promise<ManagedUser> {
  return apiFetch<ManagedUser>(`/api/admin/users/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  })
}

export function setUserPassword(id: string, password: string): Promise<void> {
  return apiFetch<void>(`/api/admin/users/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  })
}

export function deleteUser(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/users/${id}`, {
    method: 'DELETE',
  })
}

export function updateOwnProfile(input: {
  email: string
  displayName: string
}): Promise<ManagedUser> {
  return apiFetch<ManagedUser>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function changeOwnPassword(input: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  return apiFetch<void>('/api/auth/password', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function getMe(): Promise<ManagedUser> {
  return apiFetch<ManagedUser>('/api/auth/me')
}
