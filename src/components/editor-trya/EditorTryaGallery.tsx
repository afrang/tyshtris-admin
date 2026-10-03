import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { mediaUrl, type MediaFile } from '../../lib/mediaApi'
import { parseGallerySettings } from '../../lib/editorTryaGalleryOptions'
import './EditorTryaGallery.css'

type Props = {
  files: MediaFile[]
  data?: Record<string, unknown> | null
  options?: Record<string, unknown> | null
  compact?: boolean
}

export function EditorTryaGallery({ files, data, options, compact = false }: Props) {
  const settings = parseGallerySettings(data, options)
  const ordered = useMemo(
    () => files.slice().sort((a, b) => a.ordered - b.ordered),
    [files],
  )
  const [page, setPage] = useState(0)

  if (ordered.length === 0) {
    return <div className="et-gallery-empty">No gallery images</div>
  }

  if (settings.layout === 'grid') {
    return (
      <div
        className={`et-gallery et-gallery--grid${compact ? ' et-gallery--compact' : ''}`}
        style={{
          gap: settings.gap,
          gridTemplateColumns: `repeat(${settings.columns}, minmax(0, 1fr))`,
        }}
      >
        {ordered.map((file) => (
          <img
            key={file.id}
            src={mediaUrl(file.fullAddress)}
            alt={file.namefile ?? file.filename ?? 'Gallery image'}
          />
        ))}
      </div>
    )
  }

  const perSlide = settings.slidesPerView
  const pageCount = Math.max(1, Math.ceil(ordered.length / perSlide))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * perSlide
  const visible = ordered.slice(start, start + perSlide)

  function go(delta: number) {
    setPage((current) => {
      const next = current + delta
      if (next < 0) return pageCount - 1
      if (next >= pageCount) return 0
      return next
    })
  }

  return (
    <div className={`et-gallery et-gallery--carousel${compact ? ' et-gallery--compact' : ''}`}>
      <div className="et-gallery-carousel-stage">
        {settings.showArrows && pageCount > 1 ? (
          <button
            type="button"
            className="et-gallery-nav et-gallery-nav--prev"
            aria-label="Previous slide"
            onClick={() => go(-1)}
          >
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>
        ) : null}

        <div
          className="et-gallery-slide"
          style={{
            gap: settings.gap,
            gridTemplateColumns: `repeat(${perSlide}, minmax(0, 1fr))`,
          }}
        >
          {visible.map((file) => (
            <img
              key={file.id}
              src={mediaUrl(file.fullAddress)}
              alt={file.namefile ?? file.filename ?? 'Gallery image'}
            />
          ))}
        </div>

        {settings.showArrows && pageCount > 1 ? (
          <button
            type="button"
            className="et-gallery-nav et-gallery-nav--next"
            aria-label="Next slide"
            onClick={() => go(1)}
          >
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        ) : null}
      </div>

      {settings.showDots && pageCount > 1 ? (
        <div className="et-gallery-dots" role="tablist" aria-label="Gallery slides">
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              className={`et-gallery-dot${index === safePage ? ' is-active' : ''}`}
              aria-label={`Go to slide ${index + 1}`}
              aria-selected={index === safePage}
              onClick={() => setPage(index)}
            />
          ))}
        </div>
      ) : null}

      <p className="et-gallery-meta">
        {perSlide} per slide · {safePage + 1}/{pageCount}
      </p>
    </div>
  )
}
