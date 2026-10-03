import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteCommentAdmin,
  listAllCommentsAdmin,
  updateCommentStatus,
  type AdminCommentListItem,
} from '../../lib/commentsApi'
import './CommentsPage.css'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export function CommentsPage() {
  const [items, setItems] = useState<AdminCommentListItem[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [approvedCount, setApprovedCount] = useState(0)
  const [rejectedCount, setRejectedCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listAllCommentsAdmin({
        status: statusFilter === 'all' ? undefined : statusFilter,
        q: searchQuery.trim() || undefined,
      })
      setItems(list.items)
      setPendingCount(list.pendingCount)
      setApprovedCount(list.approvedCount)
      setRejectedCount(list.rejectedCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load()
    }, searchQuery ? 250 : 0)
    return () => window.clearTimeout(handle)
  }, [load, searchQuery])

  const totals = useMemo(
    () => [
      { key: 'all' as const, label: 'All', count: pendingCount + approvedCount + rejectedCount },
      { key: 'pending' as const, label: 'Pending', count: pendingCount },
      { key: 'approved' as const, label: 'Approved', count: approvedCount },
      { key: 'rejected' as const, label: 'Rejected', count: rejectedCount },
    ],
    [pendingCount, approvedCount, rejectedCount],
  )

  async function setStatus(commentId: string, status: 'pending' | 'approved' | 'rejected') {
    setBusyId(commentId)
    setError(null)
    try {
      await updateCommentStatus(commentId, status)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment.')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(commentId: string) {
    if (!window.confirm('Delete this comment permanently?')) return
    setBusyId(commentId)
    setError(null)
    try {
      await deleteCommentAdmin(commentId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="comments-page">
      <div className="comments-heading">
        <div>
          <h1>Comments</h1>
          <p>Review, approve, and moderate comments from the public site.</p>
        </div>
        <button type="button" className="comments-refresh-btn" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <div className="comments-stats" role="tablist" aria-label="Comment status filters">
        {totals.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={statusFilter === item.key}
            className={`comments-stat${statusFilter === item.key ? ' is-active' : ''}`}
            onClick={() => setStatusFilter(item.key)}
          >
            <strong>{item.count}</strong>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="comments-controls">
        <input
          type="search"
          className="comments-search"
          placeholder="Search by author, email, or comment…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {error ? <p className="comments-error">{error}</p> : null}

      <div className="comments-table-wrap">
        {loading ? <p className="comments-muted">Loading…</p> : null}
        {!loading && items.length === 0 ? (
          <p className="comments-muted">No comments match this filter.</p>
        ) : null}
        {!loading && items.length > 0 ? (
          <ul className="comments-list">
            {items.map((comment) => (
              <li key={comment.id} className={`comments-card status-${comment.status}`}>
                <div className="comments-card-top">
                  <div className="comments-card-author">
                    <strong>{comment.authorDisplayName}</strong>
                    {comment.authorEmail ? <span>{comment.authorEmail}</span> : null}
                  </div>
                  <span className={`comments-badge status-${comment.status}`}>{comment.status}</span>
                </div>

                <p className="comments-body">{comment.body}</p>

                <div className="comments-card-meta">
                  <span>{formatDate(comment.createdAt)}</span>
                  <span className="comments-dot" aria-hidden="true">
                    ·
                  </span>
                  <span className="comments-mono">{comment.component}</span>
                  {comment.parentTitle ? (
                    <>
                      <span className="comments-dot" aria-hidden="true">
                        ·
                      </span>
                      {comment.component === 'blogpost' ? (
                        <Link to={`/content/posts/${comment.parentId}`} className="comments-parent-link">
                          {comment.parentTitle}
                        </Link>
                      ) : (
                        <span>{comment.parentTitle}</span>
                      )}
                    </>
                  ) : null}
                  {comment.parentCommentId ? (
                    <>
                      <span className="comments-dot" aria-hidden="true">
                        ·
                      </span>
                      <span>Reply</span>
                    </>
                  ) : null}
                </div>

                <div className="comments-actions">
                  {comment.status !== 'approved' ? (
                    <button
                      type="button"
                      disabled={busyId === comment.id}
                      onClick={() => void setStatus(comment.id, 'approved')}
                    >
                      Approve
                    </button>
                  ) : null}
                  {comment.status !== 'rejected' ? (
                    <button
                      type="button"
                      className="is-warn"
                      disabled={busyId === comment.id}
                      onClick={() => void setStatus(comment.id, 'rejected')}
                    >
                      Reject
                    </button>
                  ) : null}
                  {comment.status !== 'pending' ? (
                    <button
                      type="button"
                      className="is-muted"
                      disabled={busyId === comment.id}
                      onClick={() => void setStatus(comment.id, 'pending')}
                    >
                      Mark pending
                    </button>
                  ) : null}
                  {comment.component === 'blogpost' ? (
                    <Link to={`/content/posts/${comment.parentId}`} className="comments-link-btn">
                      Open post
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="is-danger"
                    disabled={busyId === comment.id}
                    onClick={() => void remove(comment.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}
