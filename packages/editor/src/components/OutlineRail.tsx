/**
 * OutlineRail - "On this page" navigation pinned beside the note, like a docs site.
 * Tracks the heading in view and reading progress. Only shown when there is
 * room next to the page and the note has enough headings to be worth it.
 */

import React, { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { Node as PMNode } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
import '../styles/OutlineRail.css'
import { useEditorDom } from '../utils/editorDom'

interface OutlineItem {
  pos: number
  level: number
  text: string
  tab?: boolean
}

const RAIL_WIDTH = 220
const GAP = 28

function collect(editor: Editor): OutlineItem[] {
  const out: OutlineItem[] = []
  // Tabs are listed like headings, with the headings inside them one level deeper
  const walk = (parent: PMNode, start: number, depth: number) => {
    parent.forEach((node, offset) => {
      const pos = start + offset
      if (node.type.name === 'heading') {
        const level = Number(node.attrs.level) || 1
        const text = node.textContent.trim()
        if (level <= 3 && text) out.push({ pos, level: level + depth, text })
      } else if (node.type.name === 'tab') {
        out.push({ pos, level: 2 + depth, text: [node.attrs.icon, node.attrs.title].filter(Boolean).join(' '), tab: true })
        walk(node, pos + 1, depth + 1)
      } else if (!node.isTextblock && node.childCount) {
        walk(node, pos + 1, depth)
      }
    })
  }
  walk(editor.state.doc, 0, 0)
  return out
}

function scrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement || null
  while (node) {
    const oy = getComputedStyle(node).overflowY
    if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) return node
    node = node.parentElement
  }
  return null
}

export function OutlineRail({ editor }: { editor: Editor }) {
  const [items, setItems] = useState<OutlineItem[]>(() => collect(editor))
  const contentDom = useEditorDom(editor)
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const [left, setLeft] = useState<number | null>(null)
  const railRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const refresh = () => setItems(collect(editor))
    editor.on('update', refresh)
    return () => { editor.off('update', refresh) }
  }, [editor])

  useEffect(() => {
    const content = contentDom
    if (!content) return
    const scroller = scrollParent(content)
    const target: HTMLElement | Window = scroller || window

    const measure = () => {
      // Place the rail just right of the page, or hide it if there isn't room
      const wrapper = content.closest('.jotx-editor-wrapper') as HTMLElement | null
      const rect = (wrapper || content).getBoundingClientRect()
      const x = rect.right + GAP
      setLeft(x + RAIL_WIDTH + 16 <= window.innerWidth ? x : null)

      const top = scroller ? scroller.scrollTop : window.scrollY
      const height = scroller ? scroller.scrollHeight - scroller.clientHeight : document.documentElement.scrollHeight - window.innerHeight
      setProgress(height > 0 ? Math.min(1, Math.max(0, top / height)) : 1)

      // Active = last heading whose top has passed the upper third of the viewport
      const viewTop = scroller ? scroller.getBoundingClientRect().top : 0
      let current = 0
      items.forEach((item, i) => {
        const dom = editor.view.nodeDOM(item.pos) as HTMLElement | null
        // Headings in closed tabs have no layout and must not count as passed
        if (dom && dom.offsetParent !== null && dom.getBoundingClientRect().top - viewTop < 140) current = i
      })
      setActive(current)
    }

    measure()
    target.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      target.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [editor, items, contentDom])

  if (items.length < 3 || left === null) return null

  const minLevel = Math.min(...items.map(i => i.level))

  const jump = (item: OutlineItem) => {
    // Moving the cursor there first opens the tab that holds the heading
    const { state } = editor
    editor.view.dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(item.pos + 1))))
    requestAnimationFrame(() => {
      const dom = editor.view.nodeDOM(item.pos) as HTMLElement | null
      // A tab scrolls to its tab bar, a heading to itself
      const target = item.tab ? (dom?.closest('.jx-tabs') as HTMLElement | null) : dom
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <nav ref={railRef} className="jx-outline" style={{ left, width: RAIL_WIDTH }} aria-label="On this page">
      <div className="jx-outline__head">
        <span>On this page</span>
        <span className="jx-outline__pct">{Math.round(progress * 100)}%</span>
      </div>
      <div className="jx-outline__bar"><div style={{ width: `${progress * 100}%` }} /></div>
      <div className="jx-outline__list">
        {items.map((item, i) => (
          <button
            key={`${item.pos}-${i}`}
            type="button"
            className={`jx-outline__item jx-outline__item--l${Math.min(3, item.level - minLevel + 1)}${item.tab ? ' is-tab' : ''}${i === active ? ' is-active' : ''}`}
            onClick={() => jump(item)}
            title={item.text}
          >
            {item.text}
          </button>
        ))}
      </div>
    </nav>
  )
}
