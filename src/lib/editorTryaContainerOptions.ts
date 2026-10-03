import type { CSSProperties } from 'react'

export type ContainerHeightMode = 'hug' | 'fixed' | 'fill'

export type ContainerDirection = 'column' | 'row'

export type ContainerJustify =
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'space-between'
  | 'space-around'

export type ContainerAlign = 'stretch' | 'flex-start' | 'center' | 'flex-end'

export type ContainerOverflow = 'visible' | 'hidden' | 'auto'

export type ContainerOptions = {
  paddingTop?: string
  paddingRight?: string
  paddingBottom?: string
  paddingLeft?: string
  gap?: string
  direction?: ContainerDirection
  justifyContent?: ContainerJustify
  alignItems?: ContainerAlign
  heightMode?: ContainerHeightMode
  height?: string
  minHeight?: string
  maxHeight?: string
  overflow?: ContainerOverflow
  borderRadius?: string
  background?: string
}

/** Defaults applied when creating a new container. */
export const DEFAULT_CONTAINER_OPTIONS: Required<
  Pick<
    ContainerOptions,
    | 'paddingTop'
    | 'paddingRight'
    | 'paddingBottom'
    | 'paddingLeft'
    | 'gap'
    | 'direction'
    | 'justifyContent'
    | 'alignItems'
    | 'heightMode'
    | 'height'
    | 'minHeight'
    | 'maxHeight'
    | 'overflow'
    | 'borderRadius'
    | 'background'
  >
> = {
  paddingTop: '16px',
  paddingRight: '16px',
  paddingBottom: '16px',
  paddingLeft: '16px',
  gap: '12px',
  direction: 'column',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  heightMode: 'hug',
  height: '240px',
  minHeight: '',
  maxHeight: '',
  overflow: 'visible',
  borderRadius: '0px',
  background: '',
}

/** Fallbacks when reading containers that have no options yet. */
const EMPTY_CONTAINER_OPTIONS: Required<typeof DEFAULT_CONTAINER_OPTIONS> = {
  paddingTop: '',
  paddingRight: '',
  paddingBottom: '',
  paddingLeft: '',
  gap: '',
  direction: 'column',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  heightMode: 'hug',
  height: '240px',
  minHeight: '',
  maxHeight: '',
  overflow: 'visible',
  borderRadius: '',
  background: '',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function parseContainerOptions(value: unknown): ContainerOptions {
  const raw = asRecord(value)
  const heightMode = asString(raw.heightMode, EMPTY_CONTAINER_OPTIONS.heightMode)
  const direction = asString(raw.direction, EMPTY_CONTAINER_OPTIONS.direction)
  const justifyContent = asString(raw.justifyContent, EMPTY_CONTAINER_OPTIONS.justifyContent)
  const alignItems = asString(raw.alignItems, EMPTY_CONTAINER_OPTIONS.alignItems)
  const overflow = asString(raw.overflow, EMPTY_CONTAINER_OPTIONS.overflow)

  return {
    paddingTop: asString(raw.paddingTop, EMPTY_CONTAINER_OPTIONS.paddingTop),
    paddingRight: asString(raw.paddingRight, EMPTY_CONTAINER_OPTIONS.paddingRight),
    paddingBottom: asString(raw.paddingBottom, EMPTY_CONTAINER_OPTIONS.paddingBottom),
    paddingLeft: asString(raw.paddingLeft, EMPTY_CONTAINER_OPTIONS.paddingLeft),
    gap: asString(raw.gap, EMPTY_CONTAINER_OPTIONS.gap),
    direction: direction === 'row' ? 'row' : 'column',
    justifyContent: (
      ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'] as const
    ).includes(justifyContent as ContainerJustify)
      ? (justifyContent as ContainerJustify)
      : 'flex-start',
    alignItems: (['stretch', 'flex-start', 'center', 'flex-end'] as const).includes(
      alignItems as ContainerAlign,
    )
      ? (alignItems as ContainerAlign)
      : 'stretch',
    heightMode: (['hug', 'fixed', 'fill'] as const).includes(heightMode as ContainerHeightMode)
      ? (heightMode as ContainerHeightMode)
      : 'hug',
    height: asString(raw.height, EMPTY_CONTAINER_OPTIONS.height),
    minHeight: asString(raw.minHeight, EMPTY_CONTAINER_OPTIONS.minHeight),
    maxHeight: asString(raw.maxHeight, EMPTY_CONTAINER_OPTIONS.maxHeight),
    overflow: (['visible', 'hidden', 'auto'] as const).includes(overflow as ContainerOverflow)
      ? (overflow as ContainerOverflow)
      : 'visible',
    borderRadius: asString(raw.borderRadius, EMPTY_CONTAINER_OPTIONS.borderRadius),
    background: asString(raw.background, EMPTY_CONTAINER_OPTIONS.background),
  }
}

export function arePaddingSidesLinked(options: ContainerOptions): boolean {
  const top = options.paddingTop ?? ''
  return (
    top === (options.paddingRight ?? '') &&
    top === (options.paddingBottom ?? '') &&
    top === (options.paddingLeft ?? '')
  )
}

export function containerOptionsToStyle(options: ContainerOptions): CSSProperties {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: options.direction ?? 'column',
    justifyContent: options.justifyContent ?? 'flex-start',
    alignItems: options.alignItems ?? 'stretch',
    gap: options.gap || undefined,
    paddingTop: options.paddingTop || undefined,
    paddingRight: options.paddingRight || undefined,
    paddingBottom: options.paddingBottom || undefined,
    paddingLeft: options.paddingLeft || undefined,
    minHeight: options.minHeight || undefined,
    maxHeight: options.maxHeight || undefined,
    overflow: options.overflow || undefined,
    borderRadius: options.borderRadius || undefined,
    background: options.background || undefined,
  }

  const mode = options.heightMode ?? 'hug'
  if (mode === 'fixed') {
    style.height = options.height || undefined
  } else if (mode === 'fill') {
    style.height = '100%'
    style.flex = '1 1 auto'
  } else {
    style.height = 'auto'
  }

  return style
}
