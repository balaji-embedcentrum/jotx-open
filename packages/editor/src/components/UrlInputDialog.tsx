import React, { useEffect, useRef, useState } from 'react'
import '../styles/LinkDialog.css' // Reusing LinkDialog styles

export interface UrlInputDialogResult {
    url: string
}

export interface UrlInputDialogProps {
    isOpen: boolean
    title?: string
    initialUrl?: string
    onCancel: () => void
    onSubmit: (result: UrlInputDialogResult) => void
}

export function UrlInputDialog({
    isOpen,
    title = 'Insert URL',
    initialUrl = 'https://',
    onCancel,
    onSubmit
}: UrlInputDialogProps) {
    const [url, setUrl] = useState(initialUrl)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!isOpen) return
        setUrl(initialUrl)
        // focus next tick
        const t = window.setTimeout(() => inputRef.current?.focus(), 0)
        return () => window.clearTimeout(t)
    }, [isOpen, initialUrl])

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
                <div className="jotx-link-dialog-title">{title}</div>

                <label className="jotx-link-dialog-field">
                    <div className="jotx-link-dialog-label">URL</div>
                    <input
                        ref={inputRef}
                        className="jotx-link-dialog-input"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                const h = url.trim()
                                if (!h) return
                                onSubmit({ url: h })
                            }
                        }}
                    />
                </label>

                <div className="jotx-link-dialog-actions">
                    <button className="jotx-link-dialog-btn ghost" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className="jotx-link-dialog-btn primary"
                        onClick={() => {
                            const h = url.trim()
                            if (!h) return
                            onSubmit({ url: h })
                        }}
                    >
                        Insert
                    </button>
                </div>

                <div className="jotx-link-dialog-hint">
                    Tip: press <kbd>Enter</kbd> to submit, <kbd>Esc</kbd> to close.
                </div>
            </div>
        </div>
    )
}
