import { useEffect, useState } from 'react'
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceBetween,
  Columns3,
  Link2,
  Link2Off,
  Rows3,
  StretchHorizontal,
} from 'lucide-react'
import {
  arePaddingSidesLinked,
  parseContainerOptions,
  type ContainerAlign,
  type ContainerDirection,
  type ContainerHeightMode,
  type ContainerJustify,
  type ContainerOptions,
  type ContainerOverflow,
} from '../../lib/editorTryaContainerOptions'
import type { EditorContainer } from '../../lib/editorTryaApi'

type Props = {
  container: EditorContainer
  onChange: (next: EditorContainer) => void
}

const CONTAINER_COLS = [4, 6, 12] as const
const CONTAINER_ROLES = ['section', 'hero', 'row', 'sidebar', 'footer'] as const

function normalizeCols(cols: number | null | undefined): number {
  if (cols === 4 || cols === 6 || cols === 12) return cols
  return 12
}

export function ContainerInspector({ container, onChange }: Props) {
  const options = parseContainerOptions(container.options)
  const [paddingLinked, setPaddingLinked] = useState(() => arePaddingSidesLinked(options))

  useEffect(() => {
    setPaddingLinked(arePaddingSidesLinked(parseContainerOptions(container.options)))
  }, [container.id])

  function patchOptions(patch: Partial<ContainerOptions>) {
    const nextOptions = { ...options, ...patch }
    onChange({
      ...container,
      options: nextOptions,
    })
  }

  function setPaddingSide(
    side: 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft',
    value: string,
  ) {
    if (paddingLinked) {
      patchOptions({
        paddingTop: value,
        paddingRight: value,
        paddingBottom: value,
        paddingLeft: value,
      })
      return
    }
    patchOptions({ [side]: value })
  }

  return (
    <div className="et-inspector">
      <p className="et-inspector-label">Container</p>

      <section className="et-inspector-section">
        <h4>Basics</h4>
        <label>
          Role
          <input
            list="et-container-roles"
            value={container.component ?? ''}
            onChange={(e) =>
              onChange({
                ...container,
                component: e.target.value || null,
              })
            }
          />
          <datalist id="et-container-roles">
            {CONTAINER_ROLES.map((role) => (
              <option key={role} value={role} />
            ))}
          </datalist>
        </label>
        <label>
          Cols
          <select
            value={normalizeCols(container.cols)}
            onChange={(e) =>
              onChange({
                ...container,
                cols: Number(e.target.value),
              })
            }
          >
            {CONTAINER_COLS.map((cols) => (
              <option key={cols} value={cols}>
                {cols}
              </option>
            ))}
          </select>
        </label>
        <label className="et-check">
          <input
            type="checkbox"
            checked={container.publish}
            onChange={(e) =>
              onChange({
                ...container,
                publish: e.target.checked,
              })
            }
          />
          Published
        </label>
      </section>

      <section className="et-inspector-section">
        <h4>Auto layout</h4>
        <div className="et-seg" role="group" aria-label="Direction">
          <button
            type="button"
            className={`et-seg-btn${options.direction === 'column' ? ' is-active' : ''}`}
            title="Vertical"
            aria-label="Vertical direction"
            onClick={() => patchOptions({ direction: 'column' satisfies ContainerDirection })}
          >
            <Rows3 size={15} />
          </button>
          <button
            type="button"
            className={`et-seg-btn${options.direction === 'row' ? ' is-active' : ''}`}
            title="Horizontal"
            aria-label="Horizontal direction"
            onClick={() => patchOptions({ direction: 'row' satisfies ContainerDirection })}
          >
            <Columns3 size={15} />
          </button>
        </div>

        <label>
          Gap
          <input
            value={options.gap ?? ''}
            placeholder="12px"
            onChange={(e) => patchOptions({ gap: e.target.value })}
          />
        </label>

        <div className="et-field-block">
          <span className="et-field-caption">Primary align</span>
          <div className="et-seg" role="group" aria-label="Primary alignment">
            {(
              [
                ['flex-start', <AlignStartVertical key="s" size={15} />, 'Start'],
                ['center', <AlignCenterVertical key="c" size={15} />, 'Center'],
                ['flex-end', <AlignEndVertical key="e" size={15} />, 'End'],
                ['space-between', <AlignVerticalSpaceBetween key="b" size={15} />, 'Space between'],
                [
                  'space-around',
                  <AlignHorizontalSpaceBetween key="a" size={15} />,
                  'Space around',
                ],
              ] as const
            ).map(([value, icon, label]) => (
              <button
                key={value}
                type="button"
                className={`et-seg-btn${options.justifyContent === value ? ' is-active' : ''}`}
                title={label}
                aria-label={label}
                onClick={() => patchOptions({ justifyContent: value satisfies ContainerJustify })}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className="et-field-block">
          <span className="et-field-caption">Counter align</span>
          <div className="et-seg" role="group" aria-label="Counter alignment">
            {(
              [
                ['stretch', <StretchHorizontal key="st" size={15} />, 'Stretch'],
                ['flex-start', <AlignStartHorizontal key="s" size={15} />, 'Start'],
                ['center', <AlignCenterHorizontal key="c" size={15} />, 'Center'],
                ['flex-end', <AlignEndHorizontal key="e" size={15} />, 'End'],
              ] as const
            ).map(([value, icon, label]) => (
              <button
                key={value}
                type="button"
                className={`et-seg-btn${options.alignItems === value ? ' is-active' : ''}`}
                title={label}
                aria-label={label}
                onClick={() => patchOptions({ alignItems: value satisfies ContainerAlign })}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="et-inspector-section">
        <div className="et-inspector-section-head">
          <h4>Padding</h4>
          <button
            type="button"
            className={`et-icon-toggle${paddingLinked ? ' is-active' : ''}`}
            title={paddingLinked ? 'Unlink sides' : 'Link sides'}
            aria-label={paddingLinked ? 'Unlink padding sides' : 'Link padding sides'}
            onClick={() => {
              const next = !paddingLinked
              setPaddingLinked(next)
              if (next) {
                const value = options.paddingTop ?? '16px'
                patchOptions({
                  paddingTop: value,
                  paddingRight: value,
                  paddingBottom: value,
                  paddingLeft: value,
                })
              }
            }}
          >
            {paddingLinked ? <Link2 size={14} /> : <Link2Off size={14} />}
          </button>
        </div>

        <div className="et-padding-grid">
          <label className="et-padding-top">
            Top
            <input
              value={options.paddingTop ?? ''}
              onChange={(e) => setPaddingSide('paddingTop', e.target.value)}
            />
          </label>
          <label className="et-padding-left">
            Left
            <input
              value={options.paddingLeft ?? ''}
              onChange={(e) => setPaddingSide('paddingLeft', e.target.value)}
            />
          </label>
          <label className="et-padding-right">
            Right
            <input
              value={options.paddingRight ?? ''}
              onChange={(e) => setPaddingSide('paddingRight', e.target.value)}
            />
          </label>
          <label className="et-padding-bottom">
            Bottom
            <input
              value={options.paddingBottom ?? ''}
              onChange={(e) => setPaddingSide('paddingBottom', e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="et-inspector-section">
        <h4>Size</h4>
        <div className="et-seg" role="group" aria-label="Height mode">
          {(
            [
              ['hug', 'Hug'],
              ['fixed', 'Fixed'],
              ['fill', 'Fill'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`et-seg-btn et-seg-btn--text${options.heightMode === value ? ' is-active' : ''}`}
              onClick={() => patchOptions({ heightMode: value satisfies ContainerHeightMode })}
            >
              {label}
            </button>
          ))}
        </div>

        {options.heightMode === 'fixed' ? (
          <label>
            Height
            <input
              value={options.height ?? ''}
              placeholder="240px"
              onChange={(e) => patchOptions({ height: e.target.value })}
            />
          </label>
        ) : null}

        <div className="et-inline-fields">
          <label>
            Min height
            <input
              value={options.minHeight ?? ''}
              placeholder="auto"
              onChange={(e) => patchOptions({ minHeight: e.target.value })}
            />
          </label>
          <label>
            Max height
            <input
              value={options.maxHeight ?? ''}
              placeholder="none"
              onChange={(e) => patchOptions({ maxHeight: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="et-inspector-section">
        <h4>Appearance</h4>
        <label>
          Overflow
          <select
            value={options.overflow ?? 'visible'}
            onChange={(e) =>
              patchOptions({ overflow: e.target.value as ContainerOverflow })
            }
          >
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
            <option value="auto">Auto</option>
          </select>
        </label>
        <label>
          Radius
          <input
            value={options.borderRadius ?? ''}
            placeholder="0px"
            onChange={(e) => patchOptions({ borderRadius: e.target.value })}
          />
        </label>
        <div className="et-field-block">
          <span className="et-field-caption">Background</span>
          <div className="et-color-field">
            <input
              type="color"
              className="et-color-swatch"
              value={/^#[0-9a-fA-F]{6}$/.test(options.background ?? '') ? options.background! : '#ffffff'}
              aria-label="Background color"
              onChange={(e) => patchOptions({ background: e.target.value })}
            />
            <input
              type="text"
              value={options.background ?? ''}
              placeholder="#ffffff"
              spellCheck={false}
              onChange={(e) => patchOptions({ background: e.target.value })}
            />
            {(options.background ?? '') ? (
              <button
                type="button"
                className="et-color-clear"
                title="Clear background"
                aria-label="Clear background"
                onClick={() => patchOptions({ background: '' })}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
