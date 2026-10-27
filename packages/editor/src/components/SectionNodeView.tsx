import React, { useEffect, useRef, useState } from 'react'
import { NodeViewContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import '../styles/SectionNodeView.css'

export function SectionNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const collapsed = !!(node?.attrs as any)?.collapsed
  const title = ((node?.attrs as any)?.title || 'Section').toString()
  const [draftTitle, setDraftTitle] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraftTitle(title)
  }, [title])

  const onToggle = () => {
    updateAttributes({ collapsed: !collapsed })
  }

  const commitTitle = () => {
    const next = (draftTitle || '').trim() || 'Section'
    if (next !== title) updateAttributes({ title: next })
  }

  return (
    <NodeViewWrapper
      className={`jotx-section ${collapsed ? 'is-collapsed' : ''}`}
      data-type="section"
      data-collapsed={collapsed ? 'true' : 'false'}
      data-title={title}
    >
      <div className="jotx-section-header" contentEditable={false}>
        <button className="jotx-section-chevron" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        </button>
        <input
          ref={inputRef}
          className="jotx-section-title"
          value={draftTitle}
          placeholder="Section"
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

      <div className="jotx-section-content" style={{ display: collapsed ? 'none' : 'block' }}>
        <NodeViewContent className="jotx-section-content-inner" />
      </div>
    </NodeViewWrapper>
  )
}


