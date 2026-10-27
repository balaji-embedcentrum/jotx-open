import React, { useEffect, useRef, useState } from 'react'
import { Palette, Plus, X, Check } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { lines, cells, joinCells, copyText } from '../text'
import '../../styles/widgets/palette.css'

interface Swatch {
  name: string
  value: string
}

function parseSwatches(text: string): Swatch[] {
  return lines(text).map(line => {
    if (!line.includes('|')) return { name: '', value: line }
    const [name, value] = cells(line, 2)
    return { name, value }
  })
}

function serializeSwatches(swatches: Swatch[]): string {
  return swatches.map(s => joinCells([s.name, s.value])).join('\n')
}

/** Parse #rgb/#rrggbb/rgb()/hsl() into [r,g,b] 0-255; null if unknown. */
function toRgb(value: string): [number, number, number] | null {
  const v = value.trim()
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i)
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1]
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const rgb = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  const hsl = v.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i)
  if (hsl) {
    const h = Number(hsl[1]) / 360
    const s = Number(hsl[2]) / 100
    const l = Number(hsl[3]) / 100
    const f = (n: number) => {
      const k = (n + h * 12) % 12
      const a = s * Math.min(l, 1 - l)
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
    }
    return [f(0), f(8), f(4)]
  }
  return null
}

function toHex(rgb: [number, number, number]): string {
  return '#' + rgb.map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')
}

/** Black or white text, whichever has better WCAG contrast on the swatch. */
function textOn(rgb: [number, number, number] | null): string {
  if (!rgb) return 'inherit'
  const [r, g, b] = rgb.map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return (lum + 0.05) / 0.05 > 1.05 / (lum + 0.05) ? '#0b0f14' : '#ffffff'
}

function PaletteView({ attrs, update, editable }: WidgetViewProps) {
  const swatches = parseSwatches(attrs.colors)
  const [copied, setCopied] = useState<number | null>(null)
  const [draft, setDraft] = useState('#14b8a6')
  const timer = useRef<number>()
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = (i: number, value: string) => {
    copyText(value).then(ok => {
      if (!ok) return
      setCopied(i)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(null), 1300)
    })
  }

  const remove = (i: number) => update({ colors: serializeSwatches(swatches.filter((_, k) => k !== i)) })
  const add = () => update({ colors: serializeSwatches([...swatches, { name: `Color ${swatches.length + 1}`, value: draft }]) })

  return (
    <div className="jx-palette">
      {swatches.map((s, i) => {
        const rgb = toRgb(s.value)
        const hex = rgb ? toHex(rgb) : s.value
        return (
          <div key={i} className="jx-palette__swatch">
            <button
              type="button"
              className="jx-palette__chip"
              style={{ background: s.value, color: textOn(rgb) }}
              onClick={() => copy(i, s.value.startsWith('#') ? s.value : hex)}
              title={`Copy ${s.value}`}
            >
              <span className={`jx-palette__copied${copied === i ? ' is-visible' : ''}`}>
                <Check size={14} /> Copied
              </span>
            </button>
            <div className="jx-palette__meta">
              <div className="jx-palette__name">{s.name || hex}</div>
              <div className="jx-palette__value">{s.value}</div>
            </div>
            {editable && (
              <button type="button" className="jx-icon-btn jx-palette__remove" title="Remove color" onClick={() => remove(i)}>
                <X size={13} />
              </button>
            )}
          </div>
        )
      })}
      {editable && (
        <div className="jx-palette__swatch jx-palette__add">
          <label className="jx-palette__chip jx-palette__picker" title="Pick a color" style={{ background: draft }}>
            <input type="color" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Pick a color" />
          </label>
          <div className="jx-palette__meta">
            <button type="button" className="jx-btn jx-btn--ghost jx-palette__add-btn" onClick={add} title="Add this color">
              <Plus size={13} /> Add
            </button>
            <div className="jx-palette__value">{draft}</div>
          </div>
        </div>
      )}
      {!editable && swatches.length === 0 && <div className="jx-empty">No colors yet.</div>}
    </div>
  )
}

export const paletteWidget: WidgetSpec = {
  name: 'palette',
  label: 'Color Palette',
  description: 'Color swatches, click to copy',
  icon: Palette,
  keywords: ['palette', 'color', 'colors', 'swatch', 'theme', 'brand', 'design', 'hex'],
  category: 'developer',
  defaults: {
    title: 'Brand',
    colors: 'Teal | #14b8a6\nInk | #0f172a\nSky | #38bdf8\nAmber | #f59e0b\nRose | #f43f5e\nMist | #e2e8f0'
  },
  fields: [
    { key: 'title', label: 'Palette name', kind: 'text' },
    { key: 'colors', label: 'Colors', kind: 'textarea', rows: 7, mono: true, help: 'One per line: Name | #hex (rgb() and hsl() also work)' }
  ],
  View: PaletteView
}
