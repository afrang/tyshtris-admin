import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  createBlogGroup,
  getBlogGroup,
  listBlogGroups,
  updateBlogGroup,
  type BlogGroup,
} from '../../lib/contentApi'
import { MediaUploader } from '../../components/media/MediaUploader'
import { EditorTryaBuilder } from '../../components/editor-trya/EditorTryaBuilder'
import { QaEditor } from '../../components/qa/QaEditor'
import { LanguageTabs, LocalizedFields } from '../../components/LanguageTabs'
import { useLanguages } from '../../hooks/useLanguages'
import { useAdminShell } from '../../layouts/AdminLayout'
import './PostEditorPage.css'

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function collectDescendantIds(groups: BlogGroup[], parentId: string): Set<string> {
  const childrenByParent = new Map<string | null, BlogGroup[]>()
  for (const group of groups) {
    const key = group.parentId
    const list = childrenByParent.get(key) ?? []
    list.push(group)
    childrenByParent.set(key, list)
  }

  const excluded = new Set<string>([parentId])
  const stack = [parentId]
  while (stack.length) {
    const current = stack.pop()!
    for (const child of childrenByParent.get(current) ?? []) {
      if (!excluded.has(child.id)) {
        excluded.add(child.id)
        stack.push(child.id)
      }
    }
  }
  return excluded
}

export function BlogGroupEditorPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
  const [parentId, setParentId] = useState(() => searchParams.get('parentId') ?? '')
  const [allGroups, setAllGroups] = useState<BlogGroup[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'editor' | 'qa'>('details')
  const { setSidebarOpen } = useAdminShell()

  useEffect(() => {
    setSidebarOpen(activeTab !== 'editor' && activeTab !== 'qa')
    return () => setSidebarOpen(true)
  }, [activeTab, setSidebarOpen])

  useEffect(() => {
    if (!lang) {
      if (!langLoading) setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const groups = await listBlogGroups(lang)
        setAllGroups(groups)

        if (id) {
          const group = await getBlogGroup(id, lang)
          setTitle(group.title)
          setSlug(group.slug)
          setKeyword(group.keyword ?? '')
          setDescription(group.description ?? '')
          setParentId(group.parentId ?? '')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load editor.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id, lang, langLoading])

  const excludedParentIds = id ? collectDescendantIds(allGroups, id) : new Set<string>()
  const parentOptions = allGroups.filter((group) => !excludedParentIds.has(group.id))

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
        parentId: parentId || null,
      }

      if (isEdit && id) {
        await updateBlogGroup(id, payload, lang)
        navigate('/content/blog-groups')
      } else {
        const created = await createBlogGroup(payload, lang)
        navigate(`/content/blog-groups/${created.id}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save blog group.')
    } finally {
      setSaving(false)
    }
  }

  if (langLoading || (lang && loading)) {
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
          <p className="post-editor-kicker">Content</p>
          <h1>{isEdit ? 'Edit blog group' : 'Add blog group'}</h1>
          <p>Update details, change the thumbnail, and build content with EditorTrya.</p>
        </div>
        <div className="post-editor-heading-actions">
          <Link to="/content/blog-groups" className="post-editor-back">
            Back to list
          </Link>
          <button
            type="submit"
            form="blog-group-editor-form"
            className="post-editor-save-top"
            disabled={saving || !hasLanguages}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create group'}
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

      <div className="post-editor-tabs" role="tablist" aria-label="Blog group editor sections">
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
          aria-selected={activeTab === 'editor'}
          className={`post-editor-tab${activeTab === 'editor' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          EditorTrya
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
        id="blog-group-editor-form"
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
                      placeholder="Technology"
                    />
                  </label>

                  <label className="post-editor-field">
                    Slug
                    <input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      required
                      placeholder="technology"
                    />
                  </label>

                  <label className="post-editor-field">
                    Parent group
                    <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                      <option value="">Root (no parent)</option>
                      {parentOptions.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="post-editor-field post-editor-field--wide">
                    Keyword
                    <input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="tech, software"
                    />
                  </label>

                  <label className="post-editor-field post-editor-field--wide">
                    Description
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Short summary for this group."
                    />
                  </label>
                </div>
              </LocalizedFields>
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
                  component="bloggroupthumbnail"
                  parentId={id}
                  multiple={false}
                  label="Group thumbnail"
                />
              ) : (
                <p className="post-editor-muted">
                  Create the group first, then you can upload a thumbnail.
                </p>
              )}
            </div>

            <div className="post-editor-card">
              <div className="post-editor-card-head">
                <h2>Save</h2>
              </div>
              <button type="submit" className="post-editor-save" disabled={saving || !hasLanguages}>
                {saving ? 'Saving…' : isEdit ? 'Update group' : 'Create group'}
              </button>
            </div>
          </aside>
        </div>

        <div className="post-editor-full" hidden={activeTab !== 'editor'}>
          <div className="post-editor-card post-editor-card--editortrya">
            {id && lang ? (
              <EditorTryaBuilder
                key={`${id}-${lang}`}
                component="bloggroup"
                parentId={id}
                lang={lang}
                onLangChange={setLang}
                direction={direction}
                languages={languages}
                langLoading={langLoading}
                langError={langError}
              />
            ) : (
              <p className="post-editor-muted">
                {id
                  ? 'Select a language to edit EditorTrya content.'
                  : 'Create the group first, then build structured content with EditorTrya.'}
              </p>
            )}
          </div>
        </div>

        <div className="post-editor-full" hidden={activeTab !== 'qa'}>
          <div className="post-editor-card">
            {id && lang ? (
              <QaEditor
                key={`${id}-${lang}`}
                component="bloggroup"
                parentId={id}
                lang={lang}
                direction={direction}
                languages={languages}
              />
            ) : (
              <p className="post-editor-muted">
                {id
                  ? 'Select a language to edit Q&A.'
                  : 'Create the group first, then add Q&A questions and answers.'}
              </p>
            )}
          </div>
        </div>
      </form>
    </section>
  )
}
