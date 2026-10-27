import React, { useEffect, useRef, useState } from 'react'
import '../styles/LinkDialog.css'

export interface LinkDialogResult {
  href: string
  label: string
}

export interface LinkDialogProps {
  isOpen: boolean
  initialHref?: string
  initialLabel?: string
  onCancel: () => void
  onSubmit: (result: LinkDialogResult) => void
}

export function LinkDialog({
  isOpen,
  initialHref = 'https://',
  initialLabel = '',
  onCancel,
  onSubmit
}: LinkDialogProps) {
  const [href, setHref] = useState(initialHref)
  const [label, setLabel] = useState(initialLabel)
  const hrefRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setHref(initialHref)
    setLabel(initialLabel)
    // focus next tick
    const t = window.setTimeout(() => hrefRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [isOpen, initialHref, initialLabel])

  if (!isOpen) return null

  return (
    <div
      className="jotx-link-dialog-backdrop"
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="jotx-link-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="jotx-link-dialog-title">Insert link</div>

        <label className="jotx-link-dialog-field">
          <div className="jotx-link-dialog-label">URL</div>
          <input
            ref={hrefRef}
            className="jotx-link-dialog-input"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://example.com"
          />
        </label>

        <label className="jotx-link-dialog-field">
          <div className="jotx-link-dialog-label">Text (optional)</div>
          <input
            className="jotx-link-dialog-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Shown text (leave empty to show the URL)"
          />
        </label>

        <div className="jotx-link-dialog-actions">
          <button className="jotx-link-dialog-btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="jotx-link-dialog-btn primary"
            onClick={() => {
              const h = href.trim()
              if (!h) return
              onSubmit({ href: h, label: label.trim() })
            }}
          >
            Insert
          </button>
        </div>

        <div className="jotx-link-dialog-hint">
          Tip: press <kbd>Esc</kbd> to close.
        </div>
      </div>
    </div>
  )
}


