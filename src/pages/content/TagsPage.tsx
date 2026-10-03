import { type FormEvent, useEffect, useState } from 'react'
import {
  createTag,
  deleteTag,
  listTags,
  updateTag,
  type Tag,
} from '../../lib/contentApi'
import { LanguageTabs, LocalizedFields } from '../../components/LanguageTabs'
import { useLanguages } from '../../hooks/useLanguages'
import { confirmDialog } from '../../lib/swal'
import './TagsPage.css'

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export function TagsPage() {
  const {
    languages,
    lang,
    setLang,
    direction,
    loading: langLoading,
    error: langError,
    hasLanguages,
  } = useLanguages()
  const [tags, setTags] = useState<Tag[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function refresh(activeLang: string) {
    setLoading(true)
    setError(null)
    try {
      setTags(await listTags(activeLang))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!lang) {
      if (!langLoading) {
        setTags([])
        setLoading(false)
      }
      return
    }
    resetForm()
    void refresh(lang)
  }, [lang, langLoading])

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setSlug('')
    setDescription('')
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id)
    setTitle(tag.title)
    setSlug(tag.slug)
    setDescription(tag.description ?? '')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!lang) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title,
        slug: slug || slugify(title),
        description: description || null,
      }
      if (editingId) {
        await updateTag(editingId, payload, lang)
      } else {
        await createTag(payload, lang)
      }
      resetForm()
      await refresh(lang)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tag.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmDialog({
      title: 'Delete tag?',
      text: 'This tag will be permanently removed.',
    })
    if (!confirmed || !lang) return
    setError(null)
    try {
      await deleteTag(id)
      if (editingId === id) resetForm()
      await refresh(lang)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag.')
    }
  }

  return (
    <section className="tags-page">
      <div className="tags-heading">
        <h1>Tags</h1>
        <p>Flat tags for blog posts. Slugs are unique and GUID-based IDs are used everywhere.</p>
      </div>

      <LanguageTabs
        languages={languages}
        value={lang}
        onChange={setLang}
        loading={langLoading}
        error={langError}
        disabled={saving}
        direction={direction}
      />

      {error ? <p className="tags-error">{error}</p> : null}

      <div className="tags-grid">
        <form className="tags-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Edit tag' : 'Add tag'}</h2>

          <LocalizedFields direction={direction}>
            <label>
              Title
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (!editingId && (!slug || slug === slugify(title))) {
                    setSlug(slugify(e.target.value))
                  }
                }}
                required
              />
            </label>

            <label>
              Slug
              <input value={slug} onChange={(e) => setSlug(e.target.value)} required />
            </label>

            <label>
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </label>
          </LocalizedFields>

          <div className="tags-form-actions">
            <button type="submit" disabled={saving || !hasLanguages}>
              {saving ? 'Saving…' : editingId ? 'Update tag' : 'Create tag'}
            </button>
            {editingId ? (
              <button type="button" className="tags-btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="tags-list">
          <h2>All tags</h2>
          {loading ? <p className="tags-muted">Loading…</p> : null}
          {!loading && tags.length === 0 ? <p className="tags-muted">No tags yet.</p> : null}
          {!loading && tags.length > 0 ? (
            <ul className="tags-items">
              {tags.map((tag) => (
                <li key={tag.id}>
                  <div>
                    <strong>{tag.title}</strong>
                    <span className="tags-meta">{tag.slug}</span>
                    {tag.description ? <p>{tag.description}</p> : null}
                  </div>
                  <div className="tags-row-actions">
                    <button type="button" onClick={() => startEdit(tag)}>
                      Edit
                    </button>
                    <button type="button" className="tags-delete" onClick={() => handleDelete(tag.id)}>
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
