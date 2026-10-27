import React, { useEffect, useState } from 'react'
import { ListTree } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { num, clamp } from '../text'
import '../../styles/widgets/toc.css'

interface HeadingEntry {
  pos: number
  level: number
  text: string
}

function collectHeadings(view: WidgetViewProps['editor'], depth: number): HeadingEntry[] {
  const out: HeadingEntry[] = []
  view.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const level = Number(node.attrs.level) || 1
      const text = node.textContent.trim()
      if (level <= depth && text) out.push({ pos, level, text })
      return false
    }
    return true
  })
  return out
}

function TocView({ attrs, editor }: WidgetViewProps) {
  const depth = clamp(Math.round(num(attrs.depth, 3)), 1, 6)
  const [headings, setHeadings] = useState<HeadingEntry[]>(() => collectHeadings(editor, depth))

  useEffect(() => {
    const refresh = () => setHeadings(collectHeadings(editor, depth))
    refresh()
    editor.on('update', refresh)
    return () => { editor.off('update', refresh) }
  }, [editor, depth])

  if (headings.length === 0) {
    return <div className="jx-empty">Add headings to this note and they will appear here.</div>
  }

  const minLevel = Math.min(...headings.map(h => h.level))

  const jump = (pos: number) => {
    const dom = editor.view.nodeDOM(pos) as HTMLElement | null
    dom?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    dom?.classList.add('jx-toc-flash')
    window.setTimeout(() => dom?.classList.remove('jx-toc-flash'), 900)
  }

  return (
    <nav className="jx-toc" aria-label="Table of contents">
      {headings.map((h, i) => (
        <button
          key={`${h.pos}-${i}`}
          type="button"
          className={`jx-toc__item jx-toc__item--l${h.level - minLevel + 1}`}
          onClick={() => jump(h.pos)}
        >
          <span className="jx-toc__dot" />
          <span className="jx-toc__text">{h.text}</span>
        </button>
      ))}
    </nav>
  )
}

export const tocWidget: WidgetSpec = {
  name: 'toc',
  label: 'Table of Contents',
  description: 'Live outline of this note’s headings',
  icon: ListTree,
  keywords: ['toc', 'contents', 'outline', 'headings', 'navigation', 'index'],
  category: 'planning',
  defaults: { title: 'Contents', depth: '3' },
  fields: [
    { key: 'title', label: 'Title', kind: 'text', placeholder: 'Contents' },
    { key: 'depth', label: 'Depth', kind: 'select', options: ['1', '2', '3', '4', '5', '6'] }
  ],
  View: TocView
}
