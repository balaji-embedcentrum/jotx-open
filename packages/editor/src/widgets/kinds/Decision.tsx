import React from 'react'
import { Gavel, CalendarDays, Info, CircleCheck, GitBranch } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import '../../styles/widgets/decision.css'

const STATUSES = ['proposed', 'accepted', 'rejected', 'superseded']

const STATUS_TONE: Record<string, string> = {
  proposed: 'amber',
  accepted: 'green',
  rejected: 'red',
  superseded: 'slate'
}

function formatDate(value: string): string {
  if (!value) return ''
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00` : value)
  return isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function DecisionView({ attrs, update, editable, setEditing }: WidgetViewProps) {
  const status = (attrs.status || 'proposed').toLowerCase()
  const tone = STATUS_TONE[status] || 'slate'

  const sections = [
    { key: 'context', label: 'Context', icon: Info },
    { key: 'decision', label: 'Decision', icon: CircleCheck },
    { key: 'consequences', label: 'Consequences', icon: GitBranch }
  ].filter(s => attrs[s.key]?.trim())

  const cycleStatus = () => {
    const i = STATUSES.indexOf(status)
    update({ status: STATUSES[(i + 1) % STATUSES.length] })
  }

  return (
    <div className="jx-adr">
      <div className="jx-adr__meta">
        {editable ? (
          <button type="button" className="jx-adr__status" data-tone={tone} onClick={cycleStatus}
            title="Click to change status">
            <span className="jx-adr__status-dot" />{status}
          </button>
        ) : (
          <span className="jx-adr__status" data-tone={tone}><span className="jx-adr__status-dot" />{status}</span>
        )}
        {attrs.date && (
          <span className="jx-adr__date"><CalendarDays size={13} /> {formatDate(attrs.date)}</span>
        )}
      </div>

      {sections.length === 0 ? (
        <div className="jx-empty">
          Describe the context, the decision and its consequences.
          {editable && <> <button type="button" className="jx-btn jx-btn--ghost" onClick={() => setEditing(true)}>Write it</button></>}
        </div>
      ) : (
        <div className="jx-adr__sections">
          {sections.map(({ key, label, icon: Icon }) => (
            <section key={key} className={`jx-adr__section jx-adr__section--${key}`}>
              <h4 className="jx-adr__label"><Icon size={13} /> {label}</h4>
              <p className="jx-adr__text">{attrs[key]}</p>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export const decisionWidget: WidgetSpec = {
  name: 'decision',
  label: 'Decision Record',
  description: 'Lightweight ADR: context, decision, consequences',
  icon: Gavel,
  keywords: ['decision', 'adr', 'architecture', 'record', 'rfc', 'choice', 'log'],
  category: 'planning',
  defaults: {
    title: 'Use SQLite for local caching',
    status: 'accepted',
    date: '2026-10-27',
    context: 'The extension re-parses every note on startup, which takes several seconds on large workspaces.',
    decision: 'Cache parsed node metadata in a SQLite file inside the workspace storage folder.',
    consequences: 'Startup drops to under a second. We now own a schema migration path and must invalidate the cache on parser changes.'
  },
  fields: [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'status', label: 'Status', kind: 'select', options: STATUSES },
    { key: 'date', label: 'Date', kind: 'date' },
    { key: 'context', label: 'Context', kind: 'textarea', rows: 3, help: 'What forces are at play? Why decide now?' },
    { key: 'decision', label: 'Decision', kind: 'textarea', rows: 3, help: 'What did we decide to do?' },
    { key: 'consequences', label: 'Consequences', kind: 'textarea', rows: 3, help: 'What becomes easier or harder?' }
  ],
  View: DecisionView
}
