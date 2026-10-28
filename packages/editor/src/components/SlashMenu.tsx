/**
 * Slash Menu - Beautiful, filtered by document type
 * Notion-like command palette
 */

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import {
  Heading1,
  Heading2,
  Heading3,
  Type,
  List,
  ListOrdered,
  CheckSquare,
  MessageSquare,
  Code,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Film,
  Paperclip,
  AlertCircle,
  Table2,
  GitGraph,
  BarChart3,
  CalendarClock,
  Sigma,
  ChevronDown,
  FoldVertical,
  Database,
  SearchCode,
  ListChecks,
  Layout,
  PanelTop,
  Columns2,
  Columns3,
  Search
} from 'lucide-react'
import { WIDGETS, WIDGET_CATEGORY_LABELS, type WidgetCategory } from '../widgets'
import '../styles/SlashMenu.css'

export interface SlashMenuItem {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  keywords: string[]
  allowedIn: ('page' | 'meeting' | 'tasklist')[]
  group: SlashGroup
}

export type SlashGroup = 'basic' | 'lists' | 'layout' | 'media' | 'data' | WidgetCategory

export const GROUP_ORDER: { id: SlashGroup; label: string }[] = [
  { id: 'basic', label: 'Basic blocks' },
  { id: 'lists', label: 'Lists' },
  { id: 'layout', label: 'Layout' },
  { id: 'media', label: 'Media & links' },
  { id: 'data', label: 'Data, code & diagrams' },
  { id: 'productivity', label: WIDGET_CATEGORY_LABELS.productivity },
  { id: 'planning', label: WIDGET_CATEGORY_LABELS.planning },
  { id: 'developer', label: WIDGET_CATEGORY_LABELS.developer }
]

export const ALL_COMMANDS: SlashMenuItem[] = [
  {
    id: 'heading1',
    group: 'basic',
    label: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 size={18} />,
    keywords: ['h1', 'title', 'heading', 'large'],
    allowedIn: ['page']
  },
  {
    id: 'heading2',
    group: 'basic',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 size={18} />,
    keywords: ['h2', 'heading', 'section'],
    allowedIn: ['page', 'meeting', 'tasklist']
  },
  {
    id: 'heading3',
    group: 'basic',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 size={18} />,
    keywords: ['h3', 'heading', 'subsection'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'paragraph',
    group: 'basic',
    label: 'Text',
    description: 'Plain text paragraph',
    icon: <Type size={18} />,
    keywords: ['text', 'paragraph', 'p'],
    allowedIn: ['page', 'meeting', 'tasklist']
  },
  {
    id: 'bulletList',
    group: 'lists',
    label: 'Bullet List',
    description: 'Unordered list',
    icon: <List size={18} />,
    keywords: ['list', 'bullet', 'ul', 'unordered'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'orderedList',
    group: 'lists',
    label: 'Numbered List',
    description: 'Ordered list',
    icon: <ListOrdered size={18} />,
    keywords: ['list', 'number', 'ol', 'ordered'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'checklist',
    group: 'lists',
    label: 'Checklist',
    description: 'Task list with checkboxes',
    icon: <CheckSquare size={18} />,
    keywords: ['todo', 'task', 'check', 'checkbox'],
    allowedIn: ['page', 'meeting', 'tasklist']
  },
  {
    id: 'blockquote',
    group: 'basic',
    label: 'Quote',
    description: 'Blockquote',
    icon: <MessageSquare size={18} />,
    keywords: ['quote', 'blockquote', 'citation'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'codeBlock',
    group: 'data',
    label: 'Code Block',
    description: 'Editable code with syntax highlighting',
    icon: <Code size={18} />,
    keywords: ['code', 'codeblock', 'pre', 'programming', 'edit'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'divider',
    group: 'basic',
    label: 'Divider',
    description: 'Horizontal divider line',
    icon: <Minus size={18} />,
    keywords: ['divider', 'hr', 'line', 'separator'],
    allowedIn: ['page', 'meeting', 'tasklist']
  },
  {
    id: 'callout',
    group: 'basic',
    label: 'Callout',
    description: 'Highlighted callout (choose type inline)',
    icon: <AlertCircle size={18} />,
    keywords: ['callout', 'info', 'warning', 'success', 'danger', 'note', 'alert'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'imageBlock',
    group: 'media',
    label: 'Image',
    description: 'Image with text below (upload or paste)',
    icon: <ImageIcon size={18} />,
    keywords: ['image', 'img', 'picture', 'photo'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'floatImageBlock',
    group: 'media',
    label: 'Image Float',
    description: 'Floating image with text wrapping',
    icon: <ImageIcon size={18} />,
    keywords: ['float', 'wrap', 'image', 'picture'],
    allowedIn: ['page']
  },
  {
    id: 'videoBlock',
    group: 'media',
    label: 'Video',
    description: 'YouTube or local video player',
    icon: <Film size={18} />,
    keywords: ['video', 'youtube', 'movie', 'film'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'link',
    group: 'media',
    label: 'Link',
    description: 'Underline link (opens in browser)',
    icon: <LinkIcon size={18} />,
    keywords: ['link', 'url', 'web'],
    allowedIn: ['page', 'meeting', 'tasklist']
  },
  {
    id: 'jotxlink',
    group: 'media',
    label: 'Jotx Link',
    description: 'Link to another document or block',
    icon: <LinkIcon size={18} />,
    keywords: ['jotxlink', 'internal', 'block', 'reference', 'navigate'],
    allowedIn: ['page', 'meeting', 'tasklist']
  },
  {
    id: 'attach',
    group: 'media',
    label: 'Attach',
    description: 'Attach a file/link (standalone block)',
    icon: <Paperclip size={18} />,
    keywords: ['attach', 'file', 'attachment'],
    allowedIn: ['page', 'meeting', 'tasklist']
  },
  {
    id: 'table',
    group: 'data',
    label: 'Table',
    description: 'Insert a table',
    icon: <Table2 size={18} />,
    keywords: ['table', 'grid'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'mermaid',
    group: 'data',
    label: 'Mermaid',
    description: 'Diagram (flowchart, sequence, etc.)',
    icon: <GitGraph size={18} />,
    keywords: ['mermaid', 'diagram', 'flow', 'sequence', 'graph', 'uml'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'chart',
    group: 'data',
    label: 'Chart',
    description: 'Bar / Pie / Radar chart',
    icon: <BarChart3 size={18} />,
    keywords: ['chart', 'bar', 'pie', 'radar', 'graph'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'datetime',
    group: 'data',
    label: 'Date / Time',
    description: 'Date/time picker block',
    icon: <CalendarClock size={18} />,
    keywords: ['date', 'time', 'datetime', 'calendar', 'schedule'],
    allowedIn: ['page', 'meeting', 'tasklist']
  },
  {
    id: 'math',
    group: 'data',
    label: 'Math',
    description: 'LaTeX math with live preview',
    icon: <Sigma size={18} />,
    keywords: ['math', 'latex', 'katex', 'equation', 'formula'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'toggle',
    group: 'basic',
    label: 'Toggle',
    description: 'Collapsible content block',
    icon: <ChevronDown size={18} />,
    keywords: ['toggle', 'collapse', 'expand', 'accordion', 'details'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'section',
    group: 'layout',
    label: 'Section',
    description: 'Collapsible section with title',
    icon: <FoldVertical size={18} />,
    keywords: ['section', 'collapse', 'group', 'container'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'codeReference',
    group: 'data',
    label: 'Code Reference',
    description: 'Reference code from local files',
    icon: <SearchCode size={18} />,
    keywords: ['ref', 'coderef', 'reference', 'link', 'embed'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'useTemplate',
    group: 'layout',
    label: 'Use Template',
    description: 'Insert a pre-built template structure',
    icon: <Layout size={18} />,
    keywords: ['template', 'insert', 'use', 'copy', 'preset', 'structure'],
    allowedIn: ['page', 'meeting', 'tasklist']
  },
  {
    id: 'gridcard',
    group: 'layout',
    label: 'Grid Card',
    description: 'Dashboard cards for stats and navigation',
    icon: <PanelTop size={18} />,
    keywords: ['grid', 'card', 'dashboard', 'stat', 'widget', 'navigation'],
    allowedIn: ['page']
  },
  {
    id: 'button',
    group: 'layout',
    label: 'Button',
    description: 'Navigation button to another file',
    icon: <PanelTop size={18} />,
    keywords: ['button', 'nav', 'navigation', 'next', 'previous', 'link'],
    allowedIn: ['page']
  },
  {
    id: 'buttonstrip',
    group: 'layout',
    label: 'Button Strip',
    description: '1-3 buttons in a horizontal row',
    icon: <Layout size={18} />,
    keywords: ['buttonstrip', 'buttons', 'row', 'navigation', 'horizontal'],
    allowedIn: ['page']
  },
  {
    id: 'columns2',
    group: 'layout',
    label: '2 Columns',
    description: 'Side-by-side layout with two columns',
    icon: <Columns2 size={18} />,
    keywords: ['columns', 'layout', 'side', 'split', 'grid', 'two'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'columns3',
    group: 'layout',
    label: '3 Columns',
    description: 'Layout with three columns',
    icon: <Columns3 size={18} />,
    keywords: ['columns', 'layout', 'grid', 'three'],
    allowedIn: ['page', 'meeting']
  },
  {
    id: 'tabs',
    group: 'layout',
    label: 'Tabs',
    description: 'Pages of content under a tab bar',
    icon: <PanelTop size={18} />,
    keywords: ['tabs', 'pages', 'menu', 'sections', 'switch', 'layout'],
    allowedIn: ['page', 'meeting']
  },
  ...WIDGETS.map((w): SlashMenuItem => ({
    id: w.name,
    group: w.category,
    label: w.label,
    description: w.description,
    icon: <w.icon size={18} />,
    keywords: [w.name, 'widget', ...w.keywords],
    allowedIn: ['page', 'meeting', 'tasklist']
  }))
]

export interface SlashMenuProps {
  documentType: 'page' | 'meeting' | 'tasklist'
  query: string
  position: { x: number; y: number }
  context?: { inTableCell?: boolean; inPropertiesTable?: boolean }
  onSelect: (command: string) => void
  onClose: () => void
}

/** Higher is better; 0 means no match. */
function scoreCommand(cmd: SlashMenuItem, q: string): number {
  if (!q) return 1
  const label = cmd.label.toLowerCase()
  if (label === q) return 100
  if (label.startsWith(q)) return 80
  if (label.split(/\s+/).some(w => w.startsWith(q))) return 60
  if (cmd.keywords.some(k => k === q)) return 50
  if (cmd.keywords.some(k => k.startsWith(q))) return 40
  if (label.includes(q)) return 30
  if (cmd.keywords.some(k => k.includes(q))) return 20
  if (cmd.description.toLowerCase().includes(q)) return 10
  return 0
}

export function SlashMenu({
  documentType,
  query,
  position,
  context,
  onSelect,
  onClose
}: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  const inTableCell = !!context?.inTableCell
  const inPropertiesTable = !!context?.inPropertiesTable
  const q = query ? query.toLowerCase().trim() : ''

  // Filter commands by document type and context (table cells / properties cells)
  const available = ALL_COMMANDS.filter(cmd => {
    // Properties table cells: keep plain text only (no nested blocks for now)
    if (inPropertiesTable) return cmd.id === 'paragraph'

    // Table cell: disallow headings, table, properties and layout-level blocks
    if (inTableCell && (['heading1', 'heading2', 'heading3', 'table', 'divider', 'columns2', 'columns3', 'tabs'].includes(cmd.id) || WIDGETS.some(w => w.name === cmd.id))) {
      return false
    }

    // Table cell: allow code blocks regardless of docType restriction
    const effectiveDocType = ((documentType as string) === 'jot' || (documentType as string) === 'jotx') ? 'page' : documentType
    return inTableCell && cmd.id === 'codeBlock' ? true : cmd.allowedIn.includes(effectiveDocType as any)
  })

  // With a query: one ranked list. Without: grouped sections in a fixed order.
  const sections: { label: string; items: SlashMenuItem[] }[] = q
    ? [{
      label: 'Best matches',
      items: available
        .map(cmd => ({ cmd, score: scoreCommand(cmd, q) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(r => r.cmd)
    }]
    : GROUP_ORDER
      .map(g => ({ label: g.label, items: available.filter(c => c.group === g.id) }))
      .filter(sec => sec.items.length > 0)

  const filteredCommands = sections.flatMap(sec => sec.items)

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keep the keyboard selection visible while navigating
  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Keep menu within viewport: flip above cursor near bottom; clamp left/right/top/bottom.
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) {
      setAdjustedPosition(position)
      return
    }

    const MARGIN = 12
    const GAP = 8

    // Measure after the DOM paints
    const raf = window.requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight

      let x = position.x
      let y = position.y

      // Horizontal clamp
      if (x + rect.width + MARGIN > vw) {
        x = Math.max(MARGIN, vw - rect.width - MARGIN)
      }
      if (x < MARGIN) x = MARGIN

      // Vertical: prefer below cursor, but flip above if overflowing bottom
      if (y + rect.height + MARGIN > vh) {
        y = position.y - rect.height - GAP
      }
      // Clamp to viewport
      if (y + rect.height + MARGIN > vh) {
        y = Math.max(MARGIN, vh - rect.height - MARGIN)
      }
      if (y < MARGIN) y = MARGIN

      setAdjustedPosition({ x, y })
    })

    return () => window.cancelAnimationFrame(raf)
  }, [position.x, position.y, query, documentType])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => (i + 1) % Math.max(1, filteredCommands.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => (i - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].id)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, filteredCommands, onSelect, onClose])

  const style = { left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }

  const searchBar = (
    <div className="jotx-slash-menu-search">
      <Search size={14} />
      {q
        ? <span>Results for <strong>{query}</strong></span>
        : <span className="jotx-slash-menu-search-hint">Type to filter {available.length} blocks &amp; widgets</span>}
    </div>
  )

  if (filteredCommands.length === 0) {
    return (
      <div ref={menuRef} className="jotx-slash-menu" style={style}>
        {searchBar}
        <div className="jotx-slash-menu-empty">
          No blocks match “{query}”
        </div>
      </div>
    )
  }

  let flatIndex = -1
  itemRefs.current = []

  return (
    <div ref={menuRef} className="jotx-slash-menu" style={style} role="listbox">
      {searchBar}

      <div className="jotx-slash-menu-items">
        {sections.map(section => (
          <div key={section.label} className="jotx-slash-menu-section">
            <div className="jotx-slash-menu-header">{section.label}</div>
            {section.items.map(cmd => {
              flatIndex += 1
              const index = flatIndex
              return (
                <button
                  key={cmd.id}
                  ref={el => { itemRefs.current[index] = el }}
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={`jotx-slash-menu-item ${index === selectedIndex ? 'selected' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelect(cmd.id)}
                  onMouseMove={() => { if (index !== selectedIndex) setSelectedIndex(index) }}
                >
                  <span className="jotx-slash-menu-icon">{cmd.icon}</span>
                  <div className="jotx-slash-menu-content">
                    <div className="jotx-slash-menu-label">{cmd.label}</div>
                    <div className="jotx-slash-menu-description">{cmd.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="jotx-slash-menu-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> insert</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    </div>
  )
}
