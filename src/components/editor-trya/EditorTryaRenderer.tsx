import { useEffect, useState, type CSSProperties } from 'react'
import { getMediaFiles, mediaUrl, type MediaFile } from '../../lib/mediaApi'
import type { EditorComponent, EditorContainer, EditorTree } from '../../lib/editorTryaApi'
import { buttonOptionsToStyle } from '../../lib/editorTryaButtonOptions'
import {
  containerOptionsToStyle,
  parseContainerOptions,
} from '../../lib/editorTryaContainerOptions'
import { imageOptionsToStyle } from '../../lib/editorTryaImageOptions'
import { EditorTryaDivider } from './EditorTryaDivider'
import { EditorTryaGallery } from './EditorTryaGallery'
import { EditorTryaMedia } from './EditorTryaMedia'
import { normalizeMediaSourceType } from '../../lib/editorTryaMediaOptions'
import './EditorTryaRenderer.css'

type Props = {
  tree: EditorTree
  mediaMap?: Record<string, string>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function styleFromOptions(options: Record<string, unknown> | null | undefined): CSSProperties {
  const o = options ?? {}
  const style: CSSProperties = {}
  if (typeof o.color === 'string') style.color = o.color
  if (typeof o.fontSize === 'string') style.fontSize = o.fontSize
  if (typeof o.fontWeight === 'number') style.fontWeight = o.fontWeight
  if (typeof o.textAlign === 'string') style.textAlign = o.textAlign as CSSProperties['textAlign']
  if (typeof o.lineHeight === 'number' || typeof o.lineHeight === 'string') {
    style.lineHeight = o.lineHeight as CSSProperties['lineHeight']
  }
  return style
}

function TitleRenderer({ component }: { component: EditorComponent }) {
  const data = asRecord(component.data)
  const options = asRecord(component.options)
  const text = String(data.text ?? '')
  const heading = String(options.headingType ?? 'h2').toLowerCase()
  const Tag = (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(heading) ? heading : 'h2') as
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
  return <Tag style={styleFromOptions(options)}>{text}</Tag>
}

function TextRenderer({ component }: { component: EditorComponent }) {
  const data = asRecord(component.data)
  const options = asRecord(component.options)
  return (
    <div
      className="et-text"
      translate="no"
      style={styleFromOptions(options)}
      dangerouslySetInnerHTML={{ __html: String(data.html ?? '') }}
    />
  )
}

function ImageRenderer({
  component,
  mediaMap,
}: {
  component: EditorComponent
  mediaMap?: Record<string, string>
}) {
  const data = asRecord(component.data)
  const styles = imageOptionsToStyle(component.options)
  const fileId = typeof data.fileId === 'string' ? data.fileId : null
  const src = fileId && mediaMap?.[fileId] ? mediaUrl(mediaMap[fileId]) : null
  if (!src) return <div className="et-placeholder">Image</div>
  return (
    <div className="et-image-wrap" translate="no" style={styles.wrap}>
      <img
        className="et-image"
        src={src}
        alt={String(data.alt ?? '')}
        title={String(data.title ?? '')}
        style={styles.image}
      />
    </div>
  )
}

function ButtonRenderer({ component }: { component: EditorComponent }) {
  const data = asRecord(component.data)
  const styles = buttonOptionsToStyle(component.options)
  return (
    <div className="et-button-wrap" translate="no" style={styles.wrap}>
      <a
        className="et-button"
        href={String(data.url ?? '#')}
        target={String(data.target ?? '_self')}
        style={styles.button}
      >
        {String(data.text ?? 'Button')}
      </a>
    </div>
  )
}

function DividerRenderer({ component }: { component: EditorComponent }) {
  return <EditorTryaDivider options={component.options} data={component.data} />
}

function SpacerRenderer({ component }: { component: EditorComponent }) {
  const options = asRecord(component.options)
  const height = asRecord(options.height)
  const value = String(height.desktop ?? options.height ?? '40px')
  return <div className="et-spacer" style={{ height: value }} />
}

function QuoteRenderer({ component }: { component: EditorComponent }) {
  const data = asRecord(component.data)
  return (
    <blockquote className="et-quote">
      <p>{String(data.text ?? '')}</p>
      {data.cite ? <cite>{String(data.cite)}</cite> : null}
    </blockquote>
  )
}

function GalleryRenderer({ component }: { component: EditorComponent }) {
  const data = asRecord(component.data)
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    void getMediaFiles('editortryagallery', component.id)
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
  }, [component.id, String(data.mediaRevision ?? '')])

  if (loading) return <div className="et-placeholder">Loading gallery…</div>
  return (
    <EditorTryaGallery files={files} data={component.data} options={component.options} />
  )
}

function VideoAudioRenderer({
  component,
  mediaMap,
}: {
  component: EditorComponent
  mediaMap?: Record<string, string>
}) {
  const data = asRecord(component.data)
  const sourceType = normalizeMediaSourceType(data.sourceType)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(sourceType === 'file')

  useEffect(() => {
    if (sourceType !== 'file') {
      setFileUrl(null)
      setTitle(null)
      setLoading(false)
      return
    }

    const fileId = typeof data.fileId === 'string' ? data.fileId : null
    if (fileId && mediaMap?.[fileId]) {
      setFileUrl(mediaUrl(mediaMap[fileId]))
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    void getMediaFiles('editortryavideoaudio', component.id)
      .then((items) => {
        if (!active) return
        const match =
          items.find((item) => item.id === fileId) ??
          items.slice().sort((a, b) => a.ordered - b.ordered)[0] ??
          null
        setFileUrl(match ? mediaUrl(match.fullAddress) : null)
        setTitle(match?.namefile ?? match?.filename ?? null)
      })
      .catch(() => {
        if (active) {
          setFileUrl(null)
          setTitle(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [component.id, sourceType, String(data.fileId ?? ''), mediaMap])

  if (loading) return <div className="et-placeholder">Loading media…</div>
  return (
    <EditorTryaMedia 
      data={component.data}
      options={component.options}
      fileUrl={fileUrl}
      title={title}
    />
  )
}

function ComponentRenderer({
  component,
  mediaMap,
}: {
  component: EditorComponent
  mediaMap?: Record<string, string>
}) {
  if (!component.publish) return null
  switch (component.type) {
    case 'title':
      return <TitleRenderer component={component} />
    case 'text':
    case 'html':
      return <TextRenderer component={component} />
    case 'image':
      return <ImageRenderer component={component} mediaMap={mediaMap} />
    case 'button':
      return <ButtonRenderer component={component} />
    case 'divider':
      return <DividerRenderer component={component} />
    case 'spacer':
      return <SpacerRenderer component={component} />
    case 'quote':
      return <QuoteRenderer component={component} />
    case 'gallery':
      return <GalleryRenderer component={component} />
    case 'video':
      return <VideoAudioRenderer component={component} mediaMap={mediaMap} />
    default:
      return <div className="et-placeholder">{component.type}</div>
  }
}

function ContainerRenderer({
  container,
  mediaMap,
}: {
  container: EditorContainer
  mediaMap?: Record<string, string>
}) {
  if (!container.publish) return null
  const cols = container.cols === 4 || container.cols === 6 || container.cols === 12 ? container.cols : 12
  const layout = containerOptionsToStyle(parseContainerOptions(container.options))
  return (
    <section
      className="et-container"
      data-role={container.component ?? 'section'}
      style={{ gridColumn: `span ${cols}`, ...layout }}
    >
      {container.components
        .slice()
        .sort((a, b) => a.ordered - b.ordered)
        .map((component) => (
          <div key={component.id} className="et-component">
            <ComponentRenderer component={component} mediaMap={mediaMap} />
          </div>
        ))}
    </section>
  )
}

export function EditorTryaRenderer({ tree, mediaMap }: Props) {
  if (!tree.publish) return null
  return (
    <div className="et-renderer" translate="no">
      {tree.containers
        .slice()
        .sort((a, b) => a.ordered - b.ordered)
        .map((container) => (
          <ContainerRenderer key={container.id} container={container} mediaMap={mediaMap} />
        ))}
    </div>
  )
}
