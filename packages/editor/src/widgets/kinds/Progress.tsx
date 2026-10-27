import React from 'react'
import { Gauge } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { lines, cells, joinCells, num, clamp, accentAt } from '../text'
import '../../styles/widgets/progress.css'

interface Bar {
  label: string
  value: number
  max: number
}

function parseBars(text: string): Bar[] {
  return lines(text).map(line => {
    const [label, value, max] = cells(line, 3)
    const m = Math.max(1, num(max, 100))
    return { label, value: clamp(num(value, 0), 0, m), max: m }
  })
}

function serializeBars(bars: Bar[]): string {
  return bars
    .map(b => joinCells([b.label, String(Math.round(b.value)), b.max === 100 ? '' : String(b.max)]))
    .join('\n')
}

function ProgressView({ attrs, update, editable, setEditing }: WidgetViewProps) {
  const bars = parseBars(attrs.items)

  if (bars.length === 0) {
    return (
      <div className="jx-empty">
        No bars yet.{editable && <> <button type="button" className="jx-btn jx-btn--ghost" onClick={() => setEditing(true)}>Add items</button></>}
      </div>
    )
  }

  // Click/drag along a bar to set its value
  const setFromPointer = (index: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    const next = bars.map((b, i) => (i === index ? { ...b, value: Math.round(ratio * b.max) } : b))
    update({ items: serializeBars(next) })
  }

  const total = bars.reduce((s, b) => s + b.value / b.max, 0) / bars.length

  return (
    <div className="jx-progress">
      {bars.length > 1 && (
        <div className="jx-progress__summary">
          <span className="jx-progress__summary-value">{Math.round(total * 100)}%</span>
          <span className="jx-subtle">overall across {bars.length} items</span>
        </div>
      )}
      {bars.map((bar, i) => {
        const pct = Math.round((bar.value / bar.max) * 100)
        return (
          <div key={i} className={`jx-progress__row${pct >= 100 ? ' is-done' : ''}`} data-tone={pct >= 100 ? 'green' : accentAt(i)}>
            <div className="jx-progress__meta">
              <span className="jx-progress__label">{bar.label || `Item ${i + 1}`}</span>
              <span className="jx-progress__value">
                {bar.max === 100 ? `${pct}%` : `${Math.round(bar.value)} / ${bar.max}`}
              </span>
            </div>
            <div
              className={`jx-progress__track${editable ? ' is-editable' : ''}`}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              onPointerDown={(e) => {
                if (!editable) return
                e.currentTarget.setPointerCapture(e.pointerId)
                setFromPointer(i, e)
              }}
              onPointerMove={(e) => { if (e.buttons === 1) setFromPointer(i, e) }}
            >
              <div className="jx-progress__fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const progressWidget: WidgetSpec = {
  name: 'progress',
  label: 'Progress',
  description: 'Progress bars you can drag to update',
  icon: Gauge,
  keywords: ['progress', 'bar', 'percent', 'goal', 'tracker', 'okr'],
  category: 'productivity',
  defaults: { title: 'Progress', items: 'Design | 80\nBackend | 45\nDocs | 3 | 10' },
  fields: [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'items', label: 'Bars', kind: 'textarea', rows: 5, mono: true, help: 'One per line: Label | value | max (max defaults to 100)' }
  ],
  View: ProgressView
}
