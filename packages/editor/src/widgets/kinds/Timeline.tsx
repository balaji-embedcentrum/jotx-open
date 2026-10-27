import React from 'react'
import { Milestone } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { lines, cells } from '../text'
import '../../styles/widgets/timeline.css'

type Status = 'done' | 'active' | 'planned' | 'blocked'

const STATUS_TONE: Record<Status, string> = {
  done: 'green',
  active: 'blue',
  planned: 'slate',
  blocked: 'red'
}

const STATUS_LABEL: Record<Status, string> = {
  done: 'Done',
  active: 'In progress',
  planned: 'Planned',
  blocked: 'Blocked'
}

interface TimelineEvent {
  date: string
  title: string
  status: Status
  detail: string
}

function normalizeStatus(value: string): Status {
  const v = value.toLowerCase().replace(/[\s_-]/g, '')
  if (v === 'done' || v === 'complete' || v === 'completed') return 'done'
  if (v === 'active' || v === 'inprogress' || v === 'doing' || v === 'current') return 'active'
  if (v === 'blocked' || v === 'atrisk') return 'blocked'
  return 'planned'
}

function parseEvents(text: string): TimelineEvent[] {
  return lines(text).map(line => {
    const [date, title, status, ...rest] = cells(line, 4)
    return { date, title, status: normalizeStatus(status), detail: rest.filter(Boolean).join(' | ') }
  })
}

/** Format ISO dates (YYYY-MM or YYYY-MM-DD) nicely; leave anything else untouched. */
function formatDate(value: string): string {
  const full = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (full) {
    const d = new Date(Number(full[1]), Number(full[2]) - 1, Number(full[3]))
    if (!isNaN(d.getTime())) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const month = value.match(/^(\d{4})-(\d{2})$/)
  if (month) {
    const d = new Date(Number(month[1]), Number(month[2]) - 1, 1)
    if (!isNaN(d.getTime())) return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  }
  return value
}

function TimelineView({ attrs, editable, setEditing }: WidgetViewProps) {
  const events = parseEvents(attrs.events)

  if (events.length === 0) {
    return (
      <div className="jx-empty">
        No events yet.{editable && <> <button type="button" className="jx-btn jx-btn--ghost" onClick={() => setEditing(true)}>Add events</button></>}
      </div>
    )
  }

  return (
    <ol className="jx-timeline">
      {events.map((ev, i) => (
        <li key={i} className={`jx-timeline__item is-${ev.status}`} data-tone={STATUS_TONE[ev.status]}>
          <div className="jx-timeline__rail">
            <span className="jx-timeline__dot" />
          </div>
          <div className="jx-timeline__content">
            <div className="jx-timeline__meta">
              {ev.date && <time className="jx-timeline__date">{formatDate(ev.date)}</time>}
              <span className="jx-timeline__status">{STATUS_LABEL[ev.status]}</span>
            </div>
            <div className="jx-timeline__title">{ev.title || 'Untitled milestone'}</div>
            {ev.detail && <div className="jx-timeline__detail">{ev.detail}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export const timelineWidget: WidgetSpec = {
  name: 'timeline',
  label: 'Timeline',
  description: 'Milestones over time with status',
  icon: Milestone,
  keywords: ['timeline', 'milestone', 'roadmap', 'history', 'events', 'schedule', 'plan'],
  category: 'planning',
  defaults: {
    title: 'Roadmap',
    events: '2026-01-15 | Kickoff | done | Scope and team agreed\n2026-03-01 | MVP | done\n2026-05-10 | Public beta | active | Collecting feedback\n2026-08-01 | v1.0 launch | planned'
  },
  fields: [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'events', label: 'Events', kind: 'textarea', rows: 6, mono: true, help: 'One per line: date | title | done|active|planned|blocked | detail' }
  ],
  View: TimelineView
}
