import { type FormEvent, useEffect, useState } from 'react'
import {
  createLanguage,
  deleteLanguage,
  listLanguages,
  updateLanguage,
  type Language,
  type TextDirection,
} from '../../lib/languagesApi'
import { confirmDialog } from '../../lib/swal'
import './LanguagesPage.css'

function normalizePrefix(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-')
}

export function LanguagesPage() {
  const [languages, setLanguages] = useState<Language[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [prefix, setPrefix] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [direction, setDirection] = useState<TextDirection>('ltr')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setLanguages(await listLanguages())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load languages.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  function resetForm() {
    setEditingId(null)
    setName('')
    setPrefix('')
    setIsDefault(languages.length === 0)
    setDirection('ltr')
  }

  function startEdit(language: Language) {
    setEditingId(language.id)
    setName(language.name)
    setPrefix(language.prefix)
    setIsDefault(language.isDefault)
    setDirection(language.direction)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: name.trim(),
        prefix: normalizePrefix(prefix),
        isDefault,
        direction,
      }
      if (editingId) {
        await updateLanguage(editingId, payload)
      } else {
        await createLanguage(payload)
      }
      resetForm()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save language.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmDialog({
      title: 'Delete language?',
      text: 'This language will be permanently removed.',
    })
    if (!confirmed) return
    setError(null)
    try {
      await deleteLanguage(id)
      if (editingId === id) resetForm()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete language.')
    }
  }

  return (
    <section className="languages-page">
      <div className="languages-heading">
        <h1>Languages</h1>
        <p>
          Manage site languages. Set a default language and choose LTR or RTL so content forms match
          the writing direction.
        </p>
      </div>

      {error ? <p className="languages-error">{error}</p> : null}

      <div className="languages-grid">
        <form className="languages-form" onSubmit={handleSubmit} dir={direction}>
          <h2>{editingId ? 'Edit language' : 'Add language'}</h2>

          <label>
            Language name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="English"
              required
            />
          </label>

          <label>
            Prefix
            <input
              value={prefix}
              onChange={(e) => setPrefix(normalizePrefix(e.target.value))}
              placeholder="en"
              required
              pattern="[a-z]{2}(-[a-z0-9]{2,8})?"
              title="Short language code such as en, fa, or en-us"
            />
          </label>

          <fieldset className="languages-direction">
            <legend>Text direction</legend>
            <label className="languages-check">
              <input
                type="radio"
                name="direction"
                checked={direction === 'ltr'}
                onChange={() => setDirection('ltr')}
              />
              LTR (Left to right)
            </label>
            <label className="languages-check">
              <input
                type="radio"
                name="direction"
                checked={direction === 'rtl'}
                onChange={() => setDirection('rtl')}
              />
              RTL (Right to left)
            </label>
          </fieldset>

          <label className="languages-check">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            Default language
          </label>

          <div className="languages-form-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update language' : 'Create language'}
            </button>
            {editingId ? (
              <button type="button" className="languages-btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="languages-list">
          <h2>All languages</h2>
          {loading ? <p className="languages-muted">Loading…</p> : null}
          {!loading && languages.length === 0 ? (
            <p className="languages-muted">No languages yet.</p>
          ) : null}
          {!loading && languages.length > 0 ? (
            <ul className="languages-items">
              {languages.map((language) => (
                <li key={language.id}>
                  <div>
                    <strong>{language.name}</strong>
                    <span className="languages-meta">
                      {language.prefix}
                      {' · '}
                      {language.direction.toUpperCase()}
                      {language.isDefault ? ' · Default' : ''}
                    </span>
                  </div>
                  <div className="languages-row-actions">
                    <button type="button" onClick={() => startEdit(language)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="languages-delete"
                      onClick={() => handleDelete(language.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  )
}
