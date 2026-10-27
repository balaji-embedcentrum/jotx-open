import React from 'react'
import { Repeat, Check, Flame } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { lines, cells, accentAt } from '../text'
import '../../styles/widgets/habit.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Habit {
  name: string
  days: boolean[]
}

function parseHabits(text: string): Habit[] {
  return lines(text).map(line => {
    const [name, marks] = cells(line, 2)
    const flags = marks.replace(/[^01xX.\-]/g, '')
    const days = DAYS.map((_, i) => flags[i] === '1' || flags[i] === 'x' || flags[i] === 'X')
    return { name, days }
  })
}

function serializeHabits(habits: Habit[]): string {
  return habits.map(h => `${h.name} | ${h.days.map(d => (d ? '1' : '0')).join('')}`).join('\n')
}

/** Monday-first index of today (0 = Mon ... 6 = Sun). */
function todayIndex(): number {
  return (new Date().getDay() + 6) % 7
}

/** Consecutive done days ending today (or yesterday if today isn't done yet). */
function streak(days: boolean[], today: number): number {
  let i = days[today] ? today : today - 1
  let n = 0
  while (i >= 0 && days[i]) { n++; i-- }
  return n
}

function HabitView({ attrs, update, editable, setEditing }: WidgetViewProps) {
  const habits = parseHabits(attrs.habits)
  const today = todayIndex()

  if (habits.length === 0) {
    return (
      <div className="jx-empty">
        No habits yet.{editable && <> <button type="button" className="jx-btn jx-btn--ghost" onClick={() => setEditing(true)}>Add habits</button></>}
      </div>
    )
  }

  const toggle = (hi: number, di: number) => {
    if (!editable) return
    const next = habits.map((h, i) => (i === hi ? { ...h, days: h.days.map((d, j) => (j === di ? !d : d)) } : h))
    update({ habits: serializeHabits(next) })
  }

  const totalDone = habits.reduce((s, h) => s + h.days.filter(Boolean).length, 0)
  const weekPct = Math.round((totalDone / (habits.length * 7)) * 100)

  return (
    <div className="jx-habit">
      <div className="jx-habit__grid" role="table">
        <div className="jx-habit__row jx-habit__row--head" role="row">
          <span className="jx-habit__name" role="columnheader">This week · {weekPct}%</span>
          {DAYS.map((d, i) => (
            <span key={d} className={`jx-habit__day${i === today ? ' is-today' : ''}`} role="columnheader">{d.slice(0, 2)}</span>
          ))}
          <span className="jx-habit__stat" role="columnheader">Streak</span>
        </div>
        {habits.map((h, hi) => {
          const s = streak(h.days, today)
          const pct = Math.round((h.days.filter(Boolean).length / 7) * 100)
          return (
            <div key={hi} className="jx-habit__row" role="row" data-tone={accentAt(hi)}>
              <span className="jx-habit__name" role="cell">
                <span className="jx-habit__label">{h.name || `Habit ${hi + 1}`}</span>
                <span className="jx-habit__pct">{pct}%</span>
              </span>
              {h.days.map((done, di) => (
                <span key={di} role="cell" className={`jx-habit__cell-wrap${di === today ? ' is-today' : ''}`}>
                  <button
                    type="button"
                    className={`jx-habit__cell${done ? ' is-done' : ''}`}
                    disabled={!editable}
                    title={`${h.name} · ${DAYS[di]}: ${done ? 'done' : 'not done'}`}
                    aria-pressed={done}
                    onClick={() => toggle(hi, di)}
                  >
                    {done && <Check size={12} strokeWidth={3} />}
                  </button>
                </span>
              ))}
              <span className={`jx-habit__stat${s > 0 ? ' is-active' : ''}`} role="cell" title={`${s}-day streak`}>
                <Flame size={12} /> {s}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const habitWidget: WidgetSpec = {
  name: 'habit',
  label: 'Habit Tracker',
  description: 'Weekly habit grid with streaks',
  icon: Repeat,
  keywords: ['habit', 'tracker', 'streak', 'routine', 'daily', 'week', 'goals'],
  category: 'productivity',
  defaults: {
    title: 'Habits',
    habits: 'Exercise | 1101100\nRead 20 pages | 1111000\nNo phone after 10pm | 0110100'
  },
  fields: [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'habits', label: 'Habits', kind: 'textarea', rows: 5, mono: true, help: 'One per line: Habit | 1010000 (Mon..Sun, 1 = done)' }
  ],
  View: HabitView
}
