import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Language, TextDirection } from '../lib/languagesApi'
import './LanguageTabs.css'

type Props = {
  languages: Language[]
  value: string
  onChange: (prefix: string) => void
  loading?: boolean
  error?: string | null
  disabled?: boolean
  direction?: TextDirection
}

export function LanguageTabs({
  languages,
  value,
  onChange,
  loading = false,
  error = null,
  disabled = false,
  direction,
}: Props) {
  if (loading) {
    return (
      <div className="lang-switch" aria-busy="true">
        <span className="lang-switch-label">Language</span>
        <div className="lang-switch-track lang-switch-track--skeleton" />
      </div>
    )
  }

  if (error) {
    return <p className="lang-switch-error">{error}</p>
  }

  if (languages.length === 0) {
    return (
      <div className="lang-switch lang-switch--empty">
        <span className="lang-switch-label">Language</span>
        <p className="lang-switch-empty-text">
          No languages yet.{' '}
          <Link to="/settings/languages">Add one in Settings</Link>
        </p>
      </div>
    )
  }

  const active = languages.find((l) => l.prefix === value)
  const activeDirection = direction ?? active?.direction ?? 'ltr'

  return (
    <div className="lang-switch" data-dir={activeDirection}>
      <div className="lang-switch-main">
        <span className="lang-switch-label">Language</span>

        <div className="lang-switch-track" role="tablist" aria-label="Language">
          {languages.map((language) => {
            const selected = language.prefix === value
            return (
              <button
                key={language.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`${language.name} (${language.prefix.toUpperCase()})${language.isDefault ? ', default' : ''}`}
                title={`${language.name}${language.isDefault ? ' · Default' : ''} · ${language.direction.toUpperCase()}`}
                className={`lang-switch-btn${selected ? ' lang-switch-btn--active' : ''}`}
                disabled={disabled}
                onClick={() => onChange(language.prefix)}
              >
                <span className="lang-switch-code">{language.prefix.toUpperCase()}</span>
              </button>
            )
          })}
        </div>

        <span
          className={`lang-switch-dir lang-switch-dir--${activeDirection}`}
          title={`Input direction: ${activeDirection.toUpperCase()}`}
        >
          {activeDirection === 'rtl' ? 'RTL' : 'LTR'}
        </span>
      </div>
    </div>
  )
}

type LocalizedFieldsProps = {
  direction: TextDirection
  children: ReactNode
  className?: string
}

export function LocalizedFields({ direction, children, className }: LocalizedFieldsProps) {
  return (
    <div
      dir={direction}
      translate="no"
      className={`lang-fields${direction === 'rtl' ? ' lang-fields--rtl' : ''}${className ? ` ${className}` : ''}`}
    >
      {children}
    </div>
  )
}
