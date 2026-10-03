import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { clearSession, getUser } from '../lib/auth'
import { UiLanguageSwitch, useUiLanguage, type UiMessageKey } from '../i18n/UiLanguage'
import './AdminLayout.css'

export type AdminOutletContext = {
  setSidebarOpen: (open: boolean) => void
}

export function useAdminShell() {
  return useOutletContext<AdminOutletContext>()
}

type NavChild = {
  to: string
  label: UiMessageKey
}

type NavItem = {
  to: string
  label: UiMessageKey
  icon: string
  end?: boolean
  children?: NavChild[]
}

const navItems: NavItem[] = [
  { to: '/', label: 'dashboard', icon: 'home', end: true },
  {
    to: '/content',
    label: 'content',
    icon: 'layers',
    children: [
      { to: '/content/blog-groups', label: 'blogGroups' },
      { to: '/content/posts', label: 'posts' },
      { to: '/content/comments', label: 'comments' },
      { to: '/content/tags', label: 'tags' },
    ],
  },
  {
    to: '/media',
    label: 'media',
    icon: 'image',
    children: [
      { to: '/media/galleries', label: 'galleries' },
    ],
  },
  { to: '/forms', label: 'forms', icon: 'list' },
  { to: '/requests', label: 'requests', icon: 'inbox' },
  { to: '/menus', label: 'menuManager', icon: 'menu' },
  { to: '/users', label: 'users', icon: 'users' },
  {
    to: '/settings',
    label: 'settings',
    icon: 'settings',
    children: [
      { to: '/settings/website', label: 'website' },
      { to: '/settings/languages', label: 'languages' },
    ],
  },
]

function NavIcon({ name }: { name: string }) {
  switch (name) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      )
    case 'layers':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 3 9 5-9 5-9-5 9-5Zm0 8.5 9 5-9 5-9-5 9-5Z" />
        </svg>
      )
    case 'image':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 11 3.5-4.5L13 15l2-2.5L19 16H7Z" />
        </svg>
      )
    case 'inbox':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h16a1 1 0 0 1 1 1v9.2a2 2 0 0 1-.8 1.6l-3.4 2.6a2 2 0 0 1-1.2.4H8.4a2 2 0 0 1-1.2-.4L3.8 16.8a2 2 0 0 1-.8-1.6V6a1 1 0 0 1 1-1Zm1 2v7.1l2.6 2H16.4l2.6-2V7H5Zm3.2 2.2h7.6v1.6H8.2V9.2Z" />
        </svg>
      )
    case 'list':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 7h12v2H8V7Zm0 4h12v2H8v-2Zm0 4h12v2H8v-2ZM4 7h2v2H4V7Zm0 4h2v2H4v-2Zm0 4h2v2H4v-2Z" />
        </svg>
      )
    case 'menu':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h10v2H4v-2Z" />
        </svg>
      )
    case 'users':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0v1H5v-1Z" />
        </svg>
      )
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm8.2 2.7-1.6-.3a6.7 6.7 0 0 0-.6-1.5l.9-1.4-1.4-1.4-1.4.9a6.7 6.7 0 0 0-1.5-.6l-.3-1.6h-2l-.3 1.6a6.7 6.7 0 0 0-1.5.6l-1.4-.9-1.4 1.4.9 1.4a6.7 6.7 0 0 0-.6 1.5l-1.6.3v2l1.6.3c.1.5.3 1 .6 1.5l-.9 1.4 1.4 1.4 1.4-.9c.5.3 1 .5 1.5.6l.3 1.6h2l.3-1.6c.5-.1 1-.3 1.5-.6l1.4.9 1.4-1.4-.9-1.4c.3-.5.5-1 .6-1.5l1.6-.3v-2Z" />
        </svg>
      )
    default:
      return null
  }
}

export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getUser()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { direction, t } = useUiLanguage()

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`admin-shell ${sidebarOpen ? '' : 'admin-shell--collapsed'}`} dir={direction}>
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img src="/logo-black.png" alt="Tishtrya" width={140} height={48} />
        </div>

        <div className="sidebar-user">
          <img src="/logo-white.png" alt="" className="sidebar-avatar" />
          <div>
            <strong>{user?.displayName ?? 'Admin'}</strong>
            <span>
              {user?.role === 'User' ? t('normalUser') : user?.role ?? t('admin')}
            </span>
          </div>
          <span className="sidebar-status" aria-label="Active" />
        </div>

        <nav className="sidebar-nav" aria-label="Main">
          {navItems.map((item) => {
            const hasChildren = Boolean(item.children?.length)
            const childActive = item.children?.some((child) =>
              location.pathname.startsWith(child.to),
            )
            const sectionOpen = hasChildren && (childActive || location.pathname.startsWith(item.to))

            return (
              <div key={item.to} className="sidebar-nav-group">
                <NavLink
                  to={hasChildren ? item.children![0].to : item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `sidebar-link${isActive || childActive ? ' sidebar-link--active' : ''}`
                  }
                >
                  <span>{t(item.label)}</span>
                  <NavIcon name={item.icon} />
                </NavLink>

                {hasChildren && sectionOpen ? (
                  <div className="sidebar-subnav">
                    {item.children!.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          `sidebar-sublink${isActive ? ' sidebar-sublink--active' : ''}`
                        }
                      >
                        {t(child.label)}
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <label className="topbar-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m16.7 15.3 4 4-1.4 1.4-4-4A7.5 7.5 0 1 1 16.7 15.3ZM11 16.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z" />
            </svg>
            <input type="search" placeholder={t('search')} />
          </label>

          <div className="topbar-actions">
            <UiLanguageSwitch compact />
            <button type="button" className="topbar-icon" title={t('signOut')} aria-label={t('signOut')} onClick={handleLogout}>
              <svg viewBox="0 0 24 24"><path d="M13 3h-2v10h2V3Zm4.8 2.2-1.4 1.4A6.95 6.95 0 0 1 19 12a7 7 0 1 1-10.4-6.1L7.2 5.2A9 9 0 1 0 21 12a8.95 8.95 0 0 0-3.2-6.8Z" /></svg>
            </button>
            <button
              type="button"
              className="topbar-icon"
              title={t('toggleSidebar')}
              aria-label={t('toggleSidebar')}
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24"><path d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z" /></svg>
            </button>
          </div>
        </header>

        <div className="admin-content">
          <Outlet context={{ setSidebarOpen } satisfies AdminOutletContext} />
        </div>
      </div>
    </div>
  )
}
