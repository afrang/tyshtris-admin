import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createMenuGroup,
  deleteMenuItem,
  getMenuGroup,
  getMenuItemTree,
  reorderMenuItems,
  updateMenuGroup,
  type MenuItemTree,
  type MenuLinkFunction,
} from '../../lib/menuApi'
import { LanguageTabs, LocalizedFields } from '../../components/LanguageTabs'
import { useLanguages } from '../../hooks/useLanguages'
import { confirmDialog } from '../../lib/swal'
import './MenuManager.css'

function keyify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function countItems(nodes: MenuItemTree[]): number {
  return nodes.reduce((total, node) => total + 1 + countItems(node.children), 0)
}

function collectIds(nodes: MenuItemTree[]): string[] {
  return nodes.flatMap((node) => [node.id, ...collectIds(node.children)])
}

function findNode(nodes: MenuItemTree[], id: string): MenuItemTree | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return null
}

function collectAncestorIds(nodes: MenuItemTree[], id: string, trail: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.id === id) return trail
    const found = collectAncestorIds(node.children, id, [...trail, node.id])
    if (found) return found
  }
  return null
}

function itemsByDepth(nodes: MenuItemTree[], depth = 1, acc: { id: string; depth: number }[] = []) {
  for (const node of nodes) {
    acc.push({ id: node.id, depth })
    itemsByDepth(node.children, depth + 1, acc)
  }
  return acc
}

function functionChipClass(fn: MenuLinkFunction): string {
  if (fn === 'GroupBlog') return 'menu-chip menu-chip--blog'
  if (fn === 'Post') return 'menu-chip menu-chip--post'
  if (fn === 'Gallery') return 'menu-chip menu-chip--gallery'
  return 'menu-chip menu-chip--custom'
}

function applySiblingOrder(
  nodes: MenuItemTree[],
  parentId: string | null,
  orderedIds: string[],
): MenuItemTree[] {
  if (parentId === null) {
    const byId = new Map(nodes.map((node) => [node.id, node]))
    return orderedIds
      .map((id, index) => {
        const node = byId.get(id)
        return node ? { ...node, sortOrder: index + 1 } : null
      })
      .filter((node): node is MenuItemTree => Boolean(node))
  }

  return nodes.map((node) => {
    if (node.id === parentId) {
      const byId = new Map(node.children.map((child) => [child.id, child]))
      return {
        ...node,
        children: orderedIds
          .map((id, index) => {
            const child = byId.get(id)
            return child ? { ...child, sortOrder: index + 1 } : null
          })
          .filter((child): child is MenuItemTree => Boolean(child)),
      }
    }

    return {
      ...node,
      children: applySiblingOrder(node.children, parentId, orderedIds),
    }
  })
}

function ItemTree({
  nodes,
  groupId,
  parentId = null,
  depth = 1,
  reordering,
  deleting,
  dragKey,
  selectedIds,
  onToggleSelect,
  onDelete,
  onMove,
  onDragStart,
  onDrop,
}: {
  nodes: MenuItemTree[]
  groupId: string
  parentId?: string | null
  depth?: number
  reordering: boolean
  deleting: boolean
  dragKey: string | null
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onDelete: (id: string) => void
  onMove: (parentId: string | null, index: number, direction: -1 | 1) => void
  onDragStart: (key: string) => void
  onDrop: (parentId: string | null, targetIndex: number) => void
}) {
  if (nodes.length === 0) return null

  return (
    <ul className="menu-tree">
      {nodes.map((node, index) => {
        const key = `${parentId ?? 'root'}:${node.id}`
        const isDragging = dragKey === key
        const isSelected = selectedIds.includes(node.id)

        return (
          <li key={node.id}>
            <div
              className={`menu-tree-card${node.isActive ? '' : ' menu-tree-card--inactive'}${
                isDragging ? ' menu-tree-card--dragging' : ''
              }${isSelected ? ' menu-tree-card--selected' : ''}`}
              draggable={!reordering && !deleting}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', key)
                onDragStart(key)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                onDrop(parentId, index)
              }}
            >
              <div className="menu-tree-lead">
                <label className="menu-tree-check">
                  <input
                    type="checkbox"
                    draggable
                    checked={isSelected}
                    disabled={deleting}
                    aria-label={`Select ${node.title}`}
                    onDragStart={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                    onChange={() => onToggleSelect(node.id)}
                  />
                </label>
                <span className="menu-tree-grip" title="Drag to reorder" aria-hidden="true">
                  ⋮⋮
                </span>
                <span className="menu-tree-level" title={`Level ${depth}`}>
                  L{depth}
                </span>
              </div>

              <div className="menu-tree-main">
                <div className="menu-tree-title-row">
                  <strong>{node.title}</strong>
                  <span className={functionChipClass(node.function)}>{node.function}</span>
                  {node.isMegaMenu ? <span className="menu-chip menu-chip--mega">Mega</span> : null}
                  {!node.isActive ? <span className="menu-chip menu-chip--warn">Inactive</span> : null}
                </div>
                <code className="menu-tree-url">{node.url}</code>
              </div>

              <div className="menu-tree-actions">
                <div className="menu-tree-order">
                  <button
                    type="button"
                    className="menu-tree-order-btn"
                    title="Move up"
                    aria-label={`Move ${node.title} up`}
                    disabled={reordering || index === 0}
                    onClick={() => onMove(parentId, index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="menu-tree-order-btn"
                    title="Move down"
                    aria-label={`Move ${node.title} down`}
                    disabled={reordering || index === nodes.length - 1}
                    onClick={() => onMove(parentId, index, 1)}
                  >
                    ↓
                  </button>
                </div>
                {depth < 3 ? (
                  <Link
                    className="menu-tree-child"
                    to={`/menus/${groupId}/items/new?parentId=${node.id}`}
                  >
                    Add child
                  </Link>
                ) : null}
                <Link to={`/menus/${groupId}/items/${node.id}`}>Edit</Link>
                <button type="button" onClick={() => onDelete(node.id)} disabled={deleting}>
                  Delete
                </button>
              </div>
            </div>

            <ItemTree
              nodes={node.children}
              groupId={groupId}
              parentId={node.id}
              depth={depth + 1}
              reordering={reordering}
              deleting={deleting}
              dragKey={dragKey}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onDelete={onDelete}
              onMove={onMove}
              onDragStart={onDragStart}
              onDrop={onDrop}
            />
          </li>
        )
      })}
    </ul>
  )
}

export function MenuGroupEditorPage() {
  const { groupId } = useParams()
  const isEdit = Boolean(groupId)
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
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [tree, setTree] = useState<MenuItemTree[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(!isEdit)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectAllRef = useRef<HTMLInputElement>(null)

  const itemCount = useMemo(() => countItems(tree), [tree])
  const allIds = useMemo(() => collectIds(tree), [tree])
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id))

  async function loadItems(id: string, activeLang: string) {
    setTree(await getMenuItemTree(id, activeLang))
  }

  useEffect(() => {
    if (!lang) {
      if (!langLoading) setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)
      setSuccess(null)
      setSelectedIds([])
      try {
        if (groupId) {
          const group = await getMenuGroup(groupId, lang)
          setTitle(group.title)
          setKey(group.key)
          setDescription(group.description ?? '')
          setSortOrder(group.sortOrder)
          setIsActive(group.isActive)
          setSettingsOpen(false)
          await loadItems(groupId, lang)
        } else {
          setSettingsOpen(true)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load menu group.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [groupId, lang, langLoading])

  useEffect(() => {
    const valid = new Set(allIds)
    setSelectedIds((prev) => {
      const next = prev.filter((id) => valid.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [allIds])

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedIds.length > 0 && !allSelected
    }
  }, [selectedIds, allSelected])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!lang) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const payload = {
        title,
        key: key || keyify(title),
        description: description || null,
        sortOrder,
        isActive,
      }

      if (isEdit && groupId) {
        await updateMenuGroup(groupId, payload, lang)
        setSuccess('Group settings saved.')
      } else {
        const created = await createMenuGroup(payload, lang)
        navigate(`/menus/${created.id}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save menu group.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteItem(id: string) {
    const confirmed = await confirmDialog({
      title: 'Delete menu item?',
      text: 'Child items must be deleted first.',
    })
    if (!confirmed || !groupId || !lang) return
    setError(null)
    setSuccess(null)
    setDeleting(true)
    try {
      await deleteMenuItem(id)
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id))
      await loadItems(groupId, lang)
      setSuccess('Menu item deleted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete menu item.')
    } finally {
      setDeleting(false)
    }
  }

  // Selecting a parent also selects its children, because the API rejects a parent
  // that still has children. Deselecting an item clears it and its ancestors.
  function toggleSelect(id: string) {
    const node = findNode(tree, id)
    if (!node) return
    const branchIds = collectIds([node])
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const ancestors = collectAncestorIds(tree, id) ?? []
        const remove = new Set([id, ...ancestors])
        return prev.filter((selectedId) => !remove.has(selectedId))
      }
      return Array.from(new Set([...prev, ...branchIds]))
    })
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : allIds)
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0 || !groupId || !lang || deleting) return
    const count = selectedIds.length
    const confirmed = await confirmDialog({
      title: 'Delete selected menu items?',
      text: `${count} menu item${count === 1 ? '' : 's'} will be permanently removed.`,
    })
    if (!confirmed) return

    setError(null)
    setSuccess(null)
    setDeleting(true)
    try {
      const selected = new Set(selectedIds)
      const ordered = itemsByDepth(tree)
        .filter((item) => selected.has(item.id))
        .sort((a, b) => b.depth - a.depth)
      const failures: string[] = []
      const deleted = new Set<string>()
      for (const item of ordered) {
        try {
          await deleteMenuItem(item.id)
          deleted.add(item.id)
        } catch (err) {
          failures.push(err instanceof Error ? err.message : item.id)
        }
      }
      if (failures.length > 0) {
        setError(`Failed to delete ${failures.length} of ${ordered.length} item(s). ${failures[0]}`)
        setSelectedIds((prev) => prev.filter((id) => !deleted.has(id)))
      } else {
        setSelectedIds([])
        setSuccess(count === 1 ? 'Menu item deleted.' : `${count} menu items deleted.`)
      }
      await loadItems(groupId, lang)
    } finally {
      setDeleting(false)
    }
  }

  function getSiblings(parentId: string | null): MenuItemTree[] {
    if (parentId === null) return tree

    const stack = [...tree]
    while (stack.length) {
      const current = stack.pop()!
      if (current.id === parentId) return current.children
      stack.push(...current.children)
    }
    return []
  }

  async function persistSiblingOrder(parentId: string | null, nextSiblings: MenuItemTree[]) {
    const previous = tree
    const orderedIds = nextSiblings.map((item) => item.id)
    setTree(applySiblingOrder(tree, parentId, orderedIds))
    setReordering(true)
    setError(null)
    try {
      await reorderMenuItems(
        nextSiblings.map((item, index) => ({
          id: item.id,
          sortOrder: index + 1,
        })),
      )
    } catch (err) {
      setTree(previous)
      setError(err instanceof Error ? err.message : 'Failed to update order.')
    } finally {
      setReordering(false)
      setDragKey(null)
    }
  }

  async function handleMove(parentId: string | null, index: number, direction: -1 | 1) {
    const siblings = getSiblings(parentId)
    const target = index + direction
    if (target < 0 || target >= siblings.length) return
    const next = [...siblings]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    await persistSiblingOrder(parentId, next)
  }

  function handleDragStart(key: string) {
    setDragKey(key)
  }

  async function handleDrop(parentId: string | null, targetIndex: number) {
    if (!dragKey) return
    const [dragParentKey, dragId] = dragKey.split(':')
    const sourceParentId = dragParentKey === 'root' ? null : dragParentKey
    if (sourceParentId !== parentId) {
      setDragKey(null)
      return
    }

    const siblings = getSiblings(parentId)
    const fromIndex = siblings.findIndex((item) => item.id === dragId)
    if (fromIndex < 0 || fromIndex === targetIndex) {
      setDragKey(null)
      return
    }

    const next = [...siblings]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(targetIndex, 0, moved)
    await persistSiblingOrder(parentId, next)
  }

  if (langLoading || (lang && loading && isEdit)) {
    return (
      <section className="menu-manager">
        <div className="menu-manager-loading">Loading menu group…</div>
      </section>
    )
  }

  return (
    <section className="menu-manager">
      <p className="menu-manager-crumb">
        <Link to="/menus">Menu Manager</Link>
        <span>/</span>
        <span>{isEdit ? title || 'Group' : 'New group'}</span>
      </p>

      <div className="menu-manager-heading">
        <div>
          <p className="menu-manager-kicker">Menu Manager</p>
          <h1>{isEdit ? title || 'Menu group' : 'Create menu group'}</h1>
          {!isEdit ? (
            <p>Name the menu first. After creating it, you can add nested items.</p>
          ) : null}
        </div>
        <div className="menu-manager-heading-actions">
          <Link to="/menus" className="menu-manager-back">
            Back to list
          </Link>
          {isEdit && groupId ? (
            <Link to={`/menus/${groupId}/items/new`} className="menu-manager-btn">
              Add menu item
            </Link>
          ) : (
            <button
              type="submit"
              form="menu-group-editor-form"
              className="menu-manager-btn"
              disabled={saving || !hasLanguages}
            >
              {saving ? 'Creating…' : 'Create group'}
            </button>
          )}
        </div>
      </div>

      <LanguageTabs
        languages={languages}
        value={lang}
        onChange={setLang}
        loading={langLoading}
        error={langError}
        disabled={saving || reordering}
        direction={direction}
      />

      {error ? <p className="menu-manager-error">{error}</p> : null}
      {success ? <p className="menu-manager-success">{success}</p> : null}

      <div className={`menu-manager-layout${isEdit ? '' : ' menu-manager-layout--create'}`}>
        <aside className="menu-manager-panel">
          <div className="menu-manager-panel-head">
            <div>
              <h2>Group settings</h2>
              <p>Title, key, and visibility</p>
            </div>
            {isEdit ? (
              <button
                type="button"
                className="menu-manager-btn menu-manager-btn--ghost"
                onClick={() => setSettingsOpen((open) => !open)}
              >
                {settingsOpen ? 'Hide' : 'Edit'}
              </button>
            ) : null}
          </div>

          <div className="menu-manager-panel-body">
            {isEdit ? (
              <div className="menu-manager-meta">
                <span className="menu-chip menu-chip--muted">key: {key || '—'}</span>
                <span className="menu-chip menu-chip--muted">sort {sortOrder}</span>
                <span className={`menu-chip ${isActive ? 'menu-chip--ok' : 'menu-chip--warn'}`}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="menu-chip">{itemCount} items</span>
              </div>
            ) : null}

            {settingsOpen || !isEdit ? (
              <form
                id="menu-group-editor-form"
                className="menu-manager-form"
                onSubmit={handleSubmit}
              >
                <LocalizedFields direction={direction}>
                  <label className="menu-manager-field">
                    <span>Title</span>
                    <input
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value)
                        if (!isEdit) setKey(keyify(e.target.value))
                      }}
                      placeholder="Header menu"
                      required
                    />
                  </label>

                  <label className="menu-manager-field">
                    <span>Key</span>
                    <input
                      value={key}
                      onChange={(e) => setKey(keyify(e.target.value))}
                      placeholder="header"
                      required
                    />
                    <p className="menu-manager-hint">Stable identifier used by the frontend theme.</p>
                  </label>

                  <label className="menu-manager-field">
                    <span>Description</span>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Optional notes for editors"
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

                {isEdit ? (
                  <button type="submit" className="menu-manager-btn" disabled={saving || !hasLanguages}>
                    {saving ? 'Saving…' : 'Save settings'}
                  </button>
                ) : null}
              </form>
            ) : (
              <p className="menu-manager-hint">
                {description || 'No description. Open Edit to change group settings.'}
              </p>
            )}
          </div>
        </aside>

        {isEdit && groupId ? (
          <section className="menu-manager-panel">
            <div className="menu-manager-panel-head">
              <div>
                <h2>Menu items</h2>
                <p>Check items to delete them together. Drag or use ↑ ↓ to reorder siblings.</p>
              </div>
              <div className="menu-items-head-actions">
                {tree.length > 0 ? (
                  <label className="menu-tree-select-all">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      disabled={deleting || reordering}
                      aria-label="Select all menu items"
                    />
                    Select all
                  </label>
                ) : null}
                <Link to={`/menus/${groupId}/items/new`} className="menu-manager-btn menu-manager-btn--ghost">
                  Add root item
                </Link>
              </div>
            </div>

            <div className="menu-manager-panel-body">
              {selectedIds.length > 0 ? (
                <div className="menu-bulk-bar">
                  <span className="menu-bulk-count">
                    {selectedIds.length} selected
                  </span>
                  <button
                    type="button"
                    className="menu-bulk-delete"
                    onClick={() => void handleBulkDelete()}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : `Delete selected (${selectedIds.length})`}
                  </button>
                  <button
                    type="button"
                    className="menu-bulk-clear"
                    onClick={() => setSelectedIds([])}
                    disabled={deleting}
                  >
                    Clear selection
                  </button>
                </div>
              ) : null}
              {tree.length === 0 ? (
                <div className="menu-empty">
                  <h3>No items in this menu yet</h3>
                  <p>
                    Add a root item, then optionally nest children. Link targets can point to a blog
                    group, post, gallery, or a custom URL.
                  </p>
                  <div className="menu-empty-steps">
                    <div className="menu-empty-step">
                      <strong>1. Choose function</strong>
                      <span>GroupBlog, Post, Gallery, or Custom</span>
                    </div>
                    <div className="menu-empty-step">
                      <strong>2. Pick target</strong>
                      <span>URL is built as /slug, /post/slug, or /gallery/slug</span>
                    </div>
                    <div className="menu-empty-step">
                      <strong>3. Nest children</strong>
                      <span>Use Add child on any level 1 or 2 item</span>
                    </div>
                  </div>
                  <Link to={`/menus/${groupId}/items/new`} className="menu-manager-btn">
                    Add first menu item
                  </Link>
                </div>
              ) : (
                <ItemTree
                  nodes={tree}
                  groupId={groupId}
                  reordering={reordering}
                  deleting={deleting}
                  dragKey={dragKey}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onDelete={handleDeleteItem}
                  onMove={handleMove}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                />
              )}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  )
}
