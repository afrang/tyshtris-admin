import { useEffect, useRef, useState } from 'react'
import {
  deleteMediaFile,
  getMediaFiles,
  mediaUrl,
  uploadMediaFileChunked,
  type MediaFile,
} from '../../lib/mediaApi'
import { confirmDialog } from '../../lib/swal'
import { detectMediaKind } from '../../lib/editorTryaMediaOptions'
import { AudioPlayer } from './AudioPlayer'
import './ChunkMediaUploader.css'

type Props = {
  component: string
  parentId: string
  label?: string
  accept?: string
  onUploaded?: (file: MediaFile, mediaKind: 'video' | 'audio') => void
  onCleared?: () => void
}

export function ChunkMediaUploader({
  component,
  parentId,
  label = 'Media file',
  accept = 'video/*,audio/*,.mp4,.webm,.mov,.mp3,.wav,.m4a,.aac,.ogg',
  onUploaded,
  onCleared,
}: Props) {
  const [file, setFile] = useState<MediaFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    if (!component || !parentId) {
      setFile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    void getMediaFiles(component, parentId)
      .then((items) => {
        if (!active) return
        const first = items.slice().sort((a, b) => a.ordered - b.ordered)[0] ?? null
        setFile(first)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load media.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [component, parentId])

  async function handleUpload(fileList: FileList | null) {
    const selected = fileList?.[0]
    if (!selected || !parentId) return
    setUploading(true)
    setProgress(0)
    setError(null)
    try {
      const uploaded = await uploadMediaFileChunked({
        component,
        parentId,
        file: selected,
        onProgress: setProgress,
      })
      setFile(uploaded)
      onUploaded?.(uploaded, detectMediaKind(uploaded.extension || selected.name))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete() {
    if (!file) return
    const confirmed = await confirmDialog({
      title: 'Delete media file?',
      text: 'This video/audio file will be permanently removed.',
    })
    if (!confirmed) return
    setError(null)
    try {
      await deleteMediaFile(file.id)
      setFile(null)
      onCleared?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  const kind = file ? detectMediaKind(file.extension || file.filename) : null

  return (
    <div className="chunk-uploader">
      <div className="chunk-uploader-head">
        <h3>{label}</h3>
        <button
          type="button"
          className="chunk-uploader-btn"
          disabled={!parentId || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? `Uploading ${progress}%` : file ? 'Replace file' : 'Upload file'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => void handleUpload(e.target.files)}
        />
      </div>

      <p className="chunk-uploader-hint">
        Supports large video/audio uploads via chunked transfer (mp4, webm, mov, mp3, wav, m4a…).
      </p>

      {error ? <p className="chunk-uploader-error">{error}</p> : null}
      {loading ? <p className="chunk-uploader-muted">Loading media…</p> : null}

      {uploading ? (
        <div className="chunk-uploader-progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      {file ? (
        <div className="chunk-uploader-preview">
          {kind === 'audio' ? (
            <AudioPlayer
              src={mediaUrl(file.fullAddress)}
              title={file.namefile ?? file.filename}
              compact
            />
          ) : (
            <video controls src={mediaUrl(file.fullAddress)} />
          )}
          <div className="chunk-uploader-meta">
            <span>{file.namefile ?? file.filename}</span>
            <button type="button" className="chunk-uploader-delete" onClick={() => void handleDelete()}>
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
