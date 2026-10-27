/**
 * InsertGallery - visual catalog of every block and widget, opened from the ribbon.
 * Uses the same command ids as the slash menu, so inserting behaves identically.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, X } from 'lucide-react'
import { ALL_COMMANDS, GROUP_ORDER } from './SlashMenu'
import '../styles/InsertGallery.css'

interface InsertGalleryProps {
  disabled?: boolean
  onInsert: (command: string) => void
}

const PANEL_WIDTH = 560

export function InsertGallery({ disabled, onInsert }: InsertGalleryProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // The ribbon clips overflow, so the panel is fixed-positioned under the button
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return
    const r = buttonRef.current.getBoundingClientRect()
    const left = Math.max(12, Math.min(r.left, window.innerWidth - PANEL_WIDTH - 12))
    setPos({ top: r.bottom + 8, left })
    inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const q = query.trim().toLowerCase()
  const matches = (c: typeof ALL_COMMANDS[number]) =>
    !q || c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.keywords.some(k => k.includes(q))

  const sections = GROUP_ORDER
    .map(g => ({ ...g, items: ALL_COMMANDS.filter(c => c.group === g.id && c.id !== 'useTemplate' && matches(c)) }))
    .filter(s => s.items.length > 0)

  const pick = (id: string) => {
    setOpen(false)
    setQuery('')
    onInsert(id)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`editor-ribbon-insert${open ? ' active' : ''}`}
        title="Insert a block or widget"
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen(!open)}
      >
        <Plus size={15} />
        <span>Insert</span>
      </button>

      {/* Portaled: the ribbon's backdrop-filter + overflow would trap a fixed panel */}
      {open && createPortal(
        <div
          ref={panelRef}
          className="jx-gallery"
          style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault() }}
        >
          <div className="jx-gallery__search">
            <Search size={15} />
            <input
              ref={inputRef}
              value={query}
              placeholder="Search blocks and widgets…"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && sections[0]?.items[0]) pick(sections[0].items[0].id)
              }}
            />
            <button type="button" className="jx-icon-btn" title="Close" onClick={() => setOpen(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="jx-gallery__body">
            {sections.length === 0 && <div className="jx-gallery__empty">Nothing matches “{query}”</div>}
            {sections.map(section => (
              <section key={section.id} className="jx-gallery__section">
                <h4 className="jx-gallery__heading">{section.label}</h4>
                <div className="jx-gallery__grid">
                  {section.items.map(item => (
                    <button key={item.id} type="button" className="jx-gallery__tile" onClick={() => pick(item.id)} title={item.description}>
                      <span className="jx-gallery__icon">{item.icon}</span>
                      <span className="jx-gallery__label">{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
