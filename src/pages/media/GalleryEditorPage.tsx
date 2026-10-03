import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createGallery, getGallery, updateGallery } from '../../lib/galleryApi'
import { MediaUploader } from '../../components/media/MediaUploader'
import { GalleryMediaUploader } from '../../components/media/GalleryMediaUploader'
import { QaEditor } from '../../components/qa/QaEditor'
import { LanguageTabs, LocalizedFields } from '../../components/LanguageTabs'
import { useLanguages } from '../../hooks/useLanguages'
import '../content/PostEditorPage.css'

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export function GalleryEditorPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const {
    languages,
    lang,
    setLang,
    direction,
    loading: langLoading,
    error: langError,
    hasLanguages,
  } = useLanguages()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [keyword, setKeyword] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'qa'>('details')

  useEffect(() => {
    if (!lang) {
      if (!langLoading) setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)
      try {
        if (id) {
          const gallery = await getGallery(id, lang)
          setTitle(gallery.title)
          setSlug(gallery.slug)
          setKeyword(gallery.keyword ?? '')
          setDescription(gallery.description ?? '')
        } else {
          setLoading(false)
          return
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load gallery.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id, lang, langLoading])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!lang) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title,
        slug: slug || slugify(title),
        keyword: keyword || null,
        description: description || null,
      }

      if (isEdit && id) {
        await updateGallery(id, payload, lang)
        navigate('/media/galleries')
      } else {
        const created = await createGallery(payload, lang)
        navigate(`/media/galleries/${created.id}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gallery.')
    } finally {
      setSaving(false)
    }
  }

  if (langLoading || (lang && loading && isEdit)) {
    return (
      <section className="post-editor">
        <div className="post-editor-loading">Loading editor…</div>
      </section>
    )
  }

  return (
    <section className="post-editor">
      <div className="post-editor-heading">
        <div>
          <p className="post-editor-kicker">Media</p>
          <h1>{isEdit ? 'Edit gallery' : 'Add gallery'}</h1>
          <p>Set title, slug, keyword, and description. Add a thumbnail and gallery media.</p>
        </div>
        <div className="post-editor-heading-actions">
          <Link to="/media/galleries" className="post-editor-back">
            Back to list
          </Link>
          <button
            type="submit"
            form="gallery-editor-form"
            className="post-editor-save-top"
            disabled={saving || !hasLanguages}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create gallery'}
          </button>
        </div>
      </div>

      {error ? <p className="post-editor-error">{error}</p> : null}

      <LanguageTabs
        languages={languages}
        value={lang}
        onChange={setLang}
        loading={langLoading}
        error={langError}
        disabled={saving}
        direction={direction}
      />

      <div className="post-editor-tabs" role="tablist" aria-label="Gallery editor sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'details'}
          className={`post-editor-tab${activeTab === 'details' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'qa'}
          className={`post-editor-tab${activeTab === 'qa' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('qa')}
        >
          Q&A
        </button>
      </div>

      <form
        id="gallery-editor-form"
        className={`post-editor-form${activeTab !== 'details' ? ' post-editor-form--full' : ''}`}
        onSubmit={handleSubmit}
      >
        <div className="post-editor-tab-panel" hidden={activeTab !== 'details'}>
          <div className="post-editor-main">
            <div className="post-editor-card">
              <div className="post-editor-card-head">
                <h2>Details</h2>
              </div>

              <LocalizedFields direction={direction}>
                <div className="post-editor-field-grid">
                  <label className="post-editor-field post-editor-field--wide">
                    Title
                    <input
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value)
                        if (!isEdit && (!slug || slug === slugify(title))) {
                          setSlug(slugify(e.target.value))
                        }
                      }}
                      required
                      placeholder="Summer collection"
                    />
                  </label>

                  <label className="post-editor-field">
                    Slug
                    <input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      required
                      placeholder="summer-collection"
                    />
                  </label>

                  <label className="post-editor-field post-editor-field--wide">
                    Keyword
                    <input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="summer, photos, campaign"
                    />
                  </label>

                  <label className="post-editor-field post-editor-field--wide">
                    Description
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Short summary for this gallery."
                    />
                  </label>
                </div>
              </LocalizedFields>
            </div>

            <div className="post-editor-card">
              <div className="post-editor-card-head">
                <h2>Gallery media</h2>
              </div>
              {id ? (
                <GalleryMediaUploader
                  key={id}
                  component="gallerydetail"
                  parentId={id}
                  label="Images, video, or audio"
                />
              ) : (
                <p className="post-editor-muted">
                  Create the gallery first, then upload images, video, or audio.
                </p>
              )}
            </div>
          </div>

          <aside className="post-editor-side">
            <div className="post-editor-card post-editor-card--thumbnail">
              <div className="post-editor-card-head">
                <h2>Thumbnail</h2>
              </div>
              {id ? (
                <MediaUploader
                  key={id}
                  component="gallerythumbnail"
                  parentId={id}
                  multiple={false}
                  label="Gallery thumbnail"
                />
              ) : (
                <p className="post-editor-muted">
                  Create the gallery first, then you can upload a thumbnail.
                </p>
              )}
            </div>

            <div className="post-editor-card">
              <div className="post-editor-card-head">
                <h2>Save</h2>
              </div>
              <button type="submit" className="post-editor-save" disabled={saving || !hasLanguages}>
                {saving ? 'Saving…' : isEdit ? 'Update gallery' : 'Create gallery'}
              </button>
            </div>
          </aside>
        </div>

        <div className="post-editor-full" hidden={activeTab !== 'qa'}>
          <div className="post-editor-card">
            {id && lang ? (
              <QaEditor
                key={`${id}-${lang}`}
                component="gallery"
                parentId={id}
                lang={lang}
                direction={direction}
                languages={languages}
              />
            ) : (
              <p className="post-editor-muted">
                {id
                  ? 'Select a language to edit Q&A.'
                  : 'Create the gallery first, then add Q&A questions and answers.'}
              </p>
            )}
          </div>
        </div>
      </form>
    </section>
  )
}
