import type { LoginResult } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5068'

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error('Invalid email or password.')
  }

  return (await response.json()) as LoginResult
}
