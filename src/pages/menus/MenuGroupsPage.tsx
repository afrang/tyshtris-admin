import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { deleteMenuGroup, listMenuGroups, type MenuGroup } from '../../lib/menuApi'
import { LanguageTabs } from '../../components/LanguageTabs'
import { useLanguages } from '../../hooks/useLanguages'
import { confirmDialog } from '../../lib/swal'
import './MenuManager.css'

export function MenuGroupsPage() {
  const {
    languages,
    lang,
    setLang,
    direction,
    loading: langLoading,
    error: langError,
  } = useLanguages()
  const [groups, setGroups] = useState<MenuGroup[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh(activeLang: string) {
    setLoading(true)
    setError(null)
    try {
      setGroups(await listMenuGroups(activeLang))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu groups.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!lang) {
      if (!langLoading) {
        setGroups([])
        setLoading(false)
      }
      return
    }
    void refresh(lang)
  }, [lang, langLoading])

  async function handleDelete(id: string) {
    const confirmed = await confirmDialog({
      title: 'Delete menu group?',
      text: 'Delete all menu items in this group first. Empty groups can be removed.',
    })
    if (!confirmed || !lang) return
    setError(null)
    try {
      await deleteMenuGroup(id)
      await refresh(lang)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete menu group.')
    }
  }

  return (
    <section className="menu-manager">
      <div className="menu-manager-heading">
        <div>
          <p className="menu-manager-kicker">Navigation</p>
          <h1>Menu Manager</h1>
          <p>Create a menu group, then open it to build nested items and link targets.</p>
        </div>
        <Link to="/menus/new" className="menu-manager-btn">
          Add menu group
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

      {error ? <p className="menu-manager-error">{error}</p> : null}

      <div className="menu-manager-panel">
        <div className="menu-manager-panel-head">
          <div>
            <h2>Menu groups</h2>
            <p>{loading ? 'Loading…' : `${groups.length} group${groups.length === 1 ? '' : 's'}`}</p>
          </div>
        </div>

        <div className="menu-manager-panel-body">
          {loading ? <p className="menu-manager-hint">Loading menu groups…</p> : null}

          {!loading && groups.length === 0 ? (
            <div className="menu-empty">
              <h3>Start with a menu group</h3>
              <p>
                Groups represent places like header, footer, or mobile nav. Items and submenus are
                managed inside each group.
              </p>
              <Link to="/menus/new" className="menu-manager-btn">
                Create first group
              </Link>
            </div>
          ) : null}

          {!loading && groups.length > 0 ? (
            <ul className="menu-tree">
              {groups.map((group) => (
                <li key={group.id}>
                  <div className={`menu-tree-card${group.isActive ? '' : ' menu-tree-card--inactive'}`}>
                    <span className="menu-tree-level">M</span>
                    <div className="menu-tree-main">
                      <div className="menu-tree-title-row">
                        <strong>{group.title}</strong>
                        <span className="menu-chip menu-chip--muted">{group.key}</span>
                        <span className={`menu-chip ${group.isActive ? 'menu-chip--ok' : 'menu-chip--warn'}`}>
                          {group.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <span className="menu-tree-url">
                        sort {group.sortOrder}
                        {group.description ? ` · ${group.description}` : ''}
                      </span>
                    </div>
                    <div className="menu-tree-actions">
                      <Link to={`/menus/${group.id}`}>Open</Link>
                      <button type="button" onClick={() => void handleDelete(group.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  )
}
