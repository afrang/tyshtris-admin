import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  deleteBlogPost,
  listBlogGroups,
  listBlogPosts,
  type BlogGroup,
  type BlogPostListItem,
} from '../../lib/contentApi'
import { LanguageTabs } from '../../components/LanguageTabs'
import { useLanguages } from '../../hooks/useLanguages'
import { confirmDialog } from '../../lib/swal'
import './PostsPage.css'

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export function PostsPage() {
  const {
    languages,
    lang,
    setLang,
    direction,
    loading: langLoading,
    error: langError,
  } = useLanguages()
  const [posts, setPosts] = useState<BlogPostListItem[]>([])
  const [groups, setGroups] = useState<BlogGroup[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  async function refresh(activeLang: string) {
    setLoading(true)
    setError(null)
    setSelectedIds([])
    try {
      const [postRows, groupRows] = await Promise.all([
        listBlogPosts(activeLang),
        listBlogGroups(activeLang),
      ])
      setPosts(postRows)
      setGroups(groupRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!lang) {
      if (!langLoading) {
        setPosts([])
        setGroups([])
        setLoading(false)
      }
      return
    }
    void refresh(lang)
  }, [lang, langLoading])

  useEffect(() => {
    setSelectedIds([])
  }, [searchQuery, categoryId, lang])

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return posts.filter((post) => {
      if (categoryId && !post.groups.some((group) => group.id === categoryId)) {
        return false
      }
      if (!query) return true
      const haystack = [post.title, post.slug, post.status, ...post.tags.map((tag) => tag.title)]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [posts, searchQuery, categoryId])

  async function handleDelete(id: string) {
    const confirmed = await confirmDialog({
      title: 'Delete blog post?',
      text: 'This post will be permanently removed.',
    })
    if (!confirmed || !lang) return
    setError(null)
    try {
      await deleteBlogPost(id)
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id))
      await refresh(lang)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post.')
    }
  }

  const allFilteredSelected =
    filteredPosts.length > 0 && filteredPosts.every((post) => selectedIds.includes(post.id))

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    if (filteredPosts.length === 0) return
    if (allFilteredSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !filteredPosts.some((post) => post.id === id))
      )
      return
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredPosts.map((post) => post.id)])))
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0 || !lang) return
    const confirmed = await confirmDialog({
      title: 'Delete selected posts?',
      text: `${selectedIds.length} post(s) will be permanently removed.`,
    })
    if (!confirmed) return
    setError(null)
    setBusy(true)
    try {
      const ids = [...selectedIds]
      const failures: string[] = []
      for (const id of ids) {
        try {
          await deleteBlogPost(id)
        } catch (err) {
          failures.push(err instanceof Error ? err.message : id)
        }
      }
      if (failures.length > 0) {
        setError(`Failed to delete ${failures.length} of ${ids.length} post(s). ${failures[0]}`)
      }
      await refresh(lang)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="posts-page">
      <div className="posts-heading">
        <div>
          <h1>Blog Posts</h1>
          <p>Manage posts with multi-group and multi-tag assignments.</p>
        </div>
        <Link to="/content/posts/new" className="posts-primary-btn">
          Add post
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

      <div className="posts-controls">
        <label>
          Search
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, slug, tags…"
          />
        </label>
        <label>
          Category
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedIds.length > 0 ? (
        <div className="posts-bulk-bar">
          <span className="posts-bulk-count">
            {selectedIds.length} selected
          </span>
          <button
            type="button"
            className="posts-bulk-delete"
            onClick={handleBulkDelete}
            disabled={busy}
          >
            {busy ? 'Deleting…' : `Delete selected (${selectedIds.length})`}
          </button>
          <button
            type="button"
            className="posts-bulk-clear"
            onClick={() => setSelectedIds([])}
            disabled={busy}
          >
            Clear selection
          </button>
        </div>
      ) : null}

      <div className="posts-table-wrap">
        {loading ? <p className="posts-muted">Loading…</p> : null}
        {!loading && posts.length === 0 ? <p className="posts-muted">No posts yet.</p> : null}
        {!loading && posts.length > 0 && filteredPosts.length === 0 ? (
          <p className="posts-muted">No posts match your filters.</p>
        ) : null}
        {!loading && filteredPosts.length > 0 ? (
          <table className="posts-table">
            <thead>
              <tr>
                <th className="posts-check">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    disabled={busy}
                    aria-label="Select all filtered posts"
                  />
                </th>
                <th>Title</th>
                <th>Slug</th>
                <th>Groups</th>
                <th>Tags</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post) => (
                <tr
                  key={post.id}
                  className={selectedIds.includes(post.id) ? 'posts-row--selected' : undefined}
                >
                  <td className="posts-check">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(post.id)}
                      onChange={() => toggleSelect(post.id)}
                      disabled={busy}
                      aria-label={`Select ${post.title}`}
                    />
                  </td>
                  <td>{post.title}</td>
                  <td className="posts-mono">{post.slug}</td>
                  <td>
                    {post.groups.length === 0
                      ? '—'
                      : post.groups.map((g) => g.title).join(', ')}
                  </td>
                  <td>
                    {post.tags.length === 0 ? '—' : post.tags.map((t) => t.title).join(', ')}
                  </td>
                  <td>
                    <span className={`posts-status posts-status--${post.status}`}>{post.status}</span>
                  </td>
                  <td>{formatDate(post.createdAt)}</td>
                  <td className="posts-actions">
                    <Link to={`/content/posts/${post.id}`}>Edit</Link>
                    <button type="button" onClick={() => handleDelete(post.id)}>
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
