import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createBlogPost,
  getBlogGroupTree,
  getBlogPost,
  listTags,
  searchTags,
  updateBlogPost,
  type BlogGroupTree,
  type Tag,
} from '../../lib/contentApi'
import { MediaUploader } from '../../components/media/MediaUploader'
import { EditorTryaBuilder } from '../../components/editor-trya/EditorTryaBuilder'
import { PostCommentsModerator } from '../../components/comments/PostCommentsModerator'
import { QaEditor } from '../../components/qa/QaEditor'
import { LanguageTabs, LocalizedFields } from '../../components/LanguageTabs'
import { useLanguages } from '../../hooks/useLanguages'
import { useAdminShell } from '../../layouts/AdminLayout'
import './PostEditorPage.css'

const persianMap: Record<string, string> = {
  'ا': 'a', 'آ': 'a', 'أ': 'a', 'إ': 'i', 'ب': 'b', 'پ': 'p', 'ت': 't',
  'ث': 's', 'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z',
  'ر': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z',
  'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'gh', 'ک': 'k',
  'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'و': 'v', 'ه': 'h', 'ی': 'i',
  'ي': 'i', 'ة': 'a', 'ئ': 'i', ' ': '-'
}

function transliterate(str: string): string {
  return str.split('').map(c => persianMap[c] ?? persianMap[c.toLowerCase()] ?? c).join('')
}

function slugify(value: string): string {
  const withLatin = transliterate(value)
  return withLatin
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function collectGroupTitles(nodes: BlogGroupTree[], selected: Set<string>, acc: { id: string; title: string; path: string }[] = [], path: string[] = []) {
  for (const node of nodes) {
    const nextPath = [...path, node.title]
    if (selected.has(node.id)) {
      acc.push({ id: node.id, title: node.title, path: nextPath.join(' / ') })
    }
    if (node.children.length) {
      collectGroupTitles(node.children, selected, acc, nextPath)
    }
  }
  return acc
}

function GroupTreeNode({
  node,
  selected,
  onToggle,
  depth,
  expanded,
  onToggleExpand,
}: {
  node: BlogGroupTree
  selected: Set<string>
  onToggle: (id: string) => void
  depth: number
  expanded: Set<string>
  onToggleExpand: (id: string) => void
}) {
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.id)
  const isChecked = selected.has(node.id)

  return (
    <li>
      <div className={`group-picker-row${isChecked ? ' group-picker-row--selected' : ''}`} style={{ paddingLeft: `${0.55 + depth * 1.05}rem` }}>
        {hasChildren ? (
          <button
            type="button"
            className={`group-picker-caret${isOpen ? ' is-open' : ''}`}
            aria-label={isOpen ? 'Collapse' : 'Expand'}
            onClick={() => onToggleExpand(node.id)}
          >
            ▸
          </button>
        ) : (
          <span className="group-picker-caret-spacer" />
        )}

        <label className="group-picker-label">
          <input type="checkbox" checked={isChecked} onChange={() => onToggle(node.id)} />
          <span className="group-picker-title">{node.title}</span>
          <span className="group-picker-slug">{node.slug}</span>
        </label>
      </div>

      {hasChildren && isOpen ? (
        <ul className="group-picker-children">
          {node.children.map((child) => (
            <GroupTreeNode
              key={child.id}
              node={child}
              selected={selected}
              onToggle={onToggle}
              depth={depth + 1}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function filterTree(nodes: BlogGroupTree[], query: string): BlogGroupTree[] {
  const q = query.trim().toLowerCase()
  if (!q) return nodes

  const walk = (items: BlogGroupTree[]): BlogGroupTree[] => {
    const result: BlogGroupTree[] = []
    for (const item of items) {
      const children = walk(item.children)
      const selfMatch =
        item.title.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
      if (selfMatch || children.length > 0) {
        result.push({ ...item, children })
      }
    }
    return result
  }

  return walk(nodes)
}

function collectExpandableIds(nodes: BlogGroupTree[], acc: string[] = []): string[] {
  for (const node of nodes) {
    if (node.children.length) {
      acc.push(node.id)
      collectExpandableIds(node.children, acc)
    }
  }
  return acc
}

function GroupMultiSelect({
  nodes,
  selected,
  onToggle,
  onClear,
}: {
  nodes: BlogGroupTree[]
  selected: Set<string>
  onToggle: (id: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(collectExpandableIds(nodes)))

  const filtered = useMemo(() => filterTree(nodes, query), [nodes, query])
  const selectedItems = useMemo(() => collectGroupTitles(nodes, selected), [nodes, selected])

  useEffect(() => {
    if (query.trim()) {
      setExpanded(new Set(collectExpandableIds(filtered)))
    }
  }, [query, filtered])

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={`group-picker${open ? ' group-picker--open' : ''}`}>
      <button type="button" className="group-picker-trigger" onClick={() => setOpen((v) => !v)}>
        <span>
          {selectedItems.length === 0
            ? 'Select blog groups…'
            : `${selectedItems.length} group${selectedItems.length > 1 ? 's' : ''} selected`}
        </span>
        <span className="group-picker-trigger-caret">{open ? '▴' : '▾'}</span>
      </button>

      {selectedItems.length > 0 ? (
        <div className="group-picker-chips">
          {selectedItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="group-picker-chip"
              title={item.path}
              onClick={() => onToggle(item.id)}
            >
              <span>{item.title}</span>
              <span aria-hidden>×</span>
            </button>
          ))}
          <button type="button" className="group-picker-clear" onClick={onClear}>
            Clear
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="group-picker-dropdown">
          <input
            type="search"
            className="group-picker-search"
            placeholder="Search groups…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {filtered.length === 0 ? (
            <p className="post-editor-muted">No matching groups.</p>
          ) : (
            <ul className="group-picker-tree">
              {filtered.map((node) => (
                <GroupTreeNode
                  key={node.id}
                  node={node}
                  selected={selected}
                  onToggle={onToggle}
                  depth={0}
                  expanded={expanded}
                  onToggleExpand={toggleExpand}
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function PostEditorPage() {
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
  const [content, setContent] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [status, setStatus] = useState('draft')
  const [commentsEnabled, setCommentsEnabled] = useState(false)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [groupTree, setGroupTree] = useState<BlogGroupTree[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [tagQuery, setTagQuery] = useState('')
  const [tagResults, setTagResults] = useState<Tag[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'editor' | 'seo' | 'qa'>('details')
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
        const [tree, tags] = await Promise.all([getBlogGroupTree(lang), listTags(lang)])
        setGroupTree(tree)
        setAllTags(tags)
        setTagResults(tags)

        if (id) {
          const post = await getBlogPost(id, lang)
          setTitle(post.title)
          setSlug(post.slug)
          setKeyword(post.keyword ?? '')
          setDescription(post.description ?? '')
          setContent(post.content ?? '')
          setMetaTitle(post.metaTitle ?? '')
          setMetaDescription(post.metaDescription ?? '')
          setStatus(post.status)
          setCommentsEnabled(Boolean(post.commentsEnabled))
          setSelectedGroups(new Set(post.groups.map((g) => g.id)))
          setSelectedTags(new Set(post.tags.map((t) => t.id)))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load editor.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id, lang, langLoading])

  useEffect(() => {
    if (!lang) return
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          if (!tagQuery.trim()) {
            setTagResults(allTags)
            return
          }
          setTagResults(await searchTags(tagQuery.trim(), lang))
        } catch {
          // keep previous results
        }
      })()
    }, 250)

    return () => window.clearTimeout(handle)
  }, [tagQuery, allTags, lang])

  const selectedTagItems = useMemo(
    () => allTags.filter((t) => selectedTags.has(t.id)),
    [allTags, selectedTags],
  )

  function toggleGroup(groupId: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  function toggleTag(tagId: string) {
    const fromResults = tagResults.find((t) => t.id === tagId)
    if (fromResults && !allTags.some((t) => t.id === tagId)) {
      setAllTags((prev) => [...prev, fromResults])
    }
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
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
        keyword: keyword || null,
        description: description || null,
        content: content || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        status,
        commentsEnabled,
        groups: Array.from(selectedGroups),
        tags: Array.from(selectedTags),
      }

      if (isEdit && id) {
        await updateBlogPost(id, payload, lang)
        navigate('/content/posts')
      } else {
        const created = await createBlogPost(payload, lang)
        navigate(`/content/posts/${created.id}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save post.')
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
    <section className="post-editor" translate="no">
      <div className="post-editor-heading">
        <div>
          <p className="post-editor-kicker">Content</p>
          <h1>{isEdit ? 'Edit post' : 'Add post'}</h1>
          <p>Write content, assign groups & tags, and set a thumbnail.</p>
        </div>
        <div className="post-editor-heading-actions">
          <Link to="/content/posts" className="post-editor-back">
            Back to list
          </Link>
          <button
            type="submit"
            form="post-editor-form"
            className="post-editor-save-top"
            disabled={saving || !hasLanguages}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create post'}
          </button>
        </div>
      </div>

      {error ? <p className="post-editor-error">{error}</p> : null}

      <div className="post-editor-lang-bar">
        <LanguageTabs
          languages={languages}
          value={lang}
          onChange={setLang}
          loading={langLoading}
          error={langError}
          disabled={saving}
          direction={direction}
        />
      </div>

      <div className="post-editor-tabs" role="tablist" aria-label="Post editor sections">
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
          aria-selected={activeTab === 'seo'}
          className={`post-editor-tab${activeTab === 'seo' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('seo')}
        >
          SEO
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
        id="post-editor-form"
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
                        placeholder="Introduction to Artificial Intelligence"
                      />
                    </label>

                    <label className="post-editor-field">
                      Slug
                      <input
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        required
                        placeholder="introduction-to-ai"
                      />
                    </label>

                    <label className="post-editor-field">
                      Keyword
                      <input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="AI, machine learning"
                      />
                    </label>

                    <label className="post-editor-field post-editor-field--wide">
                      Description
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Short summary for listings and SEO."
                      />
                    </label>

                    <label className="post-editor-field post-editor-field--wide">
                      Content
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={12}
                        placeholder="Write the full post content…"
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
                    component="blogthumbnail"
                    parentId={id}
                    multiple={false}
                    label="Post thumbnail"
                  />
                ) : (
                  <p className="post-editor-muted">
                    Create the post first, then you can upload a thumbnail.
                  </p>
                )}
              </div>

              <div className="post-editor-card">
                <div className="post-editor-card-head">
                  <h2>Publish</h2>
                </div>
                <LocalizedFields direction={direction}>
                  <label className="post-editor-field">
                    Status
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </label>
                  <label className="post-editor-field post-editor-check">
                    <span>
                      <input
                        type="checkbox"
                        checked={commentsEnabled}
                        onChange={(e) => setCommentsEnabled(e.target.checked)}
                      />
                      Enable comments
                    </span>
                    <small>Allow users to comment on this post</small>
                  </label>
                </LocalizedFields>
                <button type="submit" className="post-editor-save" disabled={saving || !hasLanguages}>
                  {saving ? 'Saving…' : isEdit ? 'Update post' : 'Create post'}
                </button>
              </div>

              {isEdit && id ? (
                <div className="post-editor-card">
                  <PostCommentsModerator postId={id} />
                </div>
              ) : null}

              <div className="post-editor-card">
                <div className="post-editor-card-head">
                  <h2>Groups</h2>
                  <span>{selectedGroups.size} selected</span>
                </div>
                {groupTree.length === 0 ? (
                  <p className="post-editor-muted">No blog groups yet.</p>
                ) : (
                  <GroupMultiSelect
                    nodes={groupTree}
                    selected={selectedGroups}
                    onToggle={toggleGroup}
                    onClear={() => setSelectedGroups(new Set())}
                  />
                )}
              </div>

              <div className="post-editor-card">
                <div className="post-editor-card-head">
                  <h2>Tags</h2>
                  <span>{selectedTags.size} selected</span>
                </div>
                <input
                  type="search"
                  className="tag-search"
                  placeholder="Search tags…"
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                />
                {selectedTagItems.length > 0 ? (
                  <div className="selected-tags">
                    {selectedTagItems.map((tag) => (
                      <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}>
                        {tag.title} ×
                      </button>
                    ))}
                  </div>
                ) : null}
                <ul className="tag-options">
                  {tagResults.map((tag) => (
                    <li key={tag.id}>
                      <label className={`tag-option${selectedTags.has(tag.id) ? ' is-selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selectedTags.has(tag.id)}
                          onChange={() => toggleTag(tag.id)}
                        />
                        <span>{tag.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
        </div>

        <div className="post-editor-full" hidden={activeTab !== 'editor'}>
          <div className="post-editor-card post-editor-card--editortrya">
            {id && lang ? (
              <EditorTryaBuilder
                key={`${id}-${lang}`}
                component="blogpost"
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
                  : 'Create the post first, then build structured content with EditorTrya.'}
              </p>
            )}
          </div>
        </div>

        <div className="post-editor-full" hidden={activeTab !== 'seo'}>
          <div className="post-editor-card">
            <div className="post-editor-card-head">
              <h2>SEO</h2>
            </div>
            <LocalizedFields direction={direction}>
              <div className="post-editor-field-grid">
                <label className="post-editor-field post-editor-field--wide">
                  Meta title
                  <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
                </label>
                <label className="post-editor-field post-editor-field--wide">
                  Meta description
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    rows={4}
                  />
                </label>
              </div>
            </LocalizedFields>
          </div>
        </div>

        <div className="post-editor-full" hidden={activeTab !== 'qa'}>
          <div className="post-editor-card">
            {id && lang ? (
              <QaEditor
                key={`${id}-${lang}`}
                component="blogpost"
                parentId={id}
                lang={lang}
                direction={direction}
                languages={languages}
              />
            ) : (
              <p className="post-editor-muted">
                {id
                  ? 'Select a language to edit Q&A.'
                  : 'Create the post first, then add Q&A questions and answers.'}
              </p>
            )}
          </div>
        </div>
      </form>
    </section>
  )
}
