import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { NodeViewContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react'
import { Fragment } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Menu as MenuIcon, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useEditorMode } from '../contexts/EditorModeContext'
import { useDocumentInfo } from '../contexts/DocumentInfoContext'
import { tabSlug } from '../extensions/TabsNode'
import { parseMenu, follow } from '../widgets/kinds/Menu'
import '../styles/Tabs.css'

const ICONS = ['📋', '✅', '🧭', '📈', '🧪', '⚙️', '💡', '🚀', '📝', '🔒', '🗂️', '⭐']

interface TabInfo {
  title: string
  icon: string
  offset: number
  size: number
  /** Titles of the tabs inside this tab: the dropdown in the top navigation */
  subtabs: string[]
}

function readTabs(node: NodeViewProps['node']): TabInfo[] {
  const tabs: TabInfo[] = []
  node.forEach((child, offset) => {
    const subtabs: string[] = []
    child.forEach(inner => { if (inner.type.name === 'tabs' && !subtabs.length) inner.forEach(t => { subtabs.push(t.attrs.title || 'Tab') }) })
    tabs.push({ title: child.attrs.title || 'Tab', icon: child.attrs.icon || '', offset, size: child.nodeSize, subtabs })
  })
  return tabs
}

/** The tab named by a link such as #safety, or the tab that holds a tab of that name. */
function tabForSlug(node: NodeViewProps['node'], slug: string): number {
  let found = -1
  node.forEach((tab, _offset, i) => {
    if (found >= 0) return
    if (tabSlug(tab.attrs.title || 'Tab') === slug) { found = i; return }
    tab.descendants(inner => {
      if (found < 0 && inner.type.name === 'tab' && tabSlug(inner.attrs.title || 'Tab') === slug) found = i
      return found < 0
    })
  })
  return found
}

export function TabsNodeView({ node, editor, getPos }: NodeViewProps) {
  const { isPreview } = useEditorMode()
  const editable = !isPreview && editor.isEditable
  const tabs = readTabs(node)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')

  const position = useCallback((): number | null => {
    const pos = typeof getPos === 'function' ? getPos() : undefined
    return typeof pos === 'number' ? pos : null
  }, [getPos])

  // Tabs directly on the page get the page look and links such as #tasks; tabs inside a block are compact
  const pos0 = position()
  const isPage = pos0 !== null && editor.state.doc.resolve(pos0).depth === 0

  // A note that starts with tabs (after at most one menu) is a one-file site: the tabs are its navigation
  const doc = editor.state.doc
  const index = isPage ? doc.resolve(pos0!).index() : -1
  const isNav = isPage && (index === 0 || (index === 1 && doc.child(0).type.name === 'menu'))
  const menuNode = isNav && index === 1 ? doc.child(0) : null
  const menuLinks = menuNode ? parseMenu(menuNode.attrs.items) : []
  const { title: documentTitle } = useDocumentInfo()
  const brand = documentTitle || menuNode?.attrs.title || ''

  // Every tab bar follows links such as #fmea, so a sub-page opens inside its page
  const [active, setActive] = useState(() => {
    if (typeof location === 'undefined') return 0
    const found = tabForSlug(node, decodeURIComponent(location.hash.slice(1)))
    return found >= 0 ? found : 0
  })
  const [navOpen, setNavOpen] = useState(false)
  // When the pages do not fit beside the title and links, the navigation becomes a Menu button
  // Too many pages: first drop icons and tighten spacing (dense), then fold into a Menu button (compact)
  const [fit, setFit] = useState<'full' | 'dense' | 'compact'>('full')
  const compact = fit === 'compact'
  const needed = useRef({ full: 0, dense: 0, others: 0 })
  const [dropdown, setDropdown] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = Math.min(active, tabs.length - 1)

  const [renaming, setRenaming] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const stripRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLElement | null)[]>([])
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  // The cursor, a search match or the outline moving into a hidden tab opens that tab
  useEffect(() => {
    const onSelection = () => {
      const pos = position()
      if (pos === null) return
      const fresh = editor.state.doc.nodeAt(pos)
      if (!fresh || fresh.type.name !== 'tabs') return
      const { from } = editor.state.selection
      if (from <= pos || from >= pos + fresh.nodeSize) return
      let index = -1
      fresh.forEach((child, offset, i) => {
        const start = pos + 1 + offset
        if (from > start && from < start + child.nodeSize) index = i
      })
      if (index >= 0) setActive(index)
    }
    editor.on('selectionUpdate', onSelection)
    return () => { editor.off('selectionUpdate', onSelection) }
  }, [editor, position])

  // Links such as #safety, from cards, buttons or the address bar, open that tab
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onHash = () => {
      const pos = position()
      const fresh = pos === null ? null : editor.state.doc.nodeAt(pos)
      if (!fresh || fresh.type.name !== 'tabs') return
      const found = tabForSlug(fresh, decodeURIComponent(location.hash.slice(1)))
      if (found >= 0) setActive(found)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [editor, position])

  // Slide the underline to the open tab, and keep it in view when the bar scrolls
  const measure = useCallback(() => {
    const strip = stripRef.current
    if (isNav && strip) {
      const bar = strip.parentElement!
      // Widths measured in each layout are kept, so going back is decided without flicker
      if (fit !== 'compact') {
        needed.current[fit] = strip.scrollWidth
        needed.current.others = bar.scrollWidth - strip.clientWidth
      }
      const room = bar.clientWidth - needed.current.others
      const overflowing = fit !== 'compact' && strip.scrollWidth > strip.clientWidth + 1
      if (fit === 'full' && overflowing) setFit('dense')
      else if (fit === 'dense' && overflowing) setFit('compact')
      else if (fit === 'compact' && needed.current.dense && room >= needed.current.dense) setFit('dense')
      else if (fit === 'dense' && needed.current.full && room >= needed.current.full) setFit('full')
    }
    const el = tabRefs.current[current]
    if (!strip || !el) return
    const left = el.offsetLeft, width = el.offsetWidth
    setIndicator(prev => (prev && prev.left === left && prev.width === width ? prev : { left, width }))
    const start = strip.scrollLeft > 2, end = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 2
    setEdges(prev => (prev.start === start && prev.end === end ? prev : { start, end }))
  }, [current, isNav, fit])

  // Labels change width when renamed or given an icon
  const labels = tabs.map(t => t.icon + t.title).join('\u0000')
  useLayoutEffect(() => { measure() }, [measure, labels, renaming, draft])

  useLayoutEffect(() => {
    const strip = stripRef.current
    const el = tabRefs.current[current]
    if (!strip || !el) return
    const left = el.offsetLeft - 24
    const right = el.offsetLeft + el.offsetWidth + 24
    if (left < strip.scrollLeft) strip.scrollTo({ left, behavior: 'smooth' })
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollTo({ left: right - strip.clientWidth, behavior: 'smooth' })
  }, [current])

  useEffect(() => {
    const strip = stripRef.current
    if (!strip || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measure())
    observer.observe(strip)
    if (strip.parentElement) observer.observe(strip.parentElement)
    return () => observer.disconnect()
  }, [measure])

  const open = (index: number, focus = false) => {
    setActive(index)
    setMenuOpen(false)
    setNavOpen(false)
    setDropdown(null)
    if (focus) tabRefs.current[index]?.focus()
    if (isPage && !editable && typeof history !== 'undefined') {
      try { history.replaceState(null, '', `#${tabSlug(tabs[index].title)}`) } catch { /* sandboxed frames */ }
    }
    // A new page starts at its top
    if (isNav && rootRef.current && rootRef.current.getBoundingClientRect().top < 0) rootRef.current.scrollIntoView({ block: 'start' })
  }

  /** A sub-page from a dropdown: open its page, then the tab inside it. */
  const openSub = (index: number, title: string) => {
    open(index)
    try { location.hash = tabSlug(title) } catch { /* sandboxed frames */ }
  }

  useEffect(() => {
    if (dropdown === null && !navOpen) return
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.querySelector('.jx-tabs__bar')?.contains(e.target as Node)) { setDropdown(null); setNavOpen(false) }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [dropdown, navOpen])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 }
    if (!(e.key in keys)) return
    e.preventDefault()
    open((keys[e.key] + tabs.length) % tabs.length, true)
  }

  // ---- Editing ----

  const tabStart = (index: number) => {
    const pos = position()
    return pos === null ? null : pos + 1 + tabs[index].offset
  }

  const setTabAttrs = (index: number, attrs: Record<string, any>) => {
    const start = tabStart(index)
    if (start === null) return
    const tab = editor.state.doc.nodeAt(start)
    if (!tab) return
    editor.view.dispatch(editor.state.tr.setNodeMarkup(start, undefined, { ...tab.attrs, ...attrs }))
  }

  const startRename = (index: number) => {
    if (!editable) return
    setMenuOpen(false)
    setDraft(tabs[index].title)
    setRenaming(index)
  }

  const commitRename = () => {
    if (renaming === null) return
    const title = draft.trim() || tabs[renaming].title
    if (title !== tabs[renaming].title) setTabAttrs(renaming, { title })
    setRenaming(null)
  }

  const addTab = () => {
    const pos = position()
    if (pos === null) return
    const { schema } = editor.state
    const end = pos + node.nodeSize - 1
    const title = `Tab ${tabs.length + 1}`
    const tr = editor.state.tr.insert(end, schema.nodes.tab.create({ title }, schema.nodes.paragraph.create()))
    tr.setSelection(TextSelection.create(tr.doc, end + 2))
    editor.view.dispatch(tr.scrollIntoView())
    setActive(tabs.length)
    setDraft(title)
    setRenaming(tabs.length)
  }

  const moveTab = (index: number, delta: number) => {
    const target = index + delta
    const pos = position()
    if (pos === null || target < 0 || target >= tabs.length) return
    const children: any[] = []
    node.forEach(child => children.push(child))
    ;[children[index], children[target]] = [children[target], children[index]]
    editor.view.dispatch(editor.state.tr.replaceWith(pos + 1, pos + node.nodeSize - 1, Fragment.from(children)))
    setActive(target)
    setMenuOpen(false)
    editor.commands.focus()
  }

  const deleteTab = (index: number) => {
    const pos = position()
    const start = tabStart(index)
    if (pos === null || start === null) return
    setMenuOpen(false)
    if (tabs.length === 1) {
      // The last tab: keep its content and drop the tab bar
      editor.view.dispatch(editor.state.tr.replaceWith(pos, pos + node.nodeSize, node.child(0).content))
      editor.commands.focus()
      return
    }
    editor.view.dispatch(editor.state.tr.delete(start, start + tabs[index].size))
    setActive(Math.max(0, index - 1))
    editor.commands.focus()
  }

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.(`[data-tabs-menu="${uid}"]`)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen, uid])

  const tabId = (i: number) => `jx-tab-${uid}-${i}`

  return (
    <NodeViewWrapper
      ref={rootRef}
      className={`jx-tabs ${isPage ? 'jx-tabs--page' : 'jx-tabs--inline'}${isNav ? ' jx-tabs--nav' : ''}${isNav && compact ? ' is-compact' : ''}${isNav && fit === 'dense' ? ' is-dense' : ''}${navOpen ? ' is-nav-open' : ''}`}
      data-type="tabs"
      data-tabs-uid={uid}
    >
      {/* Only the open tab's panel is shown; the others stay in the document, ready to edit */}
      <style>{`[data-tabs-uid="${uid}"] > .jx-tabs__panels > * > .jx-tab:nth-child(${current + 1}) { display: block; }`}</style>

      <div
        className={`jx-tabs__bar ${edges.start ? 'can-scroll-start' : ''} ${edges.end ? 'can-scroll-end' : ''} ${menuOpen || dropdown !== null ? 'is-menu-open' : ''}`}
        contentEditable={false}
        onPointerLeave={e => { if (e.pointerType === 'mouse') setDropdown(null) }}
      >
        {isNav && brand && <span className="jx-tabs__brand">{brand}</span>}
        {isNav && (
          <button type="button" className="jx-tabs__navtoggle" aria-expanded={navOpen} onClick={() => setNavOpen(v => !v)}>
            {navOpen ? <X size={16} /> : <MenuIcon size={16} />}
            <span>{tabs[current].title}</span>
          </button>
        )}
        <div className="jx-tabs__strip" role="tablist" ref={stripRef} onScroll={measure} onKeyDown={onKeyDown}>
          {tabs.map((tab, i) =>
            renaming === i ? (
              <span key={i} ref={el => { tabRefs.current[i] = el }} className="jx-tabs__tab is-active is-renaming">
                {tab.icon && <span className="jx-tabs__icon">{tab.icon}</span>}
                <input
                  className="jx-tabs__rename"
                  value={draft}
                  autoFocus
                  size={Math.max(4, draft.length)}
                  onChange={e => setDraft(e.target.value)}
                  onFocus={e => e.target.select()}
                  onBlur={commitRename}
                  onKeyDown={e => {
                    e.stopPropagation()
                    if (e.key === 'Enter') { e.preventDefault(); commitRename(); editor.commands.focus() }
                    if (e.key === 'Escape') { e.preventDefault(); setRenaming(null) }
                  }}
                />
              </span>
            ) : (
              <button
                key={i}
                ref={el => { tabRefs.current[i] = el }}
                id={tabId(i)}
                type="button"
                role="tab"
                aria-selected={i === current}
                tabIndex={i === current ? 0 : -1}
                className={`jx-tabs__tab ${i === current ? 'is-active' : ''}`}
                onClick={() => open(i)}
                onDoubleClick={() => startRename(i)}
                onPointerEnter={e => { if (isNav && e.pointerType === 'mouse') setDropdown(tab.subtabs.length ? i : null) }}
                title={editable ? 'Double-click to rename' : undefined}
              >
                {tab.icon && <span className="jx-tabs__icon" aria-hidden="true">{tab.icon}</span>}
                <span className="jx-tabs__label">{tab.title}</span>
                {isNav && tab.subtabs.length > 0 && (
                  <span
                    className="jx-tabs__chevron"
                    role="button"
                    aria-label={`${tab.title} pages`}
                    aria-expanded={dropdown === i}
                    onClick={e => { e.stopPropagation(); setDropdown(dropdown === i ? null : i) }}
                  >
                    <ChevronDown size={14} />
                  </span>
                )}
              </button>
            )
          )}
          {isNav && compact && menuLinks.map((link, i) => (
            <a key={`x${i}`} className="jx-tabs__tab jx-tabs__listlink" href={link.link || undefined} onClick={e => { e.preventDefault(); follow(link.link) }}>
              {link.label}
              {/^https?:/i.test(link.link) && <ExternalLink size={12} />}
            </a>
          ))}
          {indicator && (
            <span className="jx-tabs__indicator" aria-hidden="true" style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }} />
          )}
        </div>

        {isNav && dropdown !== null && tabs[dropdown] && (
          <div className="jx-tabs__dropdown" style={{ left: (stripRef.current?.offsetLeft ?? 0) + (tabRefs.current[dropdown]?.offsetLeft ?? 0) }} role="menu">
            <button type="button" className="is-overview" onClick={() => open(dropdown)}>{tabs[dropdown].title}</button>
            {tabs[dropdown].subtabs.map(title => (
              <button type="button" key={title} onClick={() => openSub(dropdown, title)}>{title}</button>
            ))}
          </div>
        )}

        {isNav && (
          <div className="jx-tabs__extras">
            {menuLinks.map((link, i) => (
              <a key={i} className="jx-tabs__extra" href={link.link || undefined} onClick={e => { e.preventDefault(); follow(link.link) }}>
                {link.label}
                {/^https?:/i.test(link.link) && <ExternalLink size={12} />}
              </a>
            ))}
            <button type="button" className="jx-tabs__search" aria-label="Search this page" title="Search (Ctrl+F)" onClick={() => (editor as any).emit('jotx:openSearch')}>
              <Search size={15} />
            </button>
          </div>
        )}

        {editable && (
          <div className="jx-tabs__actions" data-tabs-menu={uid}>
            <button type="button" className="jx-tabs__action" title="Tab options" aria-label="Tab options" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}>
              <MoreHorizontal size={15} />
            </button>
            <button type="button" className="jx-tabs__action" title="Add a tab" aria-label="Add a tab" onClick={addTab}>
              <Plus size={15} />
            </button>

            {menuOpen && (
              <div className="jx-tabs__menu" role="menu">
                <div className="jx-tabs__menu-title">{tabs[current].title}</div>
                <button type="button" role="menuitem" onClick={() => startRename(current)}><Pencil size={14} /> Rename</button>
                <button type="button" role="menuitem" disabled={current === 0} onClick={() => moveTab(current, -1)}><ChevronLeft size={14} /> Move left</button>
                <button type="button" role="menuitem" disabled={current === tabs.length - 1} onClick={() => moveTab(current, 1)}><ChevronRight size={14} /> Move right</button>
                <div className="jx-tabs__menu-label">Icon</div>
                <div className="jx-tabs__icons">
                  <button type="button" className={!tabs[current].icon ? 'is-on' : ''} title="No icon" onClick={() => setTabAttrs(current, { icon: '' })}>–</button>
                  {ICONS.map(icon => (
                    <button type="button" key={icon} className={tabs[current].icon === icon ? 'is-on' : ''} onClick={() => setTabAttrs(current, { icon })}>{icon}</button>
                  ))}
                </div>
                <button type="button" role="menuitem" className="is-danger" onClick={() => deleteTab(current)}>
                  <Trash2 size={14} /> {tabs.length === 1 ? 'Remove tabs, keep content' : 'Delete tab'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <NodeViewContent className="jx-tabs__panels" />
    </NodeViewWrapper>
  )
}
