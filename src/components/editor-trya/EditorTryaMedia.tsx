import { mediaUrl } from '../../lib/mediaApi'
import {
  detectMediaKind,
  normalizeMediaSourceType,
  youtubeEmbedUrl,
} from '../../lib/editorTryaMediaOptions'
import { AudioPlayer } from '../media/AudioPlayer'
import './EditorTryaMedia.css'

type Props = {
  data?: Record<string, unknown> | null
  options?: Record<string, unknown> | null
  fileUrl?: string | null
  title?: string | null
  compact?: boolean
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export function EditorTryaMedia({
  data,
  options,
  fileUrl,
  title,
  compact = false,
}: Props) {
  const parsed = asRecord(data)
  const opts = asRecord(options)
  const sourceType = normalizeMediaSourceType(parsed.sourceType)
  const aspectRatio = String(opts.aspectRatio ?? '16/9')
  const trackTitle =
    title ??
    (typeof parsed.title === 'string' ? parsed.title : null) ??
    (typeof parsed.fileName === 'string' ? parsed.fileName : null)

  if (sourceType === 'youtube') {
    const embed = youtubeEmbedUrl(String(parsed.url ?? ''))
    if (!embed) {
      return <div className="et-media-empty">Add a YouTube link</div>
    }
    return (
      <div
        className={`et-media-frame${compact ? ' et-media-frame--compact' : ''}`}
        style={{ aspectRatio }}
      >
        <iframe
          src={embed}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  if (!fileUrl) {
    return <div className="et-media-empty">Upload a video or audio file</div>
  }

  const kind =
    parsed.mediaKind === 'audio' || parsed.mediaKind === 'video'
      ? parsed.mediaKind
      : detectMediaKind(fileUrl)

  if (kind === 'audio') {
    return <AudioPlayer src={fileUrl} title={trackTitle} compact={compact} />
  }

  return (
    <div
      className={`et-media-frame${compact ? ' et-media-frame--compact' : ''}`}
      style={{ aspectRatio }}
    >
      <video controls src={fileUrl} />
    </div>
  )
}

export function resolveMediaFileUrl(
  data: Record<string, unknown> | null | undefined,
  mediaMap?: Record<string, string>,
): string | null {
  const parsed = asRecord(data)
  const fileId = typeof parsed.fileId === 'string' ? parsed.fileId : null
  if (!fileId || !mediaMap?.[fileId]) return null
  return mediaUrl(mediaMap[fileId])
}
