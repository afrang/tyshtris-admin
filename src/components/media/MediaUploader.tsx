import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  deleteMediaFile,
  getMediaFiles,
  mediaUrl,
  updateMediaOrder,
  uploadMediaFile,
  type MediaFile,
} from '../../lib/mediaApi'
import { confirmDialog } from '../../lib/swal'
import './MediaUploader.css'

type MediaUploaderProps = {
  component: string
  parentId: string
  multiple?: boolean
  label?: string
  onChange?: (files: MediaFile[]) => void
}

export function MediaUploader({
  component,
  parentId,
  multiple = false,
  label = 'Media',
  onChange,
}: MediaUploaderProps) {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
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

  async function handleUpload(fileList: FileList | null) {
    if (!fileList?.length || !parentId) return
    setUploading(true)
    setError(null)
    try {
      const selected = Array.from(fileList)
      if (!multiple) {
        await uploadMediaFile({ component, parentId, file: selected[0] })
      } else {
        for (const file of selected) {
          await uploadMediaFile({ component, parentId, file })
        }
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmDialog({
      title: 'Delete file?',
      text: 'This media file will be permanently removed.',
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
    if (!multiple) return
    const target = index + direction
    if (target < 0 || target >= orderedFiles.length) return
    const next = [...orderedFiles]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    await persistOrder(next)
  }

  function onDragStart(index: number) {
    if (!multiple) return
    setDragIndex(index)
  }

  async function onDrop(index: number) {
    if (!multiple || dragIndex === null || dragIndex === index) {
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
    <div className="media-uploader">
      <div className="media-uploader-head">
        <h3>{label}</h3>
        <button
          type="button"
          className="media-uploader-btn"
          disabled={!parentId || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : multiple ? 'Upload images' : files.length ? 'Replace image' : 'Upload image'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
          multiple={multiple}
          hidden
          onChange={(e) => void handleUpload(e.target.files)}
        />
      </div>

      {!parentId ? (
        <p className="media-uploader-muted">Save the record first to attach media (needs a parent GUID).</p>
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
          <strong>{multiple ? 'Drop or choose images' : 'Choose thumbnail'}</strong>
          <span>JPG, PNG, WEBP, GIF</span>
        </button>
      ) : null}

      <ul
        className={`media-uploader-grid${multiple ? ' media-uploader-grid--gallery' : ' media-uploader-grid--single'}`}
      >
        {orderedFiles.map((file, index) => (
          <li
            key={file.id}
            className="media-uploader-item"
            draggable={multiple}
            onDragStart={() => onDragStart(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void onDrop(index)}
          >
            <div className="media-uploader-thumb">
              <img src={mediaUrl(file.fullAddress)} alt={file.namefile ?? file.filename} />
              {multiple ? (
                <div className="media-uploader-order-controls">
                  <button
                    type="button"
                    className="media-uploader-order-btn"
                    title="Move earlier"
                    aria-label="Move image earlier"
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
                    aria-label="Move image later"
                    disabled={index === orderedFiles.length - 1}
                    onClick={(e) => {
                      e.stopPropagation()
                      void moveFile(index, 1)
                    }}
                  >
                    <ChevronRight size={16} strokeWidth={2.4} />
                  </button>
                </div>
              ) : null}
            </div>
            <div className="media-uploader-meta">
              <span>{file.namefile ?? file.filename}</span>
              {multiple ? <span className="media-uploader-order">#{index + 1}</span> : null}
            </div>
            <div className="media-uploader-actions">
              {!multiple ? (
                <button type="button" onClick={() => inputRef.current?.click()}>
                  Replace
                </button>
              ) : null}
              <button type="button" className="media-uploader-delete" onClick={() => void handleDelete(file.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
