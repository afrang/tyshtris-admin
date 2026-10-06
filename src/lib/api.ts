import type { LoginResult } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5068'

export async function login(
  email: string,
  password: string,
  captchaToken?: string | null,
): Promise<LoginResult> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, captchaToken: captchaToken ?? null }),
  })

  if (!response.ok) {
    let message = 'Invalid email or password.'
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return (await response.json()) as LoginResult
}
