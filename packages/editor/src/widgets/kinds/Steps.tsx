import React from 'react'
import { ListOrdered, Check } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { lines, cells, joinCells } from '../text'
import '../../styles/widgets/steps.css'

interface Step {
  done: boolean
  title: string
  detail: string
}

function parseSteps(text: string): Step[] {
  return lines(text).map(line => {
    const m = line.match(/^\[( |x|X)?\]\s*(.*)$/)
    const done = !!m && (m[1] === 'x' || m[1] === 'X')
    const rest = m ? m[2] : line
    const [title, detail] = cells(rest, 2)
    return { done, title, detail: rest.includes('|') ? rest.slice(rest.indexOf('|') + 1).trim() : detail }
  })
}

function serializeSteps(steps: Step[]): string {
  return steps.map(s => `${s.done ? '[x]' : '[ ]'} ${joinCells([s.title, s.detail])}`).join('\n')
}

function StepsView({ attrs, update, editable, setEditing }: WidgetViewProps) {
  const steps = parseSteps(attrs.steps)

  if (steps.length === 0) {
    return (
      <div className="jx-empty">
        No steps yet.{editable && <> <button type="button" className="jx-btn jx-btn--ghost" onClick={() => setEditing(true)}>Add steps</button></>}
      </div>
    )
  }

  const doneCount = steps.filter(s => s.done).length
  const toggle = (index: number) => {
    if (!editable) return
    update({ steps: serializeSteps(steps.map((s, i) => (i === index ? { ...s, done: !s.done } : s))) })
  }
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <div className="jx-steps">
      <div className="jx-steps__summary">
        <span>{doneCount} of {steps.length} done</span>
        <div className="jx-steps__meter"><div style={{ width: `${pct}%` }} /></div>
      </div>
      <ol className="jx-steps__list">
        {steps.map((step, i) => (
          <li key={i} className={`jx-steps__item${step.done ? ' is-done' : ''}`}>
            <button
              type="button"
              className="jx-steps__marker"
              disabled={!editable}
              onClick={() => toggle(i)}
              title={editable ? (step.done ? 'Mark as not done' : 'Mark as done') : undefined}
              aria-pressed={step.done}
            >
              {step.done ? <Check size={13} strokeWidth={3} /> : i + 1}
            </button>
            <div className="jx-steps__content">
              <div className="jx-steps__title">{step.title || `Step ${i + 1}`}</div>
              {step.detail && <div className="jx-steps__detail">{step.detail}</div>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export const stepsWidget: WidgetSpec = {
  name: 'steps',
  label: 'Steps',
  description: 'Numbered how-to steps you can tick off',
  icon: ListOrdered,
  keywords: ['steps', 'howto', 'guide', 'tutorial', 'procedure', 'stepper', 'checklist'],
  category: 'planning',
  defaults: {
    title: 'Getting started',
    steps: '[x] Clone the repo | git clone https://github.com/you/project\n[x] Install dependencies | npm install\n[ ] Configure environment | Copy .env.example to .env\n[ ] Start the dev server | npm run dev'
  },
  fields: [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'steps', label: 'Steps', kind: 'textarea', rows: 6, mono: true, help: 'One per line: [x] Step title | optional detail' }
  ],
  View: StepsView
}
