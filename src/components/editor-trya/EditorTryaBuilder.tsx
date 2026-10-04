import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Blocks,
  ChevronDown,
  ChevronUp,
  Code2,
  Heading2,
  Image as ImageIcon,
  Images,
  LayoutGrid,
  Minus,
  MousePointerClick,
  Plus,
  Quote,
  SlidersHorizontal,
  Trash2,
  Type,
  UnfoldVertical,
  Video,
  type LucideProps,
} from 'lucide-react'
import {
  cloneEditor,
  createEditorComponent,
  createEditorContainer,
  deleteEditorComponent,
  deleteEditorContainer,
  getEditor,
  listEditorComponentTypes,
  reorderEditorComponents,
  reorderEditorContainers,
  saveEditor,
  updateEditorComponent,
  updateEditorContainer,
  type EditorComponent,
  type EditorComponentType,
  type EditorContainer,
  type EditorTree,
} from '../../lib/editorTryaApi'
import { LanguageTabs, LocalizedFields } from '../LanguageTabs'
import { useLanguages } from '../../hooks/useLanguages'
import type { Language, TextDirection } from '../../lib/languagesApi'
import {
  buttonOptionsToStyle,
  normalizeButtonAlignment,
} from '../../lib/editorTryaButtonOptions'
import {
  DIVIDER_ICON_OPTIONS,
  normalizeDividerContentMode,
  normalizeDividerIcon,
  normalizeDividerLineStyle,
  parseDividerOptions,
} from '../../lib/editorTryaDividerOptions'
import {
  normalizeGalleryLayout,
  normalizeSlidesPerView,
  parseGallerySettings,
} from '../../lib/editorTryaGalleryOptions'
import { normalizeMediaSourceType } from '../../lib/editorTryaMediaOptions'
import {
  imageOptionsToStyle,
  normalizeImageAlignment,
  normalizeImageDisplay,
  normalizeImageObjectFit,
} from '../../lib/editorTryaImageOptions'
import {
  DEFAULT_CONTAINER_OPTIONS,
  containerOptionsToStyle,
  parseContainerOptions,
} from '../../lib/editorTryaContainerOptions'
import { getMediaFiles, mediaUrl, type MediaFile } from '../../lib/mediaApi'
import { confirmDialog } from '../../lib/swal'
import { ChunkMediaUploader } from '../media/ChunkMediaUploader'
import { MediaUploader } from '../media/MediaUploader'
import { ContainerInspector } from './ContainerInspector'
import { EditorTryaDivider } from './EditorTryaDivider'
import { EditorTryaGallery } from './EditorTryaGallery'
import { EditorTryaMedia } from './EditorTryaMedia'
import { EditorTryaRenderer } from './EditorTryaRenderer'
import { HtmlRichEditor } from './HtmlRichEditor'
import './EditorTryaBuilder.css'

type PaletteMeta = {
  icon: ComponentType<LucideProps>
  hint: string
}

const PALETTE_META: Record<string, PaletteMeta> = {
  title: { icon: Heading2, hint: 'Section heading' },
  text: { icon: Type, hint: 'Paragraph content' },
  image: { icon: ImageIcon, hint: 'Single image' },
  gallery: { icon: Images, hint: 'Image collection' },
  button: { icon: MousePointerClick, hint: 'Call to action' },
  video: { icon: Video, hint: 'Video, audio, or YouTube' },
  divider: { icon: Minus, hint: 'Horizontal rule' },
  spacer: { icon: UnfoldVertical, hint: 'Vertical space' },
  quote: { icon: Quote, hint: 'Pull quote' },
  html: { icon: Code2, hint: 'Custom markup' },
}

function getPaletteMeta(type: string): PaletteMeta {
  return PALETTE_META[type] ?? { icon: Blocks, hint: 'Click or drag to add' }
}

type Props = {
  component: string
  parentId: string
  /** When provided, EditorTrya follows the parent page language instead of its own tabs state. */
  lang?: string
  onLangChange?: (prefix: string) => void
  direction?: TextDirection
  languages?: Language[]
  langLoading?: boolean
  langError?: string | null
}

type Selection =
  | { kind: 'container'; id: string }
  | { kind: 'component'; id: string; containerId: string }
  | null

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function normalizeCols(cols: number | null | undefined): number {
  if (cols === 4 || cols === 6 || cols === 12) return cols
  return 12
}

export function EditorTryaBuilder({
  component,
  parentId,
  lang: langProp,
  onLangChange,
  direction: directionProp,
  languages: languagesProp,
  langLoading: langLoadingProp,
  langError: langErrorProp,
}: Props) {
  const internalLanguages = useLanguages()
  const languages = languagesProp ?? internalLanguages.languages
  const lang = langProp ?? internalLanguages.lang
  const setLang = onLangChange ?? internalLanguages.setLang
  const direction = directionProp ?? internalLanguages.direction
  const langLoading = langLoadingProp ?? internalLanguages.loading
  const langError = langErrorProp ?? internalLanguages.error
  const hasLanguages = languages.length > 0 && Boolean(lang)
  const [tree, setTree] = useState<EditorTree | null>(null)
  const [types, setTypes] = useState<EditorComponentType[]>([])
  const [selection, setSelection] = useState<Selection>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [preview, setPreview] = useState(false)
  const [sideTab, setSideTab] = useState<'components' | 'inspector'>('components')
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingComponentRef = useRef<EditorComponent | null>(null)
  const pendingContainerRef = useRef<EditorContainer | null>(null)
  const containerPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!lang) {
      setTree(null)
      if (!opts?.silent) setLoading(false)
      return
    }
    if (!opts?.silent) setLoading(true)
    setError(null)
    try {
      const [editor, componentTypes] = await Promise.all([
        getEditor(component, parentId, lang),
        listEditorComponentTypes(),
      ])
      setTree(editor)
      setTypes(componentTypes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load EditorTrya.')
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [component, parentId, lang])

  useEffect(() => {
    setSelection(null)
    void refresh()
  }, [refresh])

  const otherLanguages = useMemo(
    () => languages.filter((language) => language.prefix !== lang),
    [languages, lang],
  )

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
      if (containerPersistTimerRef.current) clearTimeout(containerPersistTimerRef.current)
    }
  }, [])

  const selectedComponent = useMemo(() => {
    if (!tree || selection?.kind !== 'component') return null
    for (const container of tree.containers) {
      const found = container.components.find((c) => c.id === selection.id)
      if (found) return found
    }
    return null
  }, [tree, selection])

  const selectedContainer = useMemo(() => {
    if (!tree || selection?.kind !== 'container') return null
    return tree.containers.find((c) => c.id === selection.id) ?? null
  }, [tree, selection])

  async function handleAddContainer() {
    if (!lang) return
    setError(null)
    try {
      await createEditorContainer(
        component,
        parentId,
        {
          component: 'section',
          cols: 12,
          options: { ...DEFAULT_CONTAINER_OPTIONS },
        },
        lang,
      )
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add container.')
    }
  }

  async function handleCloneFrom(fromLang: string) {
    if (!lang || fromLang === lang) return
    setCloning(true)
    setError(null)
    try {
      const cloned = await cloneEditor(component, parentId, fromLang, lang)
      setTree(cloned)
      setSelection(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy editor content.')
    } finally {
      setCloning(false)
    }
  }

  async function handleAddComponent(containerId: string, type: string) {
    const def = types.find((t) => t.type === type)
    setError(null)
    try {
      const created = await createEditorComponent(containerId, {
        type,
        data: def?.defaultData ?? {},
        options: def?.defaultOptions ?? {},
      })
      await refresh()
      setSelection({ kind: 'component', id: created.id, containerId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add component.')
    }
  }

  async function handleDeleteContainer(containerId: string) {
    const confirmed = await confirmDialog({
      title: 'Delete container?',
      text: 'This container and all of its components will be permanently removed.',
    })
    if (!confirmed) return
    setError(null)
    try {
      await deleteEditorContainer(containerId)
      if (selection?.kind === 'container' && selection.id === containerId) setSelection(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete container.')
    }
  }

  async function handleDeleteComponent(componentId: string) {
    const confirmed = await confirmDialog({
      title: 'Delete component?',
      text: 'This component will be permanently removed.',
    })
    if (!confirmed) return
    setError(null)
    try {
      await deleteEditorComponent(componentId)
      if (selection?.kind === 'component' && selection.id === componentId) setSelection(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete component.')
    }
  }

  async function moveContainer(containerId: string, direction: -1 | 1) {
    if (!tree) return
    const ordered = tree.containers.slice().sort((a, b) => a.ordered - b.ordered)
    const index = ordered.findIndex((c) => c.id === containerId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ordered.length) return
    const next = [...ordered]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    try {
      await reorderEditorContainers(next.map((c, i) => ({ id: c.id, ordered: i + 1 })))
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder containers.')
    }
  }

  async function moveComponent(container: EditorContainer, componentId: string, direction: -1 | 1) {
    const ordered = container.components.slice().sort((a, b) => a.ordered - b.ordered)
    const index = ordered.findIndex((c) => c.id === componentId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ordered.length) return
    const next = [...ordered]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    try {
      await reorderEditorComponents(
        next.map((c, i) => ({ id: c.id, ordered: i + 1, containerId: container.id })),
      )
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder components.')
    }
  }

  function applyComponentLocal(next: EditorComponent) {
    setTree((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        containers: prev.containers.map((container) => ({
          ...container,
          components: container.components.map((item) => (item.id === next.id ? next : item)),
        })),
      }
    })
  }

  async function persistComponent(next: EditorComponent) {
    setError(null)
    try {
      await updateEditorComponent(next.id, {
        type: next.type,
        ordered: next.ordered,
        publish: next.publish,
        data: next.data,
        options: next.options,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update component.')
    }
  }

  function handleComponentChange(next: EditorComponent) {
    applyComponentLocal(next)
    pendingComponentRef.current = next
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      const pending = pendingComponentRef.current
      pendingComponentRef.current = null
      if (pending) void persistComponent(pending)
    }, 400)
  }

  function applyContainerLocal(next: EditorContainer) {
    setTree((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        containers: prev.containers.map((container) => (container.id === next.id ? next : container)),
      }
    })
  }

  async function persistContainer(next: EditorContainer) {
    setError(null)
    try {
      await updateEditorContainer(next.id, {
        parentId: next.parentId,
        component: next.component,
        cols: next.cols,
        ordered: next.ordered,
        publish: next.publish,
        options: next.options,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update container.')
    }
  }

  function handleContainerChange(next: EditorContainer) {
    applyContainerLocal(next)
    pendingContainerRef.current = next
    if (containerPersistTimerRef.current) clearTimeout(containerPersistTimerRef.current)
    containerPersistTimerRef.current = setTimeout(() => {
      const pending = pendingContainerRef.current
      pendingContainerRef.current = null
      if (pending) void persistContainer(pending)
    }, 400)
  }

  async function handleSaveAll() {
    if (!tree || !lang) return
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
    if (containerPersistTimerRef.current) {
      clearTimeout(containerPersistTimerRef.current)
      containerPersistTimerRef.current = null
    }
    pendingComponentRef.current = null
    pendingContainerRef.current = null
    setSaving(true)
    setError(null)
    try {
      const saved = await saveEditor(
        component,
        parentId,
        {
          publish: tree.publish,
          containers: tree.containers
            .slice()
            .sort((a, b) => a.ordered - b.ordered)
            .map((container, index) => ({
              id: container.id,
              parentId: container.parentId,
              component: container.component,
              cols: container.cols,
              ordered: index + 1,
              publish: container.publish,
              options: container.options,
              components: container.components
                .slice()
                .sort((a, b) => a.ordered - b.ordered)
                .map((item, cIndex) => ({
                  id: item.id,
                  type: item.type,
                  ordered: cIndex + 1,
                  publish: item.publish,
                  data: item.data,
                  options: item.options,
                })),
            })),
        },
        lang,
      )
      setTree(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save editor.')
    } finally {
      setSaving(false)
    }
  }

  if (langLoading || (lang && loading)) {
    return <div className="et-builder-loading">Loading EditorTrya…</div>
  }

  if (!hasLanguages || !lang) {
    return (
      <div className="et-builder">
        <div className="et-builder-toolbar">
          <div>
            <h3>EditorTrya</h3>
            <p>
              {component} · {parentId}
            </p>
          </div>
        </div>
        <LanguageTabs
          languages={languages}
          value={lang}
          onChange={setLang}
          loading={langLoading}
          error={langError}
          direction={direction}
        />
      </div>
    )
  }

  if (!tree) {
    return <div className="et-builder-error">{error ?? 'Editor unavailable.'}</div>
  }

  return (
    <div className="et-builder notranslate" translate="no" data-no-ui-translate>
      <div className="et-builder-toolbar">
        <div>
          <h3>EditorTrya</h3>
          <p>
            {component} · {parentId} · lang: {lang}
          </p>
        </div>
        <div className="et-builder-toolbar-actions">
          <button type="button" className="et-btn et-btn--ghost" onClick={() => setPreview((v) => !v)}>
            {preview ? 'Edit mode' : 'Preview'}
          </button>
          <button
            type="button"
            className="et-btn"
            onClick={() => void handleSaveAll()}
            disabled={saving || !hasLanguages}
          >
            {saving ? 'Saving…' : 'Save editor'}
          </button>
        </div>
      </div>

      <div className="et-builder-lang-bar">
        <LanguageTabs
          languages={languages}
          value={lang}
          onChange={setLang}
          loading={langLoading}
          error={langError}
          disabled={saving || cloning}
          direction={direction}
        />
      </div>

      {error ? <p className="et-builder-error">{error}</p> : null}

      {preview ? (
        <div className="et-builder-preview" translate="no">
          <EditorTryaRenderer tree={tree} />
        </div>
      ) : (
        <LocalizedFields direction={direction} className="et-builder-layout">
          <main className="et-canvas">
            {tree.containers.length === 0 ? (
              <div className="et-canvas-empty">
                <p>No containers yet.</p>
                <button type="button" className="et-btn" onClick={() => void handleAddContainer()}>
                  Add first container
                </button>
                {otherLanguages.length > 0 ? (
                  <div className="et-canvas-clone">
                    {otherLanguages.map((language) => (
                      <button
                        key={language.id}
                        type="button"
                        className="et-btn et-btn--ghost"
                        disabled={cloning}
                        onClick={() => void handleCloneFrom(language.prefix)}
                      >
                        {cloning ? 'Copying…' : `Copy from ${language.name}`}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              tree.containers
                .slice()
                .sort((a, b) => a.ordered - b.ordered)
                .map((container) => (
                  <div
                    key={container.id}
                    className={`et-canvas-container${selection?.kind === 'container' && selection.id === container.id ? ' is-selected' : ''}`}
                    style={{ gridColumn: `span ${normalizeCols(container.cols)}` }}
                    onClick={() => {
                      setSelection({ kind: 'container', id: container.id })
                      setSideTab('inspector')
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const type = e.dataTransfer.getData('application/x-editortrya-type')
                      if (type) void handleAddComponent(container.id, type)
                    }}
                  >
                    <div className="et-canvas-container-head">
                      <strong>
                        {container.component ?? 'section'} · {normalizeCols(container.cols)} cols
                      </strong>
                      <div className="et-canvas-actions">
                        <button
                          type="button"
                          title="Move up"
                          aria-label="Move container up"
                          onClick={(e) => {
                            e.stopPropagation()
                            void moveContainer(container.id, -1)
                          }}
                        >
                          <ChevronUp size={14} strokeWidth={2.4} />
                        </button>
                        <button
                          type="button"
                          title="Move down"
                          aria-label="Move container down"
                          onClick={(e) => {
                            e.stopPropagation()
                            void moveContainer(container.id, 1)
                          }}
                        >
                          <ChevronDown size={14} strokeWidth={2.4} />
                        </button>
                        <button
                          type="button"
                          className="et-canvas-action--danger"
                          title="Delete container"
                          aria-label="Delete container"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDeleteContainer(container.id)
                          }}
                        >
                          <Trash2 size={14} strokeWidth={2.4} />
                        </button>
                      </div>
                    </div>

                    <div
                      className="et-canvas-components"
                      style={containerOptionsToStyle(parseContainerOptions(container.options))}
                    >
                      {container.components
                        .slice()
                        .sort((a, b) => a.ordered - b.ordered)
                        .map((item) => (
                          <div
                            key={item.id}
                            className={`et-canvas-component${selection?.kind === 'component' && selection.id === item.id ? ' is-selected' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelection({
                                kind: 'component',
                                id: item.id,
                                containerId: container.id,
                              })
                              if (item.type !== 'text' && item.type !== 'html') {
                                setSideTab('inspector')
                              }
                            }}
                          >
                            <div className="et-canvas-component-head">
                              <span>{item.type}</span>
                              <div className="et-canvas-actions">
                                <button
                                  type="button"
                                  title="Move up"
                                  aria-label="Move component up"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void moveComponent(container, item.id, -1)
                                  }}
                                >
                                  <ChevronUp size={14} strokeWidth={2.4} />
                                </button>
                                <button
                                  type="button"
                                  title="Move down"
                                  aria-label="Move component down"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void moveComponent(container, item.id, 1)
                                  }}
                                >
                                  <ChevronDown size={14} strokeWidth={2.4} />
                                </button>
                                <button
                                  type="button"
                                  className="et-canvas-action--danger"
                                  title="Delete component"
                                  aria-label="Delete component"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void handleDeleteComponent(item.id)
                                  }}
                                >
                                  <Trash2 size={14} strokeWidth={2.4} />
                                </button>
                              </div>
                            </div>
                            <ComponentPreview
                              component={item}
                              selected={selection?.kind === 'component' && selection.id === item.id}
                              onChange={handleComponentChange}
                            />
                          </div>
                        ))}
                      {container.components.length === 0 ? (
                        <p className="et-canvas-hint">Drop a component here</p>
                      ) : null}
                    </div>
                  </div>
                ))
            )}
          </main>

          <aside className="et-panel et-panel--side">
            <div className="et-side-tabs" role="tablist" aria-label="Editor side panel">
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === 'components'}
                className={`et-side-tab${sideTab === 'components' ? ' is-active' : ''}`}
                onClick={() => setSideTab('components')}
              >
                <Blocks size={15} strokeWidth={2.25} aria-hidden="true" />
                Components
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === 'inspector'}
                className={`et-side-tab${sideTab === 'inspector' ? ' is-active' : ''}`}
                onClick={() => setSideTab('inspector')}
              >
                <SlidersHorizontal size={15} strokeWidth={2.25} aria-hidden="true" />
                Inspector
              </button>
            </div>

            <div className="et-side-panel" hidden={sideTab !== 'components'}>
              <p className="et-palette-help">Click to add, or drag onto a container.</p>
              <div className="et-palette">
                {types.map((type) => {
                  const meta = getPaletteMeta(type.type)
                  const Icon = meta.icon
                  return (
                    <button
                      key={type.type}
                      type="button"
                      className="et-palette-item"
                      title={`Add ${type.name}`}
                      aria-label={`Add ${type.name}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/x-editortrya-type', type.type)
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      onClick={() => {
                        const target =
                          selection?.kind === 'container'
                            ? selection.id
                            : selection?.kind === 'component'
                              ? selection.containerId
                              : tree.containers[0]?.id
                        if (!target) {
                          setError('Add a container first, then drop/add a component.')
                          return
                        }
                        void handleAddComponent(target, type.type)
                      }}
                    >
                      <span className="et-palette-icon" aria-hidden="true">
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="et-palette-copy">
                        <span className="et-palette-name">{type.name}</span>
                        <span className="et-palette-hint">{meta.hint}</span>
                      </span>
                      <span className="et-palette-add" aria-hidden="true">
                        <Plus size={16} strokeWidth={2.5} />
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                className="et-btn et-btn--block et-btn--with-icon"
                onClick={() => void handleAddContainer()}
              >
                <LayoutGrid size={16} strokeWidth={2.25} aria-hidden="true" />
                Add container
              </button>
            </div>

            <div className="et-side-panel" hidden={sideTab !== 'inspector'}>
              {!selection ? <p className="et-muted">Select a container or component.</p> : null}

              {selectedContainer ? (
                <ContainerInspector
                  container={selectedContainer}
                  onChange={handleContainerChange}
                />
              ) : null}

              {selectedComponent ? (
                <ComponentInspector
                  component={selectedComponent}
                  onChange={handleComponentChange}
                />
              ) : null}
            </div>
          </aside>
        </LocalizedFields>
      )}
    </div>
  )
}

function useComponentMedia(
  fileManagerComponent: string,
  parentId: string,
  revision?: string | number | null,
) {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    void getMediaFiles(fileManagerComponent, parentId)
      .then((items) => {
        if (active) setFiles(items)
      })
      .catch(() => {
        if (active) setFiles([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [fileManagerComponent, parentId, revision])

  return { files, loading }
}

function ImageCanvasPreview({ component }: { component: EditorComponent }) {
  const data = asRecord(component.data)
  const { files, loading } = useComponentMedia(
    'editortryaimage',
    component.id,
    String(data.fileId ?? ''),
  )
  const file =
    files.find((item) => item.id === data.fileId) ??
    files.slice().sort((a, b) => a.ordered - b.ordered)[0] ??
    null

  if (loading) {
    return <div className="et-media-preview et-media-preview--loading">Loading preview…</div>
  }

  if (!file) {
    return <div className="et-media-preview et-media-preview--empty">No image yet</div>
  }

  const styles = imageOptionsToStyle(component.options)

  return (
    <div className="et-media-preview">
      <div className="et-image-preview-wrap" style={styles.wrap}>
        <img
          src={mediaUrl(file.fullAddress)}
          alt={String(data.alt || file.namefile || 'Image preview')}
          style={styles.image}
        />
      </div>
      <span>{file.namefile ?? file.filename}</span>
    </div>
  )
}

function GalleryCanvasPreview({ component }: { component: EditorComponent }) {
  const data = asRecord(component.data)
  const { files, loading } = useComponentMedia(
    'editortryagallery',
    component.id,
    String(data.mediaRevision ?? ''),
  )

  if (loading) {
    return <div className="et-media-preview et-media-preview--loading">Loading gallery…</div>
  }

  return (
    <EditorTryaGallery
      files={files}
      data={component.data}
      options={component.options}
      compact
    />
  )
}

function VideoAudioCanvasPreview({ component }: { component: EditorComponent }) {
  const data = asRecord(component.data)
  const sourceType = normalizeMediaSourceType(data.sourceType)
  const { files, loading } = useComponentMedia(
    'editortryavideoaudio',
    component.id,
    String(data.fileId ?? data.mediaRevision ?? ''),
  )

  if (sourceType === 'youtube') {
    return (
      <EditorTryaMedia data={component.data} options={component.options} compact />
    )
  }

  if (loading) {
    return <div className="et-media-preview et-media-preview--loading">Loading media…</div>
  }

  const file =
    files.find((item) => item.id === data.fileId) ??
    files.slice().sort((a, b) => a.ordered - b.ordered)[0] ??
    null

  return (
    <EditorTryaMedia
      data={component.data}
      options={component.options}
      fileUrl={file ? mediaUrl(file.fullAddress) : null}
      title={file?.namefile ?? file?.filename ?? null}
      compact
    />
  )
}

function ComponentPreview({
  component,
  selected = false,
  onChange,
}: {
  component: EditorComponent
  selected?: boolean
  onChange?: (next: EditorComponent) => void
}) {
  const data = asRecord(component.data)
  switch (component.type) {
    case 'title':
      return <strong>{String(data.text || 'Untitled')}</strong>
    case 'text':
    case 'html':
      if (selected && onChange) {
        return (
          <div
            className="et-text-canvas-editor notranslate"
            translate="no"
            data-no-ui-translate
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <HtmlRichEditor
              key={component.id}
              value={String(data.html ?? '')}
              onChange={(html) =>
                onChange({
                  ...component,
                  data: { ...data, html },
                })
              }
              placeholder={
                component.type === 'html' ? 'Write HTML content…' : 'Write text content…'
              }
            />
          </div>
        )
      }
      return (
        <div
          className="et-text-preview notranslate"
          translate="no"
          data-no-ui-translate
          dangerouslySetInnerHTML={{ __html: String(data.html || '<em>Empty text</em>') }}
        />
      )
    case 'button': {
      const styles = buttonOptionsToStyle(component.options)
      return (
        <div className="et-button-preview-wrap" style={styles.wrap}>
          <span className="et-button-preview" style={styles.button}>
            {String(data.text || 'Button')}
          </span>
        </div>
      )
    }
    case 'image':
      return <ImageCanvasPreview component={component} />
    case 'gallery':
      return <GalleryCanvasPreview component={component} />
    case 'video':
      return <VideoAudioCanvasPreview component={component} />
    case 'divider':
      return <EditorTryaDivider options={component.options} data={component.data} />
    case 'quote':
      return <em className="et-muted">{String(data.text || 'Quote')}</em>
    default:
      return <span className="et-muted">{component.type}</span>
  }
}

function ComponentInspector({
  component,
  onChange,
}: {
  component: EditorComponent
  onChange: (next: EditorComponent) => void
}) {
  const data = asRecord(component.data)
  const options = asRecord(component.options)

  function patchData(patch: Record<string, unknown>) {
    onChange({
      ...component,
      data: { ...data, ...patch },
    })
  }

  function patchOptions(patch: Record<string, unknown>) {
    onChange({
      ...component,
      options: { ...options, ...patch },
    })
  }

  return (
    <div className="et-inspector">
      <p className="et-inspector-label">{component.type}</p>
      <label className="et-check">
        <input
          type="checkbox"
          checked={component.publish}
          onChange={(e) => onChange({ ...component, publish: e.target.checked })}
        />
        Published
      </label>

      {component.type === 'title' ? (
        <>
          <label>
            Text
            <input
              value={String(data.text ?? '')}
              onChange={(e) => patchData({ text: e.target.value })}
            />
          </label>
          <label>
            Heading
            <select
              value={String(options.headingType ?? 'h2')}
              onChange={(e) => patchOptions({ headingType: e.target.value })}
            >
              {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <div className="et-field-block">
            <span className="et-field-caption">Color</span>
            <div className="et-color-field">
              <input
                type="color"
                className="et-color-swatch"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(String(options.color ?? ''))
                    ? String(options.color)
                    : '#111111'
                }
                aria-label="Title color"
                onChange={(e) => patchOptions({ color: e.target.value })}
              />
              <input
                type="text"
                value={String(options.color ?? '#111111')}
                spellCheck={false}
                onChange={(e) => patchOptions({ color: e.target.value })}
              />
            </div>
          </div>
          <label>
            Align
            <select
              value={String(options.textAlign ?? 'left')}
              onChange={(e) => patchOptions({ textAlign: e.target.value })}
            >
              <option value="left">left</option>
              <option value="center">center</option>
              <option value="right">right</option>
            </select>
          </label>
        </>
      ) : null}

      {component.type === 'text' || component.type === 'html' ? (
        <p className="et-muted">Edit content directly on the canvas.</p>
      ) : null}

      {component.type === 'button' ? (
        <>
          <label>
            Label
            <input
              value={String(data.text ?? '')}
              onChange={(e) => patchData({ text: e.target.value })}
            />
          </label>
          <label>
            URL
            <input
              value={String(data.url ?? '')}
              onChange={(e) => patchData({ url: e.target.value })}
            />
          </label>
          <label>
            Size
            <select
              value={String(options.size ?? 'medium')}
              onChange={(e) => patchOptions({ size: e.target.value })}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </label>

          <div className="et-field-block">
            <span className="et-field-caption">Align</span>
            <div className="et-seg" role="group" aria-label="Button alignment">
              {(
                [
                  ['left', AlignLeft, 'Align left'],
                  ['center', AlignCenter, 'Align center'],
                  ['right', AlignRight, 'Align right'],
                ] as const
              ).map(([value, Icon, label]) => {
                const active = normalizeButtonAlignment(options.alignment) === value
                return (
                  <button
                    key={value}
                    type="button"
                    className={`et-seg-btn${active ? ' is-active' : ''}`}
                    title={label}
                    aria-label={label}
                    onClick={() => patchOptions({ alignment: value })}
                  >
                    <Icon size={15} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="et-field-block">
            <span className="et-field-caption">Background</span>
            <div className="et-color-field">
              <input
                type="color"
                className="et-color-swatch"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(String(options.backgroundColor ?? ''))
                    ? String(options.backgroundColor)
                    : '#9a55f0'
                }
                aria-label="Button background color"
                onChange={(e) => patchOptions({ backgroundColor: e.target.value })}
              />
              <input
                type="text"
                value={String(options.backgroundColor ?? '#9a55f0')}
                spellCheck={false}
                onChange={(e) => patchOptions({ backgroundColor: e.target.value })}
              />
            </div>
          </div>

          <div className="et-field-block">
            <span className="et-field-caption">Text color</span>
            <div className="et-color-field">
              <input
                type="color"
                className="et-color-swatch"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(String(options.color ?? ''))
                    ? String(options.color)
                    : '#ffffff'
                }
                aria-label="Button text color"
                onChange={(e) => patchOptions({ color: e.target.value })}
              />
              <input
                type="text"
                value={String(options.color ?? '#ffffff')}
                spellCheck={false}
                onChange={(e) => patchOptions({ color: e.target.value })}
              />
            </div>
          </div>

          <label>
            Radius
            <input
              value={String(options.borderRadius ?? '6px')}
              placeholder="6px"
              onChange={(e) => patchOptions({ borderRadius: e.target.value })}
            />
          </label>

          <label>
            Shadow
            <select
              value={String(options.shadow ?? 'none')}
              onChange={(e) =>
                patchOptions({
                  shadow: e.target.value,
                  boxShadow: e.target.value === 'custom' ? String(options.boxShadow ?? '') : '',
                })
              }
            >
              <option value="none">None</option>
              <option value="soft">Soft</option>
              <option value="medium">Medium</option>
              <option value="strong">Strong</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          {String(options.shadow ?? 'none') === 'custom' ? (
            <label>
              Custom shadow
              <input
                value={String(options.boxShadow ?? '')}
                placeholder="0 8px 24px rgba(0,0,0,0.15)"
                onChange={(e) => patchOptions({ boxShadow: e.target.value, shadow: 'custom' })}
              />
            </label>
          ) : null}
        </>
      ) : null}

      {component.type === 'quote' ? (
        <>
          <label>
            Quote
            <textarea
              rows={4}
              value={String(data.text ?? '')}
              onChange={(e) => patchData({ text: e.target.value })}
            />
          </label>
          <label>
            Cite
            <input
              value={String(data.cite ?? '')}
              onChange={(e) => patchData({ cite: e.target.value || null })}
            />
          </label>
        </>
      ) : null}

      {component.type === 'image' ? (
        <>
          <label>
            Alt
            <input
              value={String(data.alt ?? '')}
              onChange={(e) => patchData({ alt: e.target.value })}
            />
          </label>
          <MediaUploader
            component="editortryaimage"
            parentId={component.id}
            multiple={false}
            label="Image file"
            onChange={(files) => {
              const fileId = files[0]?.id ?? null
              if (fileId !== data.fileId) {
                patchData({ fileId })
              }
            }}
          />

          <div className="et-field-block">
            <span className="et-field-caption">Position</span>
            <div className="et-seg" role="group" aria-label="Image position">
              {(
                [
                  ['left', AlignLeft, 'Align left'],
                  ['center', AlignCenter, 'Align center'],
                  ['right', AlignRight, 'Align right'],
                ] as const
              ).map(([value, Icon, label]) => {
                const active = normalizeImageAlignment(options.alignment) === value
                return (
                  <button
                    key={value}
                    type="button"
                    className={`et-seg-btn${active ? ' is-active' : ''}`}
                    title={label}
                    aria-label={label}
                    onClick={() => patchOptions({ alignment: value })}
                  >
                    <Icon size={15} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="et-inline-fields">
            <label>
              Width
              <input
                value={String(options.width ?? '')}
                placeholder="100%"
                onChange={(e) => patchOptions({ width: e.target.value })}
              />
            </label>
            <label>
              Max width
              <input
                value={String(options.maxWidth ?? '100%')}
                placeholder="720px"
                onChange={(e) => patchOptions({ maxWidth: e.target.value })}
              />
            </label>
          </div>

          <label>
            Height
            <input
              value={String(options.height ?? '')}
              placeholder="auto"
              onChange={(e) => patchOptions({ height: e.target.value })}
            />
          </label>

          <label>
            Radius
            <input
              value={String(options.borderRadius ?? '0px')}
              placeholder="0px"
              onChange={(e) => patchOptions({ borderRadius: e.target.value })}
            />
          </label>

          <label>
            Object fit
            <select
              value={normalizeImageObjectFit(options.objectFit)}
              onChange={(e) => patchOptions({ objectFit: e.target.value })}
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="fill">Fill</option>
              <option value="none">None</option>
              <option value="scale-down">Scale down</option>
            </select>
          </label>

          <label>
            Display
            <select
              value={normalizeImageDisplay(options.display)}
              onChange={(e) => patchOptions({ display: e.target.value })}
            >
              <option value="block">Block</option>
              <option value="inline-block">Inline block</option>
              <option value="inline">Inline</option>
            </select>
          </label>
        </>
      ) : null}

      {component.type === 'gallery' ? (
        <>
          <MediaUploader
            component="editortryagallery"
            parentId={component.id}
            multiple
            label="Gallery images"
            onChange={(files) => {
              const mediaRevision = files
                .slice()
                .sort((a, b) => a.ordered - b.ordered)
                .map((file) => file.id)
                .join(',')
              if (mediaRevision !== String(data.mediaRevision ?? '')) {
                patchData({ mediaRevision })
              }
            }}
          />

          {(() => {
            const gallery = parseGallerySettings(data, options)
            return (
              <>
                <div className="et-field-block">
                  <span className="et-field-caption">Layout</span>
                  <div className="et-seg" role="group" aria-label="Gallery layout">
                    {(
                      [
                        ['grid', 'Grid'],
                        ['carousel', 'Carousel'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`et-seg-btn et-seg-btn--text${normalizeGalleryLayout(gallery.layout) === value ? ' is-active' : ''}`}
                        onClick={() => patchData({ layout: value })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {gallery.layout === 'carousel' ? (
                  <label>
                    Images per slide
                    <select
                      value={normalizeSlidesPerView(gallery.slidesPerView)}
                      onChange={(e) =>
                        patchOptions({ slidesPerView: Number(e.target.value) })
                      }
                    >
                      {[1, 2, 3, 4, 5, 6].map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    Columns
                    <select
                      value={normalizeSlidesPerView(gallery.columns, 3)}
                      onChange={(e) => patchData({ columns: Number(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5, 6].map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label>
                  Gap
                  <input
                    value={gallery.gap}
                    placeholder="12px"
                    onChange={(e) => patchOptions({ gap: e.target.value })}
                  />
                </label>

                {gallery.layout === 'carousel' ? (
                  <>
                    <div className="et-field-block">
                      <span className="et-field-caption">Show arrows</span>
                      <div className="et-radio-row" role="radiogroup" aria-label="Show arrows">
                        <label className="et-radio">
                          <input
                            type="radio"
                            name={`gallery-arrows-${component.id}`}
                            checked={gallery.showArrows}
                            onChange={() => patchOptions({ showArrows: true })}
                          />
                          Yes
                        </label>
                        <label className="et-radio">
                          <input
                            type="radio"
                            name={`gallery-arrows-${component.id}`}
                            checked={!gallery.showArrows}
                            onChange={() => patchOptions({ showArrows: false })}
                          />
                          No
                        </label>
                      </div>
                    </div>
                    <div className="et-field-block">
                      <span className="et-field-caption">Show dots</span>
                      <div className="et-radio-row" role="radiogroup" aria-label="Show dots">
                        <label className="et-radio">
                          <input
                            type="radio"
                            name={`gallery-dots-${component.id}`}
                            checked={gallery.showDots}
                            onChange={() => patchOptions({ showDots: true })}
                          />
                          Yes
                        </label>
                        <label className="et-radio">
                          <input
                            type="radio"
                            name={`gallery-dots-${component.id}`}
                            checked={!gallery.showDots}
                            onChange={() => patchOptions({ showDots: false })}
                          />
                          No
                        </label>
                      </div>
                    </div>
                  </>
                ) : null}
              </>
            )
          })()}
        </>
      ) : null}

      {component.type === 'video' ? (
        <>
          <p className="et-inspector-label">Video And Audio</p>
          <div className="et-field-block">
            <span className="et-field-caption">Source</span>
            <div className="et-radio-row" role="radiogroup" aria-label="Media source">
              <label className="et-radio">
                <input
                  type="radio"
                  name={`media-source-${component.id}`}
                  checked={normalizeMediaSourceType(data.sourceType) === 'youtube'}
                  onChange={() =>
                    patchData({
                      sourceType: 'youtube',
                      fileId: null,
                      mediaKind: null,
                    })
                  }
                />
                YouTube link
              </label>
              <label className="et-radio">
                <input
                  type="radio"
                  name={`media-source-${component.id}`}
                  checked={normalizeMediaSourceType(data.sourceType) === 'file'}
                  onChange={() =>
                    patchData({
                      sourceType: 'file',
                      url: '',
                    })
                  }
                />
                Upload file
              </label>
            </div>
          </div>

          {normalizeMediaSourceType(data.sourceType) === 'youtube' ? (
            <label>
              YouTube URL
              <input
                value={String(data.url ?? '')}
                placeholder="https://www.youtube.com/watch?v=..."
                onChange={(e) =>
                  patchData({
                    sourceType: 'youtube',
                    url: e.target.value,
                    fileId: null,
                    mediaKind: null,
                  })
                }
              />
            </label>
          ) : (
            <ChunkMediaUploader
              component="editortryavideoaudio"
              parentId={component.id}
              label="Video or audio file"
              onUploaded={(uploaded, mediaKind) =>
                patchData({
                  sourceType: 'file',
                  fileId: uploaded.id,
                  mediaKind,
                  url: '',
                  mediaRevision: uploaded.id,
                })
              }
              onCleared={() =>
                patchData({
                  sourceType: 'file',
                  fileId: null,
                  mediaKind: null,
                  mediaRevision: '',
                })
              }
            />
          )}

          <label>
            Aspect ratio
            <select
              value={String(options.aspectRatio ?? '16/9')}
              onChange={(e) => patchOptions({ aspectRatio: e.target.value })}
            >
              <option value="16/9">16:9</option>
              <option value="4/3">4:3</option>
              <option value="1/1">1:1</option>
              <option value="9/16">9:16</option>
            </select>
          </label>
        </>
      ) : null}

      {component.type === 'spacer' ? (
        <label>
          Height (desktop)
          <input
            value={String(asRecord(options.height).desktop ?? '50px')}
            onChange={(e) =>
              patchOptions({
                height: {
                  ...asRecord(options.height),
                  desktop: e.target.value,
                },
              })
            }
          />
        </label>
      ) : null}

      {component.type === 'divider' ? (
        <>
          {(() => {
            const divider = parseDividerOptions(options, data)
            return (
              <>
                <label>
                  Width
                  <input
                    value={divider.width}
                    placeholder="100%"
                    onChange={(e) => patchOptions({ width: e.target.value })}
                  />
                </label>

                <div className="et-inline-fields">
                  <label>
                    Border size
                    <input
                      value={divider.thickness}
                      placeholder="1px"
                      onChange={(e) => patchOptions({ thickness: e.target.value })}
                    />
                  </label>
                  <label>
                    Style
                    <select
                      value={normalizeDividerLineStyle(divider.style)}
                      onChange={(e) => patchOptions({ style: e.target.value })}
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                    </select>
                  </label>
                </div>

                <div className="et-field-block">
                  <span className="et-field-caption">Line color</span>
                  <div className="et-color-field">
                    <input
                      type="color"
                      className="et-color-swatch"
                      value={
                        /^#[0-9a-fA-F]{6}$/.test(divider.color) ? divider.color : '#d5d7e2'
                      }
                      aria-label="Divider line color"
                      onChange={(e) => patchOptions({ color: e.target.value })}
                    />
                    <input
                      type="text"
                      value={divider.color}
                      spellCheck={false}
                      onChange={(e) => patchOptions({ color: e.target.value })}
                    />
                  </div>
                </div>

                <div className="et-field-block">
                  <span className="et-field-caption">Center content</span>
                  <div className="et-seg" role="group" aria-label="Divider center content">
                    {(
                      [
                        ['none', 'None'],
                        ['icon', 'Icon'],
                        ['text', 'Text'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`et-seg-btn et-seg-btn--text${normalizeDividerContentMode(divider.contentMode) === value ? ' is-active' : ''}`}
                        onClick={() => patchOptions({ contentMode: value })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {divider.contentMode === 'icon' ? (
                  <div className="et-field-block">
                    <span className="et-field-caption">Icon</span>
                    <div className="et-icon-grid" role="group" aria-label="Divider icon">
                      {DIVIDER_ICON_OPTIONS.map((item) => {
                        const Icon = item.icon
                        const active = normalizeDividerIcon(divider.icon) === item.name
                        return (
                          <button
                            key={item.name}
                            type="button"
                            className={`et-icon-pick${active ? ' is-active' : ''}`}
                            title={item.label}
                            aria-label={item.label}
                            onClick={() => patchOptions({ icon: item.name })}
                          >
                            <Icon size={15} strokeWidth={2.2} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {divider.contentMode === 'text' ? (
                  <label>
                    Center text
                    <input
                      value={divider.text}
                      placeholder="OR"
                      onChange={(e) => {
                        patchOptions({ text: e.target.value })
                        patchData({ text: e.target.value })
                      }}
                    />
                  </label>
                ) : null}

                {divider.contentMode !== 'none' ? (
                  <>
                    <div className="et-field-block">
                      <span className="et-field-caption">
                        {divider.contentMode === 'icon' ? 'Icon color' : 'Text color'}
                      </span>
                      <div className="et-color-field">
                        <input
                          type="color"
                          className="et-color-swatch"
                          value={
                            /^#[0-9a-fA-F]{6}$/.test(divider.contentColor)
                              ? divider.contentColor
                              : '#6f7280'
                          }
                          aria-label="Divider content color"
                          onChange={(e) => patchOptions({ contentColor: e.target.value })}
                        />
                        <input
                          type="text"
                          value={divider.contentColor}
                          spellCheck={false}
                          onChange={(e) => patchOptions({ contentColor: e.target.value })}
                        />
                      </div>
                    </div>
                    <label>
                      Gap
                      <input
                        value={divider.gap}
                        placeholder="12px"
                        onChange={(e) => patchOptions({ gap: e.target.value })}
                      />
                    </label>
                  </>
                ) : null}
              </>
            )
          })()}
        </>
      ) : null}
    </div>
  )
}
