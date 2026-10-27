/**
 * View Options - Font size, width, etc.
 */

import React, { useState, useRef, useEffect } from 'react'
import { Settings } from 'lucide-react'
import '../../styles/ViewOptions.css'

const LS_FONT_SIZE = 'jotx_view_fontSize'
const LS_MAX_WIDTH = 'jotx_view_maxWidth'
// Page width; prose keeps its own reading measure inside it (see Page.css)
const DEFAULT_MAX_WIDTH = 1080

export function ViewOptions() {
  const [isOpen, setIsOpen] = useState(false)
  const [fontSize, setFontSize] = useState(() => {
    const raw = localStorage.getItem(LS_FONT_SIZE)
    const n = raw ? Number(raw) : 16
    return Number.isFinite(n) ? n : 16
  })
  const [maxWidth, setMaxWidth] = useState(() => {
    const raw = localStorage.getItem(LS_MAX_WIDTH)
    const n = raw ? Number(raw) : DEFAULT_MAX_WIDTH
    return Number.isFinite(n) ? n : DEFAULT_MAX_WIDTH
  })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    // web-theme.css defines these vars with `!important` to force dark mode.
    // So we must set them with important priority too, otherwise slider changes have no effect.
    document.documentElement.style.setProperty('--jotx-editor-fontSize', `${fontSize}px`, 'important')
    localStorage.setItem(LS_FONT_SIZE, String(fontSize))

    // Bulletproof fallback: apply directly to editor DOM (covers any CSS override/caching issues).
    const size = `${fontSize}px`
    document.querySelectorAll<HTMLElement>('.jotx-editor-content, .ProseMirror').forEach((el) => {
      el.style.setProperty('font-size', size, 'important')
    })
  }, [fontSize])

  useEffect(() => {
    document.documentElement.style.setProperty('--jotx-editor-maxWidth', `${maxWidth}px`, 'important')
    localStorage.setItem(LS_MAX_WIDTH, String(maxWidth))

    // Bulletproof fallback: apply directly to the page column.
    // We set BOTH width and max-width so flexbox "stretch" cannot hide the effect.
    // (The scroll container itself stays full width so the margins still scroll.)
    const w = `${maxWidth}px`
    const wMin = `min(100%, ${w})`
    document.querySelectorAll<HTMLElement>('.jotx-editor-wrapper, .jotx-header-content').forEach((el) => {
      el.style.setProperty('width', wMin, 'important')
      el.style.setProperty('max-width', w, 'important')
      el.style.setProperty('margin-left', 'auto', 'important')
      el.style.setProperty('margin-right', 'auto', 'important')
      // Prevent a flex parent from stretching this item in a way that masks width changes.
      el.style.setProperty('flex', '0 1 auto', 'important')
    })
  }, [maxWidth])

  return (
    <div className="jotx-view-options" ref={menuRef}>
      <button
        className="jotx-header-button"
        onClick={() => setIsOpen(!isOpen)}
        title="View Options"
      >
        <Settings size={16} />
      </button>

      {isOpen && (
        <div className="jotx-view-dropdown">
          <div className="jotx-view-header">View Options</div>

          <div className="jotx-view-section">
            <label className="jotx-view-label">
              Font Size: {fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="24"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="jotx-view-slider"
            />
          </div>

          <div className="jotx-view-section">
            <label className="jotx-view-label">
              Max Width: {maxWidth}px
            </label>
            <input
              type="range"
              min="600"
              max="1600"
              step="50"
              value={maxWidth}
              onChange={(e) => setMaxWidth(Number(e.target.value))}
              className="jotx-view-slider"
            />
          </div>

          <div className="jotx-view-divider" />

          <button
            className="jotx-view-reset"
            onClick={() => {
              setFontSize(16)
              setMaxWidth(DEFAULT_MAX_WIDTH)
              localStorage.removeItem(LS_FONT_SIZE)
              localStorage.removeItem(LS_MAX_WIDTH)
            }}
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  )
}

