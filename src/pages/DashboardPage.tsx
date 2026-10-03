import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listBlogGroups, listBlogPosts, listTags, type BlogPostListItem } from '../lib/contentApi'
import { listGalleries, type GalleryListItem } from '../lib/galleryApi'
import { listMenuGroups } from '../lib/menuApi'
import { listUsers, type ManagedUser } from '../lib/usersApi'
import './DashboardPage.css'

type DayBucket = {
  label: string
  posts: number
  galleries: number
  users: number
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function buildLast7Days(posts: BlogPostListItem[], galleries: GalleryListItem[], users: ManagedUser[]): DayBucket[] {
  const today = startOfDay(new Date())
  const days: DayBucket[] = []

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today)
    day.setDate(today.getDate() - offset)
    const next = new Date(day)
    next.setDate(day.getDate() + 1)

    const inDay = (value: string) => {
      const t = new Date(value).getTime()
      return t >= day.getTime() && t < next.getTime()
    }

    days.push({
      label: day.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
      posts: posts.filter((p) => inDay(p.createdAt)).length,
      galleries: galleries.filter((g) => inDay(g.createdAt)).length,
      users: users.filter((u) => inDay(u.createdAtUtc)).length,
    })
  }

  return days
}

function toBarHeight(value: number, max: number): number {
  if (max <= 0) return 8
  return Math.max(8, Math.round((value / max) * 100))
}

export function DashboardPage() {
  const [posts, setPosts] = useState<BlogPostListItem[]>([])
  const [groups, setGroups] = useState(0)
  const [tags, setTags] = useState(0)
  const [galleries, setGalleries] = useState<GalleryListItem[]>([])
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [menus, setMenus] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [postRows, groupRows, tagRows, galleryRows, userRows, menuRows] = await Promise.all([
          listBlogPosts(),
          listBlogGroups(),
          listTags(),
          listGalleries(),
          listUsers(),
          listMenuGroups(),
        ])
        if (cancelled) return
        setPosts(postRows)
        setGroups(groupRows.length)
        setTags(tagRows.length)
        setGalleries(galleryRows)
        setUsers(userRows)
        setMenus(menuRows.length)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const publishedPosts = useMemo(
    () => posts.filter((p) => p.status.toLowerCase() === 'published').length,
    [posts],
  )
  const draftPosts = posts.length - publishedPosts
  const activeUsers = useMemo(() => users.filter((u) => u.isActive).length, [users])

  const activity = useMemo(() => buildLast7Days(posts, galleries, users), [posts, galleries, users])
  const activityMax = useMemo(
    () => Math.max(1, ...activity.flatMap((d) => [d.posts, d.galleries, d.users])),
    [activity],
  )

  const contentMix = useMemo(() => {
    const parts = [
      { key: 'posts', label: 'Posts', value: posts.length, color: '#ff80ab' },
      { key: 'groups', label: 'Blog Groups', value: groups, color: '#4fc3f7' },
      { key: 'galleries', label: 'Galleries', value: galleries.length, color: '#26a69a' },
      { key: 'tags', label: 'Tags', value: tags, color: '#b66dff' },
      { key: 'menus', label: 'Menus', value: menus, color: '#ffb74d' },
    ]
    const total = parts.reduce((sum, p) => sum + p.value, 0)
    let cursor = 0
    const segments = parts.map((part) => {
      const pct = total === 0 ? 0 : Math.round((part.value / total) * 100)
      const start = cursor
      cursor += pct
      return { ...part, pct, start, end: cursor }
    })
    if (segments.length && total > 0 && cursor < 100) {
      segments[segments.length - 1].end = 100
      segments[segments.length - 1].pct += 100 - cursor
    }
    return { total, segments }
  }, [posts.length, groups, galleries.length, tags, menus])

  const donutBackground =
    contentMix.total === 0
      ? '#e8e9ef'
      : `conic-gradient(${contentMix.segments
          .map((s) => `${s.color} ${s.start}% ${s.end}%`)
          .join(', ')})`

  return (
    <section className="dash">
      <div className="dash-heading">
        <div className="dash-heading-left">
          <span className="dash-home-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
            </svg>
          </span>
          <h1>Dashboard</h1>
        </div>
        <a className="dash-overview" href="#overview">
          Overview
          <span aria-hidden="true">i</span>
        </a>
      </div>

      {error ? <p className="dash-error">{error}</p> : null}
      {loading ? <p className="dash-status">Loading current CMS data…</p> : null}

      <div className="stat-grid">
        <article className="stat-card stat-card--sales">
          <div className="stat-card-top">
            <p>Blog Posts</p>
            <span className="stat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5 4h14v2H5V4Zm0 4h14v12H5V8Zm2 2v8h10v-8H7Z" />
              </svg>
            </span>
          </div>
          <strong>{loading ? '—' : posts.length.toLocaleString()}</strong>
          <span>
            {loading
              ? 'Fetching posts'
              : `${publishedPosts.toLocaleString()} published · ${draftPosts.toLocaleString()} draft`}
          </span>
        </article>

        <article className="stat-card stat-card--orders">
          <div className="stat-card-top">
            <p>Galleries</p>
            <span className="stat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4 5h16v14H4V5Zm2 2v7l3.5-3.5 2.5 2.5L16 9l2 2V7H6Zm2.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
              </svg>
            </span>
          </div>
          <strong>{loading ? '—' : galleries.length.toLocaleString()}</strong>
          <span>
            {loading ? 'Fetching media' : `${groups.toLocaleString()} blog groups · ${tags.toLocaleString()} tags`}
          </span>
        </article>

        <article className="stat-card stat-card--visitors">
          <div className="stat-card-top">
            <p>Users</p>
            <span className="stat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14Z" />
              </svg>
            </span>
          </div>
          <strong>{loading ? '—' : users.length.toLocaleString()}</strong>
          <span>
            {loading
              ? 'Fetching users'
              : `${activeUsers.toLocaleString()} active · ${menus.toLocaleString()} menu groups`}
          </span>
        </article>
      </div>

      <div className="chart-grid" id="overview">
        <article className="panel-card chart-card">
          <header className="panel-card-header">
            <h2>Content Activity (7 days)</h2>
            <div className="legend">
              <span className="legend-item legend-item--chn">Posts</span>
              <span className="legend-item legend-item--usa">Galleries</span>
              <span className="legend-item legend-item--uk">Users</span>
            </div>
          </header>

          <div className="bar-chart" role="img" aria-label="Content activity bar chart for the last 7 days">
            {activity.map((day) => (
              <div className="bar-group" key={day.label}>
                <div className="bars">
                  <span
                    style={{ height: `${toBarHeight(day.posts, activityMax)}%` }}
                    className="bar bar--chn"
                    title={`${day.posts} posts`}
                  />
                  <span
                    style={{ height: `${toBarHeight(day.galleries, activityMax)}%` }}
                    className="bar bar--usa"
                    title={`${day.galleries} galleries`}
                  />
                  <span
                    style={{ height: `${toBarHeight(day.users, activityMax)}%` }}
                    className="bar bar--uk"
                    title={`${day.users} users`}
                  />
                </div>
                <small>{day.label}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card traffic-card">
          <header className="panel-card-header">
            <h2>Content Mix</h2>
          </header>

          <div className="donut-wrap">
            <div
              className="donut"
              role="img"
              aria-label="Content mix donut chart"
              style={{ background: donutBackground }}
            >
              <div className="donut-hole">
                <strong>{contentMix.total}</strong>
                <span>items</span>
              </div>
            </div>
          </div>

          <ul className="traffic-legend">
            {contentMix.segments.map((segment) => (
              <li key={segment.key}>
                <span className="swatch" style={{ background: segment.color }} />
                {segment.label}
                <strong>{loading ? '—' : `${segment.pct}%`}</strong>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="panel-card recent-card">
        <header className="panel-card-header">
          <h2>Recent Posts</h2>
          <Link to="/content/posts" className="dash-link">
            View all
          </Link>
        </header>
        {loading ? (
          <p className="dash-status">Loading posts…</p>
        ) : posts.length === 0 ? (
          <p className="dash-status">No posts yet.</p>
        ) : (
          <ul className="recent-list">
            {[...posts]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 6)
              .map((post) => (
                <li key={post.id}>
                  <div>
                    <Link to={`/content/posts/${post.id}`}>{post.title}</Link>
                    <small>{new Date(post.createdAt).toLocaleString()}</small>
                  </div>
                  <span className={`status-pill status-pill--${post.status.toLowerCase()}`}>
                    {post.status}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </article>
    </section>
  )
}
