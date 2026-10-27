import React, { useEffect, useRef, useState } from 'react'
import { NodeViewContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import '../styles/ToggleNodeView.css'

export function ToggleNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const collapsed = !!(node?.attrs as any)?.collapsed
  const title = ((node?.attrs as any)?.title || 'Toggle').toString()
  const [draftTitle, setDraftTitle] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraftTitle(title)
  }, [title])

  const onToggle = () => {
    updateAttributes({ collapsed: !collapsed })
  }

  const commitTitle = () => {
    const next = (draftTitle || '').trim() || 'Toggle'
    if (next !== title) updateAttributes({ title: next })
  }

  return (
    <NodeViewWrapper
      className={`jotx-toggle ${collapsed ? 'is-collapsed' : ''}`}
      data-type="toggle"
      data-collapsed={collapsed ? 'true' : 'false'}
      data-title={title}
    >
      <div className="jotx-toggle-header" contentEditable={false}>
        <button className="jotx-toggle-chevron" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        <input
          ref={inputRef}
          className="jotx-toggle-title"
          value={draftTitle}
          placeholder="Toggle"
          onChange={(e) => {
            const v = e.target.value
            setDraftTitle(v)
            // Persist immediately so roundtrip never loses title even if blur doesn't fire.
            updateAttributes({ title: v })
          }}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitTitle()
              // move focus back into editor
              editor?.commands?.focus?.()
            }
          }}
        />
      </div>

      <div className="jotx-toggle-content" style={{ display: collapsed ? 'none' : 'block' }}>
        <NodeViewContent className="jotx-toggle-content-inner" />
      </div>
    </NodeViewWrapper>
  )
}


