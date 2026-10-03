import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, FileAudio, FileVideo, ImageIcon } from 'lucide-react'
import {
  deleteMediaFile,
  getMediaFiles,
  mediaUrl,
  updateMediaOrder,
  uploadMediaFile,
  uploadMediaFileChunked,
  type MediaFile,
} from '../../lib/mediaApi'
import { detectGalleryMediaKind, type GalleryMediaKind } from '../../lib/editorTryaMediaOptions'
import { confirmDialog } from '../../lib/swal'
import { AudioPlayer } from './AudioPlayer'
import './MediaUploader.css'
import './GalleryMediaUploader.css'

const ACCEPT =
  'image/*,video/*,audio/*,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.ogg,.mov,.m4v,.mp3,.wav,.m4a,.aac,.oga'
const CHUNK_THRESHOLD_BYTES = 4 * 1024 * 1024

type GalleryMediaUploaderProps = {
  component: string
  parentId: string
  label?: string
  onChange?: (files: MediaFile[]) => void
}

function mediaKind(file: MediaFile): GalleryMediaKind {
  return detectGalleryMediaKind(file.extension || file.filename || file.namefile || '')
}

function KindIcon({ kind }: { kind: GalleryMediaKind }) {
  if (kind === 'video') return <FileVideo size={18} strokeWidth={2} />
  if (kind === 'audio') return <FileAudio size={18} strokeWidth={2} />
  return <ImageIcon size={18} strokeWidth={2} />
}

export function GalleryMediaUploader({
  component,
  parentId,
  label = 'Gallery media',
  onChange,
}: GalleryMediaUploaderProps) {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    if (!component || !parentId) {
      setFiles([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const items = await getMediaFiles(component, parentId)
      setFiles(items)
      onChange?.(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- parent onChange may be inline
  }, [component, parentId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function uploadOne(file: File) {
    const kind = detectGalleryMediaKind(file.name)
    const useChunked = kind !== 'image' || file.size > CHUNK_THRESHOLD_BYTES
    if (useChunked) {
      return uploadMediaFileChunked({
        component,
        parentId,
        file,
        onProgress: setProgress,
      })
    }
    return uploadMediaFile({ component, parentId, file })
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList?.length || !parentId) return
    setUploading(true)
    setProgress(0)
    setError(null)
    try {
      for (const file of Array.from(fileList)) {
        await uploadOne(file)
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmDialog({
      title: 'Delete media?',
      text: 'This gallery file will be permanently removed.',
    })
    if (!confirmed) return
    setError(null)
    try {
      await deleteMediaFile(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  const orderedFiles = useMemo(
    () => files.slice().sort((a, b) => a.ordered - b.ordered),
    [files],
  )

  async function persistOrder(next: MediaFile[]) {
    const normalized = next.map((file, index) => ({ ...file, ordered: index + 1 }))
    setFiles(normalized)
    try {
      await updateMediaOrder(normalized.map((file) => ({ id: file.id, ordered: file.ordered })))
      onChange?.(normalized)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order.')
      await refresh()
    }
  }

  async function moveFile(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= orderedFiles.length) return
    const next = [...orderedFiles]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    await persistOrder(next)
  }

  function onDragStart(index: number) {
    setDragIndex(index)
  }

  async function onDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      return
    }

    const next = [...orderedFiles]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(index, 0, moved)
    setDragIndex(null)
    await persistOrder(next)
  }

  return (
    <div className="media-uploader gallery-media-uploader">
      <div className="media-uploader-head">
        <h3>{label}</h3>
        <button
          type="button"
          className="media-uploader-btn"
          disabled={!parentId || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading
            ? progress != null
              ? `Uploading… ${progress}%`
              : 'Uploading…'
            : 'Add images / video / audio'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => void handleUpload(e.target.files)}
        />
      </div>

      {!parentId ? (
        <p className="media-uploader-muted">
          Create the gallery first, then attach images, video, or audio.
        </p>
      ) : null}

      {error ? <p className="media-uploader-error">{error}</p> : null}
      {loading ? <p className="media-uploader-muted">Loading media…</p> : null}

      {!loading && files.length === 0 && parentId ? (
        <button
          type="button"
          className="media-uploader-dropzone"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <strong>Drop or choose media</strong>
          <span>Images, video, or audio</span>
        </button>
      ) : null}

      <ul className="media-uploader-grid media-uploader-grid--gallery">
        {orderedFiles.map((file, index) => {
          const kind = mediaKind(file)
          const src = mediaUrl(file.fullAddress)
          return (
            <li
              key={file.id}
              className="media-uploader-item"
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void onDrop(index)}
            >
              <div className={`media-uploader-thumb gallery-media-thumb gallery-media-thumb--${kind}`}>
                {kind === 'image' ? (
                  <img src={src} alt={file.namefile ?? file.filename} />
                ) : null}
                {kind === 'video' ? (
                  <video src={src} controls preload="metadata" />
                ) : null}
                {kind === 'audio' ? (
                  <div className="gallery-media-audio">
                    <AudioPlayer src={src} title={file.namefile ?? file.filename} compact />
                  </div>
                ) : null}
                <div className="media-uploader-order-controls">
                  <button
                    type="button"
                    className="media-uploader-order-btn"
                    title="Move earlier"
                    aria-label="Move media earlier"
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation()
                      void moveFile(index, -1)
                    }}
                  >
                    <ChevronLeft size={16} strokeWidth={2.4} />
                  </button>
                  <button
                    type="button"
                    className="media-uploader-order-btn"
                    title="Move later"
                    aria-label="Move media later"
                    disabled={index === orderedFiles.length - 1}
                    onClick={(e) => {
                      e.stopPropagation()
                      void moveFile(index, 1)
                    }}
                  >
                    <ChevronRight size={16} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
              <div className="media-uploader-meta">
                <span className="gallery-media-kind">
                  <KindIcon kind={kind} />
                  {kind}
                </span>
                <span>{file.namefile ?? file.filename}</span>
                <span className="media-uploader-order">#{index + 1}</span>
              </div>
              <div className="media-uploader-actions">
                <button
                  type="button"
                  className="media-uploader-delete"
                  onClick={() => void handleDelete(file.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
