import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { listBlogGroups, listBlogPosts, type BlogGroup, type BlogPostListItem } from '../../lib/contentApi'
import { listGalleries, type GalleryListItem } from '../../lib/galleryApi'
import { listForms, type FormListItem } from '../../lib/formsApi'
import {
  buildMenuUrl,
  createMenuItem,
  getMenuItem,
  listMenuItems,
  updateMenuItem,
  type MenuItem,
  type MenuLinkFunction,
} from '../../lib/menuApi'
import { MediaUploader } from '../../components/media/MediaUploader'
import { LanguageTabs, LocalizedFields } from '../../components/LanguageTabs'
import { useLanguages } from '../../hooks/useLanguages'
import './MenuManager.css'

const MAX_DEPTH = 3

const FUNCTION_OPTIONS: Array<{
  value: MenuLinkFunction
  label: string
  pattern: string
}> = [
  { value: 'GroupBlog', label: 'Blog group', pattern: '/{slug}' },
  { value: 'Post', label: 'Post', pattern: '/post/{slug}' },
  { value: 'Gallery', label: 'Gallery', pattern: '/gallery/{slug}' },
  { value: 'Form', label: 'Form', pattern: '/form/{slug}' },
  { value: 'Custom', label: 'Custom URL', pattern: 'type any path' },
]

function getDepth(items: MenuItem[], itemId: string | null | undefined): number {
  if (!itemId) return 0
  let depth = 0
  let current: string | null = itemId
  const byId = new Map(items.map((item) => [item.id, item]))
  while (current) {
    depth += 1
    current = byId.get(current)?.parentId ?? null
    if (depth > MAX_DEPTH + 2) break
  }
  return depth
}

function collectDescendantIds(items: MenuItem[], rootId: string): Set<string> {
  const childrenByParent = new Map<string | null, MenuItem[]>()
  for (const item of items) {
    const list = childrenByParent.get(item.parentId) ?? []
    list.push(item)
    childrenByParent.set(item.parentId, list)
  }

  const excluded = new Set<string>([rootId])
  const stack = [rootId]
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

export function MenuItemEditorPage() {
  const { groupId, itemId } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(itemId)
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
  const [functionType, setFunctionType] = useState<MenuLinkFunction>('Custom')
  const [targetId, setTargetId] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [parentId, setParentId] = useState(searchParams.get('parentId') ?? '')
  const [data, setData] = useState('')
  const [isMegaMenu, setIsMegaMenu] = useState(false)
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)

  const [siblings, setSiblings] = useState<MenuItem[]>([])
  const [blogGroups, setBlogGroups] = useState<BlogGroup[]>([])
  const [posts, setPosts] = useState<BlogPostListItem[]>([])
  const [galleries, setGalleries] = useState<GalleryListItem[]>([])
  const [forms, setForms] = useState<FormListItem[]>([])

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!groupId || !lang) {
      if (!langLoading) setLoading(false)
      return
    }
    const activeGroupId = groupId
    const activeLang = lang

    async function load() {
      setLoading(true)
      setError(null)
      setSuccess(null)
      try {
        const [items, groups, blogPosts, galleryList, formList] = await Promise.all([
          listMenuItems(activeGroupId, activeLang),
          listBlogGroups(activeLang),
          listBlogPosts(activeLang),
          listGalleries(activeLang),
          listForms(activeLang),
        ])
        setSiblings(items)
        setBlogGroups(groups)
        setPosts(blogPosts)
        setGalleries(galleryList)
        setForms(formList)

        if (itemId) {
          const item = await getMenuItem(itemId, lang)
          setTitle(item.title)
          setFunctionType(item.function)
          setTargetId(item.targetId ?? '')
          setCustomUrl(item.function === 'Custom' ? item.url : '')
          setParentId(item.parentId ?? '')
          setData(item.data ?? '')
          setIsMegaMenu(item.isMegaMenu)
          setSortOrder(item.sortOrder)
          setIsActive(item.isActive)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load menu item editor.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [groupId, itemId, lang, langLoading])

  const excludedParentIds = itemId ? collectDescendantIds(siblings, itemId) : new Set<string>()
  const parentOptions = siblings.filter((item) => {
    if (excludedParentIds.has(item.id)) return false
    return getDepth(siblings, item.id) < MAX_DEPTH
  })

  const parentLabel = useMemo(() => {
    if (!parentId) return 'Root level'
    const parent = siblings.find((item) => item.id === parentId)
    if (!parent) return 'Selected parent'
    return `${parent.title} · level ${getDepth(siblings, parent.id)}`
  }, [parentId, siblings])

  const previewUrl = useMemo(() => {
    if (functionType === 'Custom') return customUrl.trim()
    if (functionType === 'GroupBlog') {
      const slug = blogGroups.find((g) => g.id === targetId)?.slug
      return buildMenuUrl('GroupBlog', slug, '')
    }
    if (functionType === 'Post') {
      const slug = posts.find((p) => p.id === targetId)?.slug
      return buildMenuUrl('Post', slug, '')
    }
    if (functionType === 'Gallery') {
      const slug = galleries.find((g) => g.id === targetId)?.slug
      return buildMenuUrl('Gallery', slug, '')
    }
    if (functionType === 'Form') {
      const slug = forms.find((f) => f.id === targetId)?.slug
      return buildMenuUrl('Form', slug, '')
    }
    return ''
  }, [functionType, customUrl, targetId, blogGroups, posts, galleries, forms])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!groupId || !lang) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const payload = {
        title,
        function: functionType,
        targetId: functionType === 'Custom' ? null : targetId || null,
        url: functionType === 'Custom' ? customUrl : null,
        parentId: parentId || null,
        data: data || null,
        isMegaMenu: functionType === 'GroupBlog' ? isMegaMenu : false,
        sortOrder,
        isActive,
      }

      if (isEdit && itemId) {
        await updateMenuItem(itemId, payload, lang)
        setSuccess('Menu item saved. You can upload or replace the image below.')
      } else {
        const created = await createMenuItem({ ...payload, groupId }, lang)
        navigate(`/menus/${groupId}/items/${created.id}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save menu item.')
    } finally {
      setSaving(false)
    }
  }

  if (langLoading || (lang && loading)) {
    return (
      <section className="menu-manager">
        <div className="menu-manager-loading">Loading menu item…</div>
      </section>
    )
  }

  return (
    <section className="menu-manager">
      <p className="menu-manager-crumb">
        <Link to="/menus">Menu Manager</Link>
        <span>/</span>
        <Link to={`/menus/${groupId}`}>Group</Link>
        <span>/</span>
        <span>{isEdit ? 'Edit item' : 'New item'}</span>
      </p>

      <div className="menu-manager-heading">
        <div>
          <p className="menu-manager-kicker">Menu item</p>
          <h1>{isEdit ? 'Edit menu item' : 'Add menu item'}</h1>
          <p>
            Choose how the link is built, optionally nest under a parent (max 3 levels), then upload
            an image after the item exists.
          </p>
        </div>
        <div className="menu-manager-heading-actions">
          <Link to={`/menus/${groupId}`} className="menu-manager-back">
            Back to group
          </Link>
          <button
            type="submit"
            form="menu-item-editor-form"
            className="menu-manager-btn"
            disabled={saving || !hasLanguages}
          >
            {saving ? 'Saving…' : isEdit ? 'Save item' : 'Create item'}
          </button>
        </div>
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

      {error ? <p className="menu-manager-error">{error}</p> : null}
      {success ? <p className="menu-manager-success">{success}</p> : null}

      <div className="menu-manager-layout menu-manager-layout--item">
        <form
          id="menu-item-editor-form"
          className="menu-manager-panel"
          onSubmit={handleSubmit}
        >
          <div className="menu-manager-panel-head">
            <div>
              <h2>Item details</h2>
              <p>Parent: {parentLabel}</p>
            </div>
          </div>

          <LocalizedFields direction={direction} className="menu-manager-panel-body menu-manager-form">
            <label className="menu-manager-field">
              <span>Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="About us"
                required
              />
            </label>

            <div className="menu-manager-field">
              <span>Function</span>
              <div className="menu-function-grid">
                {FUNCTION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`menu-function-card${functionType === option.value ? ' is-active' : ''}`}
                    onClick={() => {
                      setFunctionType(option.value)
                      setTargetId('')
                      if (option.value !== 'GroupBlog') setIsMegaMenu(false)
                    }}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.pattern}</span>
                  </button>
                ))}
              </div>
            </div>

            {functionType === 'GroupBlog' ? (
              <>
                <label className="menu-manager-field">
                  <span>Blog group</span>
                  <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
                    <option value="">Select blog group…</option>
                    {blogGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.title} ({group.slug})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="menu-mega-toggle">
                  <input
                    type="checkbox"
                    checked={isMegaMenu}
                    onChange={(e) => setIsMegaMenu(e.target.checked)}
                  />
                  <span>
                    <strong>Mega menu</strong>
                    <small>Render this Blog group link as a mega menu panel</small>
                  </span>
                </label>
              </>
            ) : null}

            {functionType === 'Post' ? (
              <label className="menu-manager-field">
                <span>Post</span>
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
                  <option value="">Select post…</option>
                  {posts.map((post) => (
                    <option key={post.id} value={post.id}>
                      {post.title} ({post.slug})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {functionType === 'Gallery' ? (
              <label className="menu-manager-field">
                <span>Gallery</span>
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
                  <option value="">Select gallery…</option>
                  {galleries.map((gallery) => (
                    <option key={gallery.id} value={gallery.id}>
                      {gallery.title} ({gallery.slug})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {functionType === 'Form' ? (
              <label className="menu-manager-field">
                <span>Form</span>
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
                  <option value="">Select form…</option>
                  {forms.map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.title} ({form.slug})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {functionType === 'Custom' ? (
              <label className="menu-manager-field">
                <span>URL</span>
                <input
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="/about or https://example.com"
                  required
                />
              </label>
            ) : (
              <div className="menu-manager-field">
                <span>Resolved URL</span>
                <p className="menu-preview-box">{previewUrl || 'Select a target to preview the URL'}</p>
              </div>
            )}

            <label className="menu-manager-field">
              <span>Parent</span>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">No parent (root)</option>
                {parentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} (level {getDepth(siblings, item.id)})
                  </option>
                ))}
              </select>
              <p className="menu-manager-hint">Parents already at level 3 cannot accept children.</p>
            </label>

            <label className="menu-manager-field">
              <span>Data (optional)</span>
              <textarea
                value={data}
                onChange={(e) => setData(e.target.value)}
                rows={3}
                placeholder='Optional JSON, e.g. {"icon":"home"}'
              />
            </label>

            <div className="menu-manager-field-grid">
              <label className="menu-manager-field">
                <span>Sort order</span>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                />
              </label>

              <label className="menu-manager-field">
                <span>Status</span>
                <select
                  value={isActive ? 'true' : 'false'}
                  onChange={(e) => setIsActive(e.target.value === 'true')}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
            </div>
          </LocalizedFields>
        </form>

        <aside className="menu-manager-panel menu-manager-panel--image">
          <div className="menu-manager-panel-head">
            <div>
              <h2>Image</h2>
              <p>Optional</p>
            </div>
          </div>
          <div className="menu-manager-panel-body">
            {itemId ? (
              <MediaUploader
                key={itemId}
                component="menuitemimage"
                parentId={itemId}
                multiple={false}
                label="Image"
              />
            ) : (
              <p className="menu-manager-hint">
                Create the item first, then upload an image here.
              </p>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
