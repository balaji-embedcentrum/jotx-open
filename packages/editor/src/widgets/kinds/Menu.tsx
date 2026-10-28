import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, ExternalLink, Menu as MenuIcon, X } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { cells } from '../text'
import { followLink } from '../../utils/followLink'
import '../../styles/widgets/menu.css'

interface MenuLink {
  label: string
  link: string
  children: MenuLink[]
}

/** "Label | link" per line; a line indented under another becomes its dropdown entry. */
export function parseMenu(text: string | undefined): MenuLink[] {
  const top: MenuLink[] = []
  for (const raw of (text || '').split('\n')) {
    if (!raw.trim()) continue
    const nested = /^\s+/.test(raw) && top.length > 0
    const [label, link] = cells(raw.trim(), 2)
    const item = { label: label || link, link, children: [] }
    if (nested) top[top.length - 1].children.push(item)
    else top.push(item)
  }
  return top
}

const isExternal = (link: string) => /^https?:\/\//i.test(link)

/** Menu links follow the same rules as cards and buttons (see followLink). */
export const follow = followLink

function MenuView({ attrs, editable, setEditing }: WidgetViewProps) {
  const items = parseMenu(attrs.items)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (openIndex === null && !mobileOpen) return
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) { setOpenIndex(null); setMobileOpen(false) }
    }
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpenIndex(null); setMobileOpen(false) } }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape) }
  }, [openIndex, mobileOpen])

  if (items.length === 0) {
    return (
      <div className="jx-empty">
        No links yet.{editable && <> <button type="button" className="jx-btn jx-btn--ghost" onClick={() => setEditing(true)}>Add links</button></>}
      </div>
    )
  }

  const go = (link: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpenIndex(null)
    setMobileOpen(false)
    follow(link)
  }

  const linkProps = (item: MenuLink) => ({
    href: item.link || undefined,
    onClick: go(item.link),
    title: item.link || undefined
  })

  return (
    <nav ref={rootRef} className={`jx-menu${mobileOpen ? ' is-mobile-open' : ''}`} aria-label={attrs.title || 'Menu'}>
      {attrs.title && <span className="jx-menu__brand">{attrs.title}</span>}

      <button type="button" className="jx-menu__toggle" aria-expanded={mobileOpen} onClick={() => setMobileOpen(v => !v)}>
        {mobileOpen ? <X size={16} /> : <MenuIcon size={16} />}
        <span>Menu</span>
      </button>

      <ul className="jx-menu__list">
        {items.map((item, i) => (
          <li key={i} className={`jx-menu__item${item.children.length ? ' has-children' : ''}${openIndex === i ? ' is-open' : ''}`}
            // Hover opens dropdowns for a mouse only; a tap would open and then toggle closed
            onPointerEnter={e => e.pointerType === 'mouse' && item.children.length && setOpenIndex(i)}
            onPointerLeave={e => e.pointerType === 'mouse' && item.children.length && setOpenIndex(null)}>
            {item.children.length ? (
              <button type="button" className="jx-menu__link" aria-expanded={openIndex === i} aria-haspopup="true"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}>
                {item.label}
                <ChevronDown size={14} className="jx-menu__chevron" />
              </button>
            ) : (
              <a className="jx-menu__link" {...linkProps(item)}>
                {item.label}
                {isExternal(item.link) && <ExternalLink size={12} className="jx-menu__external" />}
              </a>
            )}

            {item.children.length > 0 && (
              <ul className="jx-menu__dropdown">
                {item.link && (
                  <li><a className="jx-menu__sublink is-overview" {...linkProps(item)}>{item.label}</a></li>
                )}
                {item.children.map((child, j) => (
                  <li key={j}>
                    <a className="jx-menu__sublink" {...linkProps(child)}>
                      {child.label}
                      {isExternal(child.link) && <ExternalLink size={12} className="jx-menu__external" />}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

export const menuWidget: WidgetSpec = {
  name: 'menu',
  label: 'Menu',
  description: 'Navigation bar linking notes and web pages, with dropdowns',
  icon: MenuIcon,
  keywords: ['menu', 'nav', 'navigation', 'links', 'navbar', 'site', 'dropdown'],
  category: 'planning',
  defaults: {
    title: '',
    items: 'Home | index.jot\nGuides | guides/index.jot\n  Getting started | guides/start.jot\n  Writing notes | guides/notes.jot\nGitHub | https://github.com'
  },
  fields: [
    { key: 'title', label: 'Title', kind: 'text', placeholder: 'Optional, shown at the left' },
    { key: 'items', label: 'Links', kind: 'textarea', rows: 7, mono: true, help: 'One per line: label | link. Indent a line with two spaces to put it in the dropdown of the line above.' }
  ],
  View: MenuView,
  frameless: true
}
