import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { deleteGallery, listGalleries, type GalleryListItem } from '../../lib/galleryApi'
import { LanguageTabs } from '../../components/LanguageTabs'
import { useLanguages } from '../../hooks/useLanguages'
import { confirmDialog } from '../../lib/swal'
import '../content/PostsPage.css'

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export function GalleriesPage() {
  const {
    languages,
    lang,
    setLang,
    direction,
    loading: langLoading,
    error: langError,
  } = useLanguages()
  const [galleries, setGalleries] = useState<GalleryListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh(activeLang: string) {
    setLoading(true)
    setError(null)
    try {
      setGalleries(await listGalleries(activeLang))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load galleries.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!lang) {
      if (!langLoading) {
        setGalleries([])
        setLoading(false)
      }
      return
    }
    void refresh(lang)
  }, [lang, langLoading])

  async function handleDelete(id: string) {
    const confirmed = await confirmDialog({
      title: 'Delete gallery?',
      text: 'This gallery will be permanently removed. Media files stay in FileManager until deleted separately.',
    })
    if (!confirmed || !lang) return
    setError(null)
    try {
      await deleteGallery(id)
      await refresh(lang)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete gallery.')
    }
  }

  return (
    <section className="posts-page">
      <div className="posts-heading">
        <div>
          <h1>Galleries</h1>
          <p>Create galleries with a thumbnail and mixed image, video, or audio items.</p>
        </div>
        <Link to="/media/galleries/new" className="posts-primary-btn">
          Add gallery
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

      <div className="posts-table-wrap">
        {loading ? <p className="posts-muted">Loading…</p> : null}
        {!loading && galleries.length === 0 ? (
          <p className="posts-muted">No galleries yet.</p>
        ) : null}
        {!loading && galleries.length > 0 ? (
          <table className="posts-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Keyword</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {galleries.map((gallery) => (
                <tr key={gallery.id}>
                  <td>{gallery.title}</td>
                  <td className="posts-mono">{gallery.slug}</td>
                  <td>{gallery.keyword || '—'}</td>
                  <td>{formatDate(gallery.updatedAt)}</td>
                  <td className="posts-actions">
                    <Link to={`/media/galleries/${gallery.id}`}>Edit</Link>
                    <button type="button" onClick={() => void handleDelete(gallery.id)}>
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
