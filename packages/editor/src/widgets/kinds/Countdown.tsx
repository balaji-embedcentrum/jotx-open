import React, { useEffect, useState } from 'react'
import { Hourglass, CalendarDays } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import '../../styles/widgets/countdown.css'

/** Parse an ISO date/datetime as local time (a bare date means local midnight). */
function parseTarget(value: string): Date | null {
  const v = (value || '').trim()
  if (!v) return null
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00` : v)
  return isNaN(d.getTime()) ? null : d
}

function CountdownView({ attrs, editable, setEditing }: WidgetViewProps) {
  const target = parseTarget(attrs.target)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!target) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [target?.getTime()])

  if (!target) {
    return (
      <div className="jx-empty">
        {attrs.target ? `“${attrs.target}” isn’t a valid date.` : 'Pick a date to count down to.'}
        {editable && <> <button type="button" className="jx-btn jx-btn--ghost" onClick={() => setEditing(true)}>Set date</button></>}
      </div>
    )
  }

  const diff = target.getTime() - now
  const when = target.toLocaleString(undefined, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    ...(/T\d/.test(attrs.target) ? { hour: '2-digit', minute: '2-digit' } : {})
  })

  if (diff <= 0) {
    const days = Math.floor(-diff / 86400000)
    return (
      <div className="jx-countdown is-past">
        <div className="jx-countdown__past">
          {days === 0 ? 'Happened today' : `Happened ${days} day${days === 1 ? '' : 's'} ago`}
        </div>
        <div className="jx-countdown__when"><CalendarDays size={13} /> {when}</div>
      </div>
    )
  }

  const total = Math.floor(diff / 1000)
  const units = [
    { label: 'Days', value: Math.floor(total / 86400) },
    { label: 'Hours', value: Math.floor((total % 86400) / 3600) },
    { label: 'Minutes', value: Math.floor((total % 3600) / 60) },
    { label: 'Seconds', value: total % 60 }
  ]

  return (
    <div className="jx-countdown">
      <div className="jx-countdown__tiles">
        {units.map((u, i) => (
          <div key={u.label} className="jx-countdown__tile">
            <span className="jx-countdown__value">{i === 0 ? u.value : String(u.value).padStart(2, '0')}</span>
            <span className="jx-countdown__label">{u.label}</span>
          </div>
        ))}
      </div>
      <div className="jx-countdown__when"><CalendarDays size={13} /> {when}</div>
    </div>
  )
}

export const countdownWidget: WidgetSpec = {
  name: 'countdown',
  label: 'Countdown',
  description: 'Live countdown to a date',
  icon: Hourglass,
  keywords: ['countdown', 'deadline', 'launch', 'date', 'event', 'timer', 'days'],
  category: 'productivity',
  defaults: { title: 'Launch day', target: '2027-01-01T09:00' },
  fields: [
    { key: 'title', label: 'Event', kind: 'text', placeholder: 'Launch day' },
    { key: 'target', label: 'Date & time', kind: 'datetime', help: 'Stored as ISO, e.g. 2026-12-31 or 2026-12-31T09:00' }
  ],
  View: CountdownView
}
