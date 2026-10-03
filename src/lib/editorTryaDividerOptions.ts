import type { CSSProperties } from 'react'
import type { ComponentType } from 'react'
import {
  Asterisk,
  Check,
  Circle,
  Diamond,
  Flower2,
  Heart,
  Minus,
  Moon,
  Sparkles,
  Star,
  Sun,
  Zap,
  type LucideProps,
} from 'lucide-react'

export type DividerLineStyle = 'solid' | 'dashed' | 'dotted'
export type DividerContentMode = 'none' | 'icon' | 'text'

export type DividerIconName =
  | 'star'
  | 'heart'
  | 'sparkles'
  | 'minus'
  | 'circle'
  | 'diamond'
  | 'asterisk'
  | 'flower'
  | 'sun'
  | 'moon'
  | 'zap'
  | 'check'

export const DIVIDER_ICON_OPTIONS: Array<{
  name: DividerIconName
  label: string
  icon: ComponentType<LucideProps>
}> = [
  { name: 'star', label: 'Star', icon: Star },
  { name: 'heart', label: 'Heart', icon: Heart },
  { name: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { name: 'minus', label: 'Minus', icon: Minus },
  { name: 'circle', label: 'Circle', icon: Circle },
  { name: 'diamond', label: 'Diamond', icon: Diamond },
  { name: 'asterisk', label: 'Asterisk', icon: Asterisk },
  { name: 'flower', label: 'Flower', icon: Flower2 },
  { name: 'sun', label: 'Sun', icon: Sun },
  { name: 'moon', label: 'Moon', icon: Moon },
  { name: 'zap', label: 'Zap', icon: Zap },
  { name: 'check', label: 'Check', icon: Check },
]

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function normalizeDividerLineStyle(value: unknown): DividerLineStyle {
  if (value === 'dashed' || value === 'dotted' || value === 'solid') return value
  return 'solid'
}

export function normalizeDividerContentMode(value: unknown): DividerContentMode {
  if (value === 'icon' || value === 'text' || value === 'none') return value
  return 'none'
}

export function normalizeDividerIcon(value: unknown): DividerIconName {
  const name = asString(value, 'star') as DividerIconName
  return DIVIDER_ICON_OPTIONS.some((item) => item.name === name) ? name : 'star'
}

export type ParsedDividerOptions = {
  style: DividerLineStyle
  width: string
  thickness: string
  color: string
  contentMode: DividerContentMode
  icon: DividerIconName
  text: string
  contentColor: string
  gap: string
}

export function parseDividerOptions(optionsValue: unknown, dataValue?: unknown): ParsedDividerOptions {
  const options = asRecord(optionsValue)
  const data = asRecord(dataValue)
  return {
    style: normalizeDividerLineStyle(options.style),
    width: asString(options.width, '100%'),
    thickness: asString(options.thickness, '1px'),
    color: asString(options.color, '#d5d7e2'),
    contentMode: normalizeDividerContentMode(options.contentMode),
    icon: normalizeDividerIcon(options.icon),
    text: asString(options.text || data.text, ''),
    contentColor: asString(options.contentColor, '#6f7280'),
    gap: asString(options.gap, '12px'),
  }
}

export function getDividerIcon(name: DividerIconName): ComponentType<LucideProps> {
  return DIVIDER_ICON_OPTIONS.find((item) => item.name === name)?.icon ?? Star
}

export function dividerLineStyle(options: ParsedDividerOptions): CSSProperties {
  return {
    borderTopStyle: options.style,
    borderTopWidth: options.thickness || '1px',
    borderTopColor: options.color || '#d5d7e2',
  }
}

export function dividerWrapStyle(options: ParsedDividerOptions): CSSProperties {
  return {
    width: options.width || '100%',
    gap: options.contentMode === 'none' ? undefined : options.gap || '12px',
  }
}
