import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { deleteForm, listForms, type FormListItem } from '../../lib/formsApi'
import { LanguageTabs } from '../../components/LanguageTabs'
import { useLanguages } from '../../hooks/useLanguages'
import { confirmDialog } from '../../lib/swal'
import '../content/PostsPage.css'
import './FormBuilder.css'

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export function FormsPage() {
  const {
    languages,
    lang,
    setLang,
    direction,
    loading: langLoading,
    error: langError,
  } = useLanguages()
  const [forms, setForms] = useState<FormListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh(activeLang: string) {
    setLoading(true)
    setError(null)
    try {
      setForms(await listForms(activeLang))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!lang) {
      if (!langLoading) {
        setForms([])
        setLoading(false)
      }
      return
    }
    void refresh(lang)
  }, [lang, langLoading])

  async function handleDelete(id: string) {
    const confirmed = await confirmDialog({
      title: 'Delete form?',
      text: 'This form, its fields, and all submissions will be permanently removed.',
    })
    if (!confirmed || !lang) return
    setError(null)
    try {
      await deleteForm(id)
      await refresh(lang)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete form.')
    }
  }

  return (
    <section className="posts-page">
      <div className="posts-heading">
        <div>
          <h1>Forms</h1>
          <p>Create and manage multi-field forms with a visual builder.</p>
        </div>
        <Link to="/forms/new" className="posts-primary-btn">
          Add form
        </Link>
      </div>

      <LanguageTabs
        languages={languages}
        value={lang}
        onChange={setLang}
        loading={langLoading}
        error={langError}
        direction={direction}
      />

      {error ? <p className="posts-error">{error}</p> : null}

      {!loading && forms.length > 0 ? (
        <div className="forms-overview" aria-label="Forms overview">
          <div><strong>{forms.length}</strong><span>Total forms</span></div>
          <div><strong>{forms.filter((form) => form.isPublished).length}</strong><span>Published</span></div>
          <div><strong>{forms.reduce((total, form) => total + form.submissionCount, 0)}</strong><span>Submissions</span></div>
        </div>
      ) : null}

      <div className="posts-table-wrap">
        {loading ? <p className="posts-muted">Loading…</p> : null}
        {!loading && forms.length === 0 ? (
          <p className="posts-muted">No forms yet. Create one to start building.</p>
        ) : null}
        {!loading && forms.length > 0 ? (
          <table className="posts-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Fields</th>
                <th>Submissions</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr key={form.id}>
                  <td><Link className="forms-title-link" to={`/forms/${form.id}`}>{form.title}</Link></td>
                  <td className="posts-mono">{form.slug}</td>
                  <td><span className={`posts-status posts-status--${form.isPublished ? 'published' : 'draft'}`}>{form.isPublished ? 'Published' : 'Draft'}</span></td>
                  <td>{form.fieldCount}</td>
                  <td>{form.submissionCount}</td>
                  <td>{formatDate(form.updatedAt)}</td>
                  <td className="posts-actions">
                    <Link to={`/forms/${form.id}`}>Open editor</Link>
                    <button type="button" onClick={() => void handleDelete(form.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  )
}
