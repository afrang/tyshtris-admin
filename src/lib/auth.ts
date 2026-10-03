const TOKEN_KEY = 'tishtrya.cc.token'
const USER_KEY = 'tishtrya.cc.user'

export const Roles = {
  SuperAdmin: 'SuperAdmin',
  Admin: 'Admin',
  User: 'User',
} as const

export type AuthUser = {
  id?: string
  email: string
  displayName: string
  role: string
}

export type LoginResult = {
  accessToken: string
  expiresAtUtc: string
  email: string
  displayName: string
  role: string
}

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function isAdmin(role?: string | null): boolean {
  const value = role ?? getUser()?.role
  return value === Roles.Admin || value === Roles.SuperAdmin
}

export function persistSession(result: LoginResult): void {
  localStorage.setItem(TOKEN_KEY, result.accessToken)
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      email: result.email,
      displayName: result.displayName,
      role: result.role,
    }),
  )
}

export function updateStoredUser(patch: Partial<AuthUser>): void {
  const current = getUser()
  if (!current) return
  localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...patch }))
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
