export type GalleryLayout = 'grid' | 'carousel'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export function normalizeGalleryLayout(value: unknown): GalleryLayout {
  return value === 'carousel' ? 'carousel' : 'grid'
}

export function normalizeSlidesPerView(value: unknown, fallback = 1): number {
  const n = Math.round(asNumber(value, fallback))
  return Math.min(6, Math.max(1, n))
}

export type ParsedGallerySettings = {
  layout: GalleryLayout
  columns: number
  slidesPerView: number
  gap: string
  showArrows: boolean
  showDots: boolean
}

export function parseGallerySettings(
  dataValue: unknown,
  optionsValue: unknown,
): ParsedGallerySettings {
  const data = asRecord(dataValue)
  const options = asRecord(optionsValue)
  const layout = normalizeGalleryLayout(data.layout ?? options.layout)
  const columns = normalizeSlidesPerView(data.columns ?? options.columns, 3)
  const slidesPerView = normalizeSlidesPerView(
    options.slidesPerView ?? data.slidesPerView ?? columns,
    layout === 'carousel' ? 1 : columns,
  )

  return {
    layout,
    columns,
    slidesPerView,
    gap: asString(options.gap, '12px'),
    showArrows: options.showArrows !== false,
    showDots: options.showDots !== false,
  }
}
