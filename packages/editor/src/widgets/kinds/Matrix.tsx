import React, { useState } from 'react'
import { Grid2x2, Plus, X, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { lines } from '../text'
import '../../styles/widgets/matrix.css'

type QuadKey = 'dofirst' | 'schedule' | 'delegate' | 'eliminate'

// Grid order: top-left, top-right, bottom-left, bottom-right
const QUADS: { key: QuadKey; title: string; hint: string; tone: string }[] = [
  { key: 'dofirst', title: 'Do first', hint: 'Urgent · Important', tone: 'red' },
  { key: 'schedule', title: 'Schedule', hint: 'Important · Not urgent', tone: 'blue' },
  { key: 'delegate', title: 'Delegate', hint: 'Urgent · Not important', tone: 'amber' },
  { key: 'eliminate', title: 'Eliminate', hint: 'Neither', tone: 'slate' }
]

const DRAG_MIME = 'application/x-jotx-matrix-item'

function MatrixView({ attrs, update, editable }: WidgetViewProps) {
  const items: Record<QuadKey, string[]> = {
    dofirst: lines(attrs.dofirst), schedule: lines(attrs.schedule), delegate: lines(attrs.delegate), eliminate: lines(attrs.eliminate)
  }
  const [adding, setAdding] = useState<QuadKey | null>(null)
  const [draft, setDraft] = useState('')
  const [dropTarget, setDropTarget] = useState<QuadKey | null>(null)

  const add = (q: QuadKey) => {
    const text = draft.trim()
    if (!text) return
    update({ [q]: [...items[q], text].join('\n') })
    setDraft('')
  }

  const remove = (q: QuadKey, i: number) => update({ [q]: items[q].filter((_, j) => j !== i).join('\n') })

  const move = (from: QuadKey, i: number, to: QuadKey) => {
    if (from === to) return
    const item = items[from][i]
    if (item === undefined) return
    update({
      [from]: items[from].filter((_, j) => j !== i).join('\n'),
      [to]: [...items[to], item].join('\n')
    })
  }

  return (
    <div className="jx-matrix">
      <div className="jx-matrix__axis jx-matrix__axis--top">
        <span>Urgent</span><span>Not urgent</span>
      </div>
      <div className="jx-matrix__grid">
        {QUADS.map((quad, qi) => {
          const col = qi % 2
          const row = Math.floor(qi / 2)
          const horizontal = QUADS[row * 2 + (1 - col)].key
          const vertical = QUADS[(1 - row) * 2 + col].key
          return (
            <section
              key={quad.key}
              className={`jx-matrix__quad${dropTarget === quad.key ? ' is-drop' : ''}`}
              data-tone={quad.tone}
              onDragOver={(e) => {
                if (!editable || !e.dataTransfer.types.includes(DRAG_MIME)) return
                e.preventDefault()
                e.stopPropagation()
                if (dropTarget !== quad.key) setDropTarget(quad.key)
              }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null) }}
              onDrop={(e) => {
                if (!editable) return
                e.preventDefault()
                e.stopPropagation()
                setDropTarget(null)
                const [from, idx] = e.dataTransfer.getData(DRAG_MIME).split(':')
                if (from && idx !== undefined) move(from as QuadKey, Number(idx), quad.key)
              }}
            >
              <header className="jx-matrix__head">
                <span className="jx-matrix__title">{quad.title}</span>
                <span className="jx-matrix__count">{items[quad.key].length}</span>
                <span className="jx-widget__spacer" />
                <span className="jx-matrix__hint">{quad.hint}</span>
              </header>
              <ul className="jx-matrix__list">
                {items[quad.key].map((item, i) => (
                  <li
                    key={`${i}-${item}`}
                    className="jx-matrix__item"
                    draggable={editable}
                    onDragStart={(e) => {
                      e.stopPropagation()
                      e.dataTransfer.setData(DRAG_MIME, `${quad.key}:${i}`)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={(e) => { e.stopPropagation(); setDropTarget(null) }}
                  >
                    <span className="jx-matrix__bullet" />
                    <span className="jx-matrix__text">{item}</span>
                    {editable && (
                      <span className="jx-matrix__actions">
                        <button type="button" className="jx-icon-btn"
                          title={`Move to ${QUADS.find(q => q.key === horizontal)!.title}`}
                          onClick={() => move(quad.key, i, horizontal)}>
                          {col === 0 ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
                        </button>
                        <button type="button" className="jx-icon-btn"
                          title={`Move to ${QUADS.find(q => q.key === vertical)!.title}`}
                          onClick={() => move(quad.key, i, vertical)}>
                          {row === 0 ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                        </button>
                        <button type="button" className="jx-icon-btn" title="Remove" onClick={() => remove(quad.key, i)}>
                          <X size={12} />
                        </button>
                      </span>
                    )}
                  </li>
                ))}
                {items[quad.key].length === 0 && !editable && <li className="jx-matrix__none">Nothing here</li>}
              </ul>
              {editable && (adding === quad.key ? (
                <input
                  className="jx-input jx-matrix__input"
                  autoFocus
                  placeholder="Add item, Enter to save"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => { add(quad.key); setAdding(null) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); add(quad.key) }
                    if (e.key === 'Escape') { setDraft(''); setAdding(null) }
                  }}
                />
              ) : (
                <button type="button" className="jx-matrix__add" title={`Add to ${quad.title}`}
                  onClick={() => { setDraft(''); setAdding(quad.key) }}>
                  <Plus size={12} /> Add
                </button>
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}

const LIST_HELP = 'One item per line'

export const matrixWidget: WidgetSpec = {
  name: 'matrix',
  label: 'Priority Matrix',
  description: 'Eisenhower urgent / important matrix',
  icon: Grid2x2,
  keywords: ['matrix', 'eisenhower', 'priority', 'urgent', 'important', 'triage', 'quadrant'],
  category: 'planning',
  defaults: {
    title: 'This week',
    dofirst: 'Fix production login bug\nShip release notes',
    schedule: 'Plan Q3 roadmap\nWrite onboarding docs',
    delegate: 'Reply to vendor emails',
    eliminate: 'Reorganize bookmarks'
  },
  fields: [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'dofirst', label: 'Do first (urgent + important)', kind: 'textarea', rows: 3, help: LIST_HELP },
    { key: 'schedule', label: 'Schedule (important)', kind: 'textarea', rows: 3, help: LIST_HELP },
    { key: 'delegate', label: 'Delegate (urgent)', kind: 'textarea', rows: 3, help: LIST_HELP },
    { key: 'eliminate', label: 'Eliminate (neither)', kind: 'textarea', rows: 3, help: LIST_HELP }
  ],
  View: MatrixView
}
