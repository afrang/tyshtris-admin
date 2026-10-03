import {
  dividerLineStyle,
  dividerWrapStyle,
  getDividerIcon,
  parseDividerOptions,
} from '../../lib/editorTryaDividerOptions'

type Props = {
  options?: Record<string, unknown> | null
  data?: Record<string, unknown> | null
  className?: string
}

export function EditorTryaDivider({ options, data, className }: Props) {
  const parsed = parseDividerOptions(options, data)
  const Icon = getDividerIcon(parsed.icon)
  const showContent =
    parsed.contentMode === 'icon' ||
    (parsed.contentMode === 'text' && Boolean(parsed.text.trim()))

  return (
    <div
      className={`et-divider${showContent ? ' et-divider--with-content' : ''}${className ? ` ${className}` : ''}`}
      style={dividerWrapStyle(parsed)}
    >
      <span className="et-divider-line" style={dividerLineStyle(parsed)} />
      {showContent ? (
        <span className="et-divider-content" style={{ color: parsed.contentColor }}>
          {parsed.contentMode === 'icon' ? (
            <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <span className="et-divider-text">{parsed.text}</span>
          )}
        </span>
      ) : null}
      {showContent ? <span className="et-divider-line" style={dividerLineStyle(parsed)} /> : null}
    </div>
  )
}
