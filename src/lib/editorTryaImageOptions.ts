import type { CSSProperties } from 'react'

export type ImageAlignment = 'left' | 'center' | 'right'
export type ImageObjectFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
export type ImageDisplay = 'block' | 'inline-block' | 'inline'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function normalizeImageAlignment(value: unknown): ImageAlignment {
  if (value === 'left' || value === 'center' || value === 'right') return value
  return 'center'
}

export function normalizeImageObjectFit(value: unknown): ImageObjectFit {
  if (
    value === 'cover' ||
    value === 'contain' ||
    value === 'fill' ||
    value === 'none' ||
    value === 'scale-down'
  ) {
    return value
  }
  return 'cover'
}

export function normalizeImageDisplay(value: unknown): ImageDisplay {
  if (value === 'block' || value === 'inline-block' || value === 'inline') return value
  return 'block'
}

export function imageOptionsToStyle(optionsValue: unknown): {
  wrap: CSSProperties
  image: CSSProperties
} {
  const options = asRecord(optionsValue)
  const alignment = normalizeImageAlignment(options.alignment)
  const objectFit = normalizeImageObjectFit(options.objectFit)
  const display = normalizeImageDisplay(options.display)
  const width = asString(options.width)
  const maxWidth = asString(options.maxWidth, '100%')
  const height = asString(options.height)
  const borderRadius = asString(options.borderRadius, '0px')

  return {
    wrap: {
      display: 'flex',
      justifyContent:
        alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
      width: '100%',
    },
    image: {
      display,
      width: width || '100%',
      maxWidth: maxWidth || undefined,
      height: height || 'auto',
      objectFit,
      borderRadius: borderRadius || undefined,
    },
  }
}
