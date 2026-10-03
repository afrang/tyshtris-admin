import type { CSSProperties } from 'react'

export type ButtonAlignment = 'left' | 'center' | 'right'

export const BUTTON_SHADOW_PRESETS: Record<string, string> = {
  none: 'none',
  soft: '0 2px 8px rgba(15, 23, 42, 0.12)',
  medium: '0 6px 18px rgba(15, 23, 42, 0.16)',
  strong: '0 12px 28px rgba(15, 23, 42, 0.22)',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function normalizeButtonAlignment(value: unknown): ButtonAlignment {
  if (value === 'center' || value === 'right' || value === 'left') return value
  return 'left'
}

export function resolveButtonShadow(options: Record<string, unknown>): string {
  const shadow = asString(options.boxShadow)
  if (shadow) return shadow
  const preset = asString(options.shadow, 'none')
  return BUTTON_SHADOW_PRESETS[preset] ?? BUTTON_SHADOW_PRESETS.none
}

export function buttonOptionsToStyle(optionsValue: unknown): {
  wrap: CSSProperties
  button: CSSProperties
} {
  const options = asRecord(optionsValue)
  const alignment = normalizeButtonAlignment(options.alignment)
  const size = asString(options.size, 'medium')
  const padding =
    size === 'small' ? '0.45rem 0.85rem' : size === 'large' ? '0.85rem 1.45rem' : '0.65rem 1.1rem'
  const fontSize = size === 'small' ? '0.82rem' : size === 'large' ? '1.05rem' : '0.92rem'

  return {
    wrap: {
      display: 'flex',
      justifyContent:
        alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
    },
    button: {
      background: asString(options.backgroundColor, '#9a55f0'),
      color: asString(options.color, '#ffffff'),
      borderRadius: asString(options.borderRadius, '6px'),
      boxShadow: resolveButtonShadow(options),
      padding,
      fontSize,
    },
  }
}
