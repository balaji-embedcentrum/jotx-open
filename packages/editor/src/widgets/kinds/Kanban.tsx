import React, { useState } from 'react'
import { SquareKanban, Plus, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { accentAt } from '../text'
import '../../styles/widgets/kanban.css'

interface Column {
  name: string
  cards: string[]
}

function parseBoard(text: string): Column[] {
  const cols: Column[] = []
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const header = line.match(/^\[(.*)\]$/)
    if (header) {
      cols.push({ name: header[1].trim(), cards: [] })
      continue
    }
    const card = line.replace(/^[-*]\s*/, '').trim()
    if (!card) continue
    if (cols.length === 0) cols.push({ name: 'Todo', cards: [] })
    cols[cols.length - 1].cards.push(card)
  }
  return cols
}

function serializeBoard(cols: Column[]): string {
  return cols
    .map(c => [`[${c.name}]`, ...c.cards].join('\n'))
    .join('\n')
}

const DRAG_MIME = 'application/x-jotx-kanban-card'

function KanbanView({ attrs, update, editable }: WidgetViewProps) {
  const cols = parseBoard(attrs.board)
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [adding, setAdding] = useState<number | null>(null)
  const [renaming, setRenaming] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)

  const save = (next: Column[]) => update({ board: serializeBoard(next) })
  const clone = () => cols.map(c => ({ name: c.name, cards: [...c.cards] }))

  const addCard = (ci: number) => {
    const text = (drafts[ci] || '').trim()
    if (!text) return
    const next = clone()
    next[ci].cards.push(text)
    save(next)
    setDrafts({ ...drafts, [ci]: '' })
  }

  const moveCard = (from: number, idx: number, to: number, toIdx?: number) => {
    if (to < 0 || to >= cols.length) return
    const next = clone()
    const [card] = next[from].cards.splice(idx, 1)
    if (card === undefined) return
    const target = next[to].cards
    const at = toIdx === undefined ? target.length : Math.min(toIdx, target.length)
    target.splice(at, 0, card)
    save(next)
  }

  const deleteCard = (ci: number, idx: number) => {
    const next = clone()
    next[ci].cards.splice(idx, 1)
    save(next)
  }

  const renameColumn = (ci: number, name: string) => {
    const next = clone()
    next[ci].name = name.trim() || next[ci].name
    save(next)
    setRenaming(null)
  }

  const deleteColumn = (ci: number) => {
    const next = clone()
    next.splice(ci, 1)
    save(next)
  }

  const addColumn = () => save([...clone(), { name: `Column ${cols.length + 1}`, cards: [] }])

  const onDrop = (e: React.DragEvent, ci: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDropTarget(null)
    const data = e.dataTransfer.getData(DRAG_MIME)
    if (!data) return
    const [from, idx] = data.split(':').map(Number)
    if (Number.isFinite(from) && Number.isFinite(idx) && from !== ci) moveCard(from, idx, ci)
  }

  if (cols.length === 0) {
    return (
      <div className="jx-empty">
        Empty board.{editable && <> <button type="button" className="jx-btn jx-btn--ghost" onClick={addColumn}>Add a column</button></>}
      </div>
    )
  }

  return (
    <div className="jx-kanban">
      {cols.map((col, ci) => (
        <div
          key={ci}
          className={`jx-kanban__col${dropTarget === ci ? ' is-drop' : ''}`}
          data-tone={accentAt(ci)}
          onDragOver={(e) => {
            if (!editable || !e.dataTransfer.types.includes(DRAG_MIME)) return
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = 'move'
            if (dropTarget !== ci) setDropTarget(ci)
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null)
          }}
          onDrop={(e) => editable && onDrop(e, ci)}
        >
          <div className="jx-kanban__col-head">
            <span className="jx-kanban__dot" />
            {renaming === ci ? (
              <input
                className="jx-input jx-kanban__rename"
                autoFocus
                defaultValue={col.name}
                onBlur={(e) => renameColumn(ci, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') renameColumn(ci, (e.target as HTMLInputElement).value)
                  if (e.key === 'Escape') setRenaming(null)
                }}
              />
            ) : (
              <span
                className={`jx-kanban__col-name${editable ? ' is-editable' : ''}`}
                title={editable ? 'Double-click to rename' : undefined}
                onDoubleClick={() => editable && setRenaming(ci)}
              >
                {col.name || 'Untitled'}
              </span>
            )}
            <span className="jx-kanban__count">{col.cards.length}</span>
            <span className="jx-widget__spacer" />
            {editable && (
              <button type="button" className="jx-icon-btn jx-kanban__col-action" title="Delete column" onClick={() => deleteColumn(ci)}>
                <Trash2 size={13} />
              </button>
            )}
          </div>

          <div className="jx-kanban__cards">
            {col.cards.map((card, idx) => (
              <div
                key={`${idx}-${card}`}
                className="jx-kanban__card"
                draggable={editable}
                onDragStart={(e) => {
                  e.stopPropagation()
                  e.dataTransfer.setData(DRAG_MIME, `${ci}:${idx}`)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={(e) => { e.stopPropagation(); setDropTarget(null) }}
              >
                <span className="jx-kanban__card-text">{card}</span>
                {editable && (
                  <span className="jx-kanban__card-actions">
                    <button type="button" className="jx-icon-btn" title="Move to previous column" disabled={ci === 0} onClick={() => moveCard(ci, idx, ci - 1)}>
                      <ChevronLeft size={13} />
                    </button>
                    <button type="button" className="jx-icon-btn" title="Move to next column" disabled={ci === cols.length - 1} onClick={() => moveCard(ci, idx, ci + 1)}>
                      <ChevronRight size={13} />
                    </button>
                    <button type="button" className="jx-icon-btn" title="Delete card" onClick={() => deleteCard(ci, idx)}>
                      <X size={13} />
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>

          {editable && (adding === ci ? (
            <input
              className="jx-input jx-kanban__add-input"
              autoFocus
              placeholder="Card text, Enter to add"
              value={drafts[ci] || ''}
              onChange={(e) => setDrafts({ ...drafts, [ci]: e.target.value })}
              onBlur={() => { addCard(ci); setAdding(null) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addCard(ci) }
                if (e.key === 'Escape') setAdding(null)
              }}
            />
          ) : (
            <button type="button" className="jx-kanban__add" title="Add card" onClick={() => setAdding(ci)}>
              <Plus size={13} /> Add card
            </button>
          ))}
        </div>
      ))}
      {editable && (
        <button type="button" className="jx-kanban__add-col" title="Add column" onClick={addColumn}>
          <Plus size={15} />
        </button>
      )}
    </div>
  )
}

export const kanbanWidget: WidgetSpec = {
  name: 'kanban',
  label: 'Kanban Board',
  description: 'Columns of cards you can move between stages',
  icon: SquareKanban,
  keywords: ['kanban', 'board', 'cards', 'todo', 'sprint', 'agile', 'tasks', 'trello'],
  category: 'productivity',
  defaults: {
    title: 'Sprint board',
    board: '[Todo]\nWrite release notes\nTriage bug reports\n[In progress]\nWidget framework\n[Done]\nDesign tokens'
  },
  fields: [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'board', label: 'Board', kind: 'textarea', rows: 8, mono: true, help: '"[Column]" starts a column; every other line is a card' }
  ],
  View: KanbanView
}
