import React from 'react'
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react'
import { ExternalLink, FileCode } from 'lucide-react'
import { followLink } from '../utils/followLink'
import '../styles/PreservedBlock.css'

/** Shows a block the editor keeps as written: link cards as cards, anything else as a labelled box. */
export function PreservedBlockView({ node, selected }: NodeViewProps) {
  let block: { type?: string; properties?: Record<string, any> } = {}
  try { block = JSON.parse(node.attrs.block || '{}') } catch { /* shown as unknown */ }
  const p = block.properties || {}

  if (block.type === 'linkcard') {
    const url = String(p.url || '')
    return (
      <NodeViewWrapper className={`jx-preserved jx-linkcard${selected ? ' is-selected' : ''}`} contentEditable={false}>
        <a href={url || undefined} onClick={e => { e.preventDefault(); followLink(url) }}>
          {p.image && <img src={String(p.image)} alt="" />}
          <span className="jx-linkcard__body">
            <strong>{p.title || url}</strong>
            {p.description && <span>{p.description}</span>}
            <small>{p.sitename || url.replace(/^https?:\/\//, '').split('/')[0]} <ExternalLink size={11} /></small>
          </span>
        </a>
      </NodeViewWrapper>
    )
  }

  const label = block.type === 'custom' && p.customtype ? p.customtype : block.type || 'block'
  return (
    <NodeViewWrapper className={`jx-preserved jx-preserved--other${selected ? ' is-selected' : ''}`} contentEditable={false}>
      <FileCode size={15} />
      <span><strong>{String(label)}</strong> is kept exactly as written. Open the file in the text editor to change it.</span>
    </NodeViewWrapper>
  )
}
