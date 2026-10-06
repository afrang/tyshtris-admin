import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { login } from '../lib/api'
import { isAuthenticated, persistSession } from '../lib/auth'
import { UiLanguageSwitch, useUiLanguage } from '../i18n/UiLanguage'
import { Turnstile, isTurnstileConfigured } from '../components/Turnstile'
import './LoginPage.css'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaKey, setCaptchaKey] = useState(0)
  const { direction, t } = useUiLanguage()

  if (isAuthenticated()) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (isTurnstileConfigured() && !captchaToken) {
      setError(t('captchaRequired'))
      return
    }

    setLoading(true)

    try {
      const result = await login(email.trim(), password, captchaToken)
      persistSession(result)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signInFailed'))
      setCaptchaToken(null)
      setCaptchaKey((value) => value + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-shell" dir={direction}>
      <div className="login-language">
        <UiLanguageSwitch />
      </div>
      <div className="login-atmosphere" aria-hidden="true">
        <div className="login-glow" />
        <div className="login-rain" />
        <div className="login-stars" />
      </div>

      <section className="login-stage">
        <header className="login-brand">
          <img
            className="login-logo"
            src="/logo-white.png"
            alt="Tishtrya Control Center"
            width={280}
            height={120}
          />
          <h1 className="login-title">{t('controlCenter')}</h1>
          <p className="login-tagline">{t('tagline')}</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="login-field">
            <span>{t('email')}</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@tishtrya.cp"
              required
            />
          </label>

          <label className="login-field">
            <span>{t('password')}</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          <div className="login-captcha">
            <Turnstile key={captchaKey} theme="dark" onToken={setCaptchaToken} />
          </div>

          {error ? <p className="login-error" role="alert">{error}</p> : null}

          <button
            className="login-submit"
            type="submit"
            disabled={loading || (isTurnstileConfigured() && !captchaToken)}
          >
            {loading ? t('signingIn') : t('enterControlCenter')}
          </button>
        </form>
      </section>
    </main>
  )
}
