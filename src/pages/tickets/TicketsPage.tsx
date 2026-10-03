import { useCallback, useEffect, useState } from 'react'
import { useUiLanguage } from '../../i18n/UiLanguage'
import {
  getTicket,
  listTickets,
  replyTicket,
  setTicketStatus,
  type TicketDetail,
  type TicketListItem,
} from '../../lib/ticketsApi'
import './TicketsPage.css'

const CATEGORIES = ['', 'news', 'event', 'support', 'human_rights', 'other'] as const
const STATUSES = ['', 'open', 'answered', 'closed'] as const

const copy = {
  en: {
    title: 'Requests',
    lead: 'News, events, support, human rights, and other notes sent from user accounts.',
    allTopics: 'All topics',
    news: 'News',
    event: 'Event',
    support: 'Support',
    humanRights: 'Human rights',
    other: 'Other',
    all: 'All',
    open: 'Open',
    answered: 'Answered',
    closed: 'Closed',
    empty: 'No requests in this view.',
    pick: 'Select a request to read it and reply.',
    from: 'From',
    editors: 'Editors',
    reply: 'Reply',
    send: 'Send reply',
    sending: 'Sending…',
    markOpen: 'Mark open',
    markAnswered: 'Mark answered',
    markClosed: 'Close',
    replies: 'replies',
    failed: 'Could not load requests.',
  },
  fa: {
    title: 'درخواست‌ها',
    lead: 'خبر، رویداد، پشتیبانی، حقوق بشر و سایر پیام‌هایی که از حساب کاربران می‌رسد.',
    allTopics: 'همه موضوع‌ها',
    news: 'خبر',
    event: 'رویداد',
    support: 'پشتیبانی',
    humanRights: 'حقوق بشر',
    other: 'سایر',
    all: 'همه',
    open: 'باز',
    answered: 'پاسخ‌داده‌شده',
    closed: 'بسته',
    empty: 'در این نما درخواستی نیست.',
    pick: 'یک درخواست را انتخاب کنید تا بخوانید و پاسخ دهید.',
    from: 'از',
    editors: 'سردبیران',
    reply: 'پاسخ',
    send: 'ارسال پاسخ',
    sending: 'در حال ارسال…',
    markOpen: 'باز کردن',
    markAnswered: 'علامت پاسخ',
    markClosed: 'بستن',
    replies: 'پاسخ',
    failed: 'بارگذاری درخواست‌ها ناموفق بود.',
  },
} as const

function labelFor(locale: 'en' | 'fa', value: string): string {
  const text = copy[locale]
  if (value === 'news') return text.news
  if (value === 'event') return text.event
  if (value === 'support') return text.support
  if (value === 'human_rights') return text.humanRights
  if (value === 'other') return text.other
  if (value === 'open') return text.open
  if (value === 'answered') return text.answered
  if (value === 'closed') return text.closed
  return value
}

export function TicketsPage() {
  const { locale } = useUiLanguage()
  const text = copy[locale]
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('open')
  const [items, setItems] = useState<TicketListItem[]>([])
  const [counts, setCounts] = useState({ total: 0, open: 0, answered: 0, closed: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TicketDetail | null>(null)
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listTickets({
        category: category || undefined,
        status: status || undefined,
      })
      setItems(list.items)
      setCounts({
        total: list.total,
        open: list.openCount,
        answered: list.answeredCount,
        closed: list.closedCount,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : text.failed)
    } finally {
      setLoading(false)
    }
  }, [category, status, text.failed])

  useEffect(() => {
    void load()
  }, [load])

  async function openItem(id: string) {
    setSelectedId(id)
    setError(null)
    setBusy(true)
    try {
      const next = await getTicket(id)
      setDetail(next)
      setReply('')
    } catch (err) {
      setError(err instanceof Error ? err.message : text.failed)
    } finally {
      setBusy(false)
    }
  }

  async function sendReply() {
    if (!detail || reply.trim().length === 0) return
    setBusy(true)
    setError(null)
    try {
      const next = await replyTicket(detail.id, reply.trim())
      setDetail(next)
      setReply('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : text.failed)
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus(nextStatus: string) {
    if (!detail) return
    setBusy(true)
    setError(null)
    try {
      const next = await setTicketStatus(detail.id, nextStatus)
      setDetail(next)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : text.failed)
    } finally {
      setBusy(false)
    }
  }

  const statusFilters = [
    { key: '', label: text.all, count: counts.total },
    { key: 'open', label: text.open, count: counts.open },
    { key: 'answered', label: text.answered, count: counts.answered },
    { key: 'closed', label: text.closed, count: counts.closed },
  ]

  return (
    <section className="tickets-page">
      <div className="tickets-heading">
        <h1>{text.title}</h1>
        <p>{text.lead}</p>
      </div>

      <div className="tickets-filters" role="tablist" aria-label={text.title}>
        {CATEGORIES.map((value) => (
          <button
            key={value || 'all-topics'}
            type="button"
            className={category === value ? 'is-active' : ''}
            onClick={() => setCategory(value)}
          >
            {value ? labelFor(locale, value) : text.allTopics}
          </button>
        ))}
      </div>

      <div className="tickets-filters">
        {statusFilters.map((item) => (
          <button
            key={item.key || 'all-status'}
            type="button"
            className={status === item.key ? 'is-active' : ''}
            onClick={() => setStatus(item.key)}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      {error ? <p className="tickets-error">{error}</p> : null}

      <div className="tickets-layout">
        <div className="tickets-list">
          {loading ? <p className="tickets-empty">…</p> : null}
          {!loading && items.length === 0 ? <p className="tickets-empty">{text.empty}</p> : null}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ticket-row${selectedId === item.id ? ' is-selected' : ''}`}
              onClick={() => void openItem(item.id)}
            >
              <strong>{item.title}</strong>
              <span>
                {labelFor(locale, item.category)} · {labelFor(locale, item.status)} · {item.replyCount} {text.replies}
              </span>
              <span>
                {text.from} {item.authorName} · {item.authorEmail}
              </span>
            </button>
          ))}
        </div>

        <div className="tickets-detail">
          {!detail ? <p className="tickets-empty">{text.pick}</p> : null}
          {detail ? (
            <>
              <p className="tickets-meta">
                {labelFor(locale, detail.category)} · {labelFor(locale, detail.status)}
              </p>
              <h2>{detail.title}</h2>
              <p className="tickets-meta">
                {text.from} {detail.authorName} · {detail.authorEmail}
              </p>
              <p className="tickets-body">{detail.body}</p>
              <div className="tickets-actions">
                {STATUSES.filter(Boolean).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={detail.status === value ? 'is-active' : ''}
                    disabled={busy}
                    onClick={() => void changeStatus(value)}
                  >
                    {value === 'open' ? text.markOpen : value === 'answered' ? text.markAnswered : text.markClosed}
                  </button>
                ))}
              </div>
              {detail.replies.map((item) => (
                <article key={item.id} className={`ticket-reply${item.fromStaff ? '' : ' is-user'}`}>
                  <strong>{item.fromStaff ? text.editors : item.authorName}</strong>
                  <p>{item.body}</p>
                </article>
              ))}
              <div className="tickets-reply">
                <label>
                  {text.reply}
                  <textarea value={reply} maxLength={4000} onChange={(event) => setReply(event.target.value)} />
                </label>
                <button type="button" disabled={busy || reply.trim().length === 0} onClick={() => void sendReply()}>
                  {busy ? text.sending : text.send}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}
