import React, { useEffect, useMemo, useRef, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { CalendarClock } from 'lucide-react'
import '../styles/DateTimeNodeView.css'

type Mode = 'datetime' | 'date' | 'time'

function formatDisplay(mode: Mode, value: string): string {
  const v = (value || '').trim()
  if (!v) return 'Pick date/time'
  // For simplicity + stability, display the raw value (datetime-local style) but nicer spacing.
  if (mode === 'datetime') return v.replace('T', ' ')
  return v
}

function clampMode(m: string): Mode {
  if (m === 'date' || m === 'time' || m === 'datetime') return m
  return 'datetime'
}

export function DateTimeNodeView({ node, updateAttributes }: any) {
  const mode = clampMode((node?.attrs?.mode || 'datetime').toString())
  const value = (node?.attrs?.value || '').toString()

  /* State managed directly via props now */
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null
      if (wrapRef.current && t && !wrapRef.current.contains(t)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const inputType = useMemo(() => {
    if (mode === 'date') return 'date'
    if (mode === 'time') return 'time'
    return 'datetime-local'
  }, [mode])

  return (
    <NodeViewWrapper ref={wrapRef as any} className="jotx-datetime-node" data-type="datetime">
      <button
        className="jotx-datetime-pill"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        title="Date/Time"
      >
        <CalendarClock size={16} />
        <span className="jotx-datetime-text">{formatDisplay(mode, value)}</span>
      </button>

      {open && (
        <div className="jotx-datetime-popover" onMouseDown={(e) => e.stopPropagation()}>
          <div className="jotx-datetime-row">
            <span className="jotx-datetime-label">Mode</span>
            <select
              className="jotx-datetime-select"
              value={mode}
              onChange={(e) => {
                const newMode = clampMode(e.target.value)
                updateAttributes({ mode: newMode })
              }}
            >
              <option value="datetime">Date + Time</option>
              <option value="date">Date</option>
              <option value="time">Time</option>
            </select>
          </div>

          <div className="jotx-datetime-row">
            <span className="jotx-datetime-label">Value</span>
            <input
              className="jotx-datetime-input"
              type={inputType}
              value={value}
              onChange={(e) => {
                updateAttributes({ value: e.target.value })
              }}
            />
          </div>
          {/* Actions removed for direct manipulation */}

        </div>
      )}
    </NodeViewWrapper>
  )
}


