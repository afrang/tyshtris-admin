import { useCallback, useEffect, useState } from 'react'
import {
  deleteCommentAdmin,
  listCommentsAdmin,
  updateCommentStatus,
  type CommentItem,
} from '../../lib/commentsApi'
import './PostCommentsModerator.css'

type Props = {
  postId: string
}

function flattenComments(items: CommentItem[], depth = 0): Array<CommentItem & { depth: number }> {
  const result: Array<CommentItem & { depth: number }> = []
  for (const item of items) {
    result.push({ ...item, depth })
    if (item.replies?.length) {
      result.push(...flattenComments(item.replies, depth + 1))
    }
  }
  return result
}

export function PostCommentsModerator({ postId }: Props) {
  const [comments, setComments] = useState<CommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listCommentsAdmin('blogpost', postId)
      setComments(list.comments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments.')
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    void load()
  }, [load])

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
    if (!window.confirm('Delete this comment?')) return
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

  const flat = flattenComments(comments)
  const pendingCount = flat.filter((c) => c.status === 'pending').length

  return (
    <div className="post-comments-mod">
      <div className="post-editor-card-head">
        <h2>Comments moderation</h2>
        <span>
          {pendingCount} pending · {flat.length} total
        </span>
      </div>

      {error ? <p className="post-comments-mod-error">{error}</p> : null}

      {loading ? (
        <p className="post-editor-muted">Loading comments…</p>
      ) : flat.length === 0 ? (
        <p className="post-editor-muted">No comments yet.</p>
      ) : (
        <ul className="post-comments-mod-list">
          {flat.map((comment) => (
            <li
              key={comment.id}
              className={`post-comments-mod-item status-${comment.status}`}
              style={{ marginInlineStart: `${comment.depth * 1.1}rem` }}
            >
              <div className="post-comments-mod-meta">
                <strong>{comment.authorDisplayName}</strong>
                <span className={`post-comments-mod-badge status-${comment.status}`}>
                  {comment.status}
                </span>
                <time>{new Date(comment.createdAt).toLocaleString()}</time>
              </div>
              {comment.authorEmail ? (
                <p className="post-comments-mod-email">{comment.authorEmail}</p>
              ) : null}
              <p className="post-comments-mod-body">{comment.body}</p>
              <div className="post-comments-mod-actions">
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
      )}

      <button type="button" className="post-comments-mod-refresh" onClick={() => void load()}>
        Refresh comments
      </button>
    </div>
  )
}
