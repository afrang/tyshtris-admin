import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  deleteBlogGroup,
  getBlogGroupTree,
  type BlogGroupTree,
} from '../../lib/contentApi'
import { LanguageTabs } from '../../components/LanguageTabs'
import { useLanguages } from '../../hooks/useLanguages'
import { confirmDialog } from '../../lib/swal'
import './BlogGroupsPage.css'

const contentShortcuts = [
  {
    to: '/content/posts/new',
    label: 'New Post',
    description: 'Write a blog post',
    icon: 'post',
  },
  {
    to: '/content/blog-groups/new',
    label: 'New Group',
    description: 'Create a content group',
    icon: 'group-add',
  },
  {
    to: '/content/blog-groups',
    label: 'Groups',
    description: 'Browse group hierarchy',
    icon: 'groups',
  },
  {
    to: '/content/posts',
    label: 'Posts',
    description: 'Manage all posts',
    icon: 'posts',
  },
  {
    to: '/content/tags',
    label: 'Tags',
    description: 'Organize with tags',
    icon: 'tags',
  },
] as const

function ShortcutIcon({ name }: { name: (typeof contentShortcuts)[number]['icon'] }) {
  switch (name) {
    case 'post':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 3h10l4 4v14H5V3Zm9 1.5V8h3.5L14 4.5ZM7 11h10v2H7v-2Zm0 4h7v2H7v-2Z" />
        </svg>
      )
    case 'group-add':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 5v6H5v2h6v6h2v-6h6v-2h-6V5h-2Z" />
        </svg>
      )
    case 'groups':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 3 9 5-9 5-9-5 9-5Zm0 8.5 9 5-9 5-9-5 9-5Z" />
        </svg>
      )
    case 'posts':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 4h14v2H5V4Zm0 4h14v12H5V8Zm2 2v8h10v-8H7Z" />
        </svg>
      )
    case 'tags':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12.5 11.5 4H20v8.5L11.5 21 3 12.5ZM16.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        </svg>
      )
    default:
      return null
  }
}

function TreeList({
  nodes,
  depth = 0,
  onDelete,
}: {
  nodes: BlogGroupTree[]
  depth?: number
  onDelete: (id: string) => void
}) {
  if (nodes.length === 0) return null

  return (
    <ul className="blog-group-tree" style={{ ['--depth' as string]: depth }}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="blog-group-row">
            <div>
              <strong>{node.title}</strong>
              <span className="blog-group-meta">
                {node.slug} · {node.id}
              </span>
            </div>
            <div className="blog-group-actions">
              <Link
                to={`/content/blog-groups/new?parentId=${encodeURIComponent(node.id)}`}
                className="blog-group-add-child"
              >
                Add subgroup
              </Link>
              <Link to={`/content/blog-groups/${node.id}`} className="blog-group-edit">
                Edit
              </Link>
              <button type="button" className="blog-group-delete" onClick={() => onDelete(node.id)}>
                Delete
              </button>
            </div>
          </div>
          <TreeList nodes={node.children} depth={depth + 1} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  )
}

export function BlogGroupsPage() {
  const location = useLocation()
  const {
    languages,
    lang,
    setLang,
    direction,
    loading: langLoading,
    error: langError,
  } = useLanguages()
  const [tree, setTree] = useState<BlogGroupTree[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh(activeLang: string) {
    setLoading(true)
    setError(null)
    try {
      setTree(await getBlogGroupTree(activeLang))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blog groups.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!lang) {
      if (!langLoading) {
        setTree([])
        setLoading(false)
      }
      return
    }
    void refresh(lang)
  }, [lang, langLoading])

  async function handleDelete(id: string) {
    const confirmed = await confirmDialog({
      title: 'Delete blog group?',
      text: 'This group and its relations will be permanently removed.',
    })
    if (!confirmed || !lang) return
    setError(null)
    try {
      await deleteBlogGroup(id)
      await refresh(lang)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete blog group.')
    }
  }

  return (
    <section className="blog-groups">
      <div className="blog-groups-heading">
        <div>
          <h1>Blog Groups</h1>
          <p>Hierarchical content groups using GUID identifiers. Root groups have no parent.</p>
        </div>
        <Link to="/content/blog-groups/new" className="blog-groups-primary-btn">
          Add group
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

      <nav className="blog-groups-shortcuts" aria-label="Content shortcuts">
        {contentShortcuts.map((item) => {
          const isActive =
            item.to === '/content/blog-groups'
              ? location.pathname === '/content/blog-groups'
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`blog-groups-shortcut${isActive ? ' blog-groups-shortcut--active' : ''}`}
            >
              <span className="blog-groups-shortcut-icon">
                <ShortcutIcon name={item.icon} />
              </span>
              <span className="blog-groups-shortcut-text">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </Link>
          )
        })}
      </nav>

      {error ? <p className="blog-groups-error">{error}</p> : null}

      <div className="blog-groups-list blog-groups-list--full">
        <h2>Hierarchy</h2>
        {loading ? <p className="blog-groups-muted">Loading…</p> : null}
        {!loading && tree.length === 0 ? (
          <p className="blog-groups-muted">No blog groups yet.</p>
        ) : null}
        {!loading ? <TreeList nodes={tree} onDelete={handleDelete} /> : null}
      </div>
    </section>
  )
}
