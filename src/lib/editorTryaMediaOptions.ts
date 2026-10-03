const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'oga', 'ogg'])

export type MediaSourceType = 'youtube' | 'file'
export type GalleryMediaKind = 'image' | 'video' | 'audio'

export function normalizeMediaSourceType(value: unknown): MediaSourceType {
  if (value === 'file') return 'file'
  return 'youtube'
}

function extensionOf(fileNameOrExt: string): string {
  return fileNameOrExt.includes('.')
    ? fileNameOrExt.split('.').pop()?.toLowerCase() ?? ''
    : fileNameOrExt.toLowerCase()
}

export function detectGalleryMediaKind(fileNameOrExt: string): GalleryMediaKind {
  const ext = extensionOf(fileNameOrExt)
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (AUDIO_EXTENSIONS.has(ext) && !VIDEO_EXTENSIONS.has(ext)) return 'audio'
  if (ext === 'ogg') return 'audio'
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  return 'image'
}

export function detectMediaKind(fileNameOrExt: string): 'video' | 'audio' {
  const kind = detectGalleryMediaKind(fileNameOrExt)
  return kind === 'audio' ? 'audio' : 'video'
}

export function extractYouTubeId(url: string): string | null {
  const value = url.trim()
  if (!value) return null

  try {
    const parsed = new URL(value)
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '').trim()
      return id || null
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v')
      if (id) return id
      const parts = parsed.pathname.split('/').filter(Boolean)
      const embedIndex = parts.indexOf('embed')
      if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1]
      const shortsIndex = parts.indexOf('shorts')
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) return parts[shortsIndex + 1]
    }
  } catch {
    // ignore invalid URLs
  }

  return null
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeId(url)
  return id ? `https://www.youtube.com/embed/${id}` : null
}
