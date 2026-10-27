import React, { useState } from 'react'
import { Keyboard, Search } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { lines, cells } from '../text'
import '../../styles/widgets/shortcuts.css'

interface Shortcut {
  keys: string
  description: string
}

const KEY_GLYPHS: Record<string, string> = {
  cmd: '⌘', command: '⌘', meta: '⌘',
  shift: '⇧',
  opt: '⌥', option: '⌥', alt: '⌥',
  ctrl: 'Ctrl', control: 'Ctrl',
  enter: '↵', return: '↵',
  esc: 'Esc', escape: 'Esc',
  tab: '⇥',
  backspace: '⌫', delete: '⌦', del: '⌦',
  up: '↑', down: '↓', left: '←', right: '→',
  space: 'Space'
}

function parseShortcuts(text: string): Shortcut[] {
  return lines(text).map(line => {
    const idx = line.indexOf('|')
    if (idx < 0) return { keys: line, description: '' }
    const [keys] = cells(line.slice(0, idx), 1)
    return { keys, description: line.slice(idx + 1).trim() }
  })
}

/** "Cmd+Shift+P" -> [["⌘","⇧","P"]]; "g g" -> [["G"],["G"]]; a lone "+" stays a key. */
function chords(keys: string): string[][] {
  return keys
    .split(/\s+/)
    .filter(Boolean)
    .map(chord => {
      const parts = chord.split(/\+(?!$)/).filter(Boolean)
      return parts.map(p => {
        const glyph = KEY_GLYPHS[p.toLowerCase()]
        if (glyph) return glyph
        return p.length === 1 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)
      })
    })
}

function Keys({ keys }: { keys: string }) {
  const seq = chords(keys)
  return (
    <span className="jx-shortcuts__keys" aria-label={keys}>
      {seq.map((chord, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="jx-shortcuts__then">then</span>}
          <span className="jx-shortcuts__chord">
            {chord.map((k, j) => <kbd key={j} className="jx-kbd">{k}</kbd>)}
          </span>
        </React.Fragment>
      ))}
    </span>
  )
}

function ShortcutsView({ attrs, editable, setEditing }: WidgetViewProps) {
  const items = parseShortcuts(attrs.items)
  const [query, setQuery] = useState('')

  if (items.length === 0) {
    return (
      <div className="jx-empty">
        No shortcuts yet.{editable && <> <button type="button" className="jx-btn jx-btn--ghost" onClick={() => setEditing(true)}>Add shortcuts</button></>}
      </div>
    )
  }

  const q = query.trim().toLowerCase()
  const shown = q
    ? items.filter(s => s.description.toLowerCase().includes(q) || s.keys.toLowerCase().includes(q))
    : items

  return (
    <div className="jx-shortcuts">
      {items.length > 8 && (
        <div className="jx-shortcuts__filter">
          <Search size={14} />
          <input
            className="jx-input"
            type="search"
            value={query}
            placeholder={`Filter ${items.length} shortcuts…`}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter shortcuts"
          />
        </div>
      )}
      <div className="jx-shortcuts__grid">
        {shown.map((s, i) => (
          <div key={i} className="jx-shortcuts__row">
            <span className="jx-shortcuts__desc">{s.description || '—'}</span>
            <Keys keys={s.keys} />
          </div>
        ))}
      </div>
      {shown.length === 0 && <div className="jx-shortcuts__none">No shortcuts match “{query}”.</div>}
    </div>
  )
}

export const shortcutsWidget: WidgetSpec = {
  name: 'shortcuts',
  label: 'Shortcuts',
  description: 'Keyboard shortcut cheat sheet',
  icon: Keyboard,
  keywords: ['shortcuts', 'keyboard', 'keys', 'hotkeys', 'cheatsheet', 'keybindings', 'kbd'],
  category: 'developer',
  defaults: {
    title: 'Editor shortcuts',
    items: 'Cmd+Shift+P | Command palette\nCmd+P | Quick open file\nCmd+B | Toggle sidebar\nCmd+/ | Toggle line comment\nOpt+Shift+F | Format document\ng d | Go to definition (Vim)'
  },
  fields: [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'items', label: 'Shortcuts', kind: 'textarea', rows: 8, mono: true, help: 'One per line: Cmd+Shift+P | Description (separate key sequences with spaces, e.g. "g g")' }
  ],
  View: ShortcutsView
}
