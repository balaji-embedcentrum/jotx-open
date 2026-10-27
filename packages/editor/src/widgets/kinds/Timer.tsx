import React, { useEffect, useRef, useState } from 'react'
import { Timer, Play, Pause, RotateCcw, Brain, Coffee } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { num, clamp } from '../text'
import '../../styles/widgets/timer.css'

type Mode = 'focus' | 'break'

const RING_R = 54
const RING_C = 2 * Math.PI * RING_R

function format(sec: number): string {
  const s = Math.max(0, Math.ceil(sec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// Runtime state is intentionally ephemeral: nothing here is written to attrs.
function TimerView({ attrs }: WidgetViewProps) {
  const focusMin = clamp(num(attrs.minutes, 25), 1, 240)
  const breakMin = clamp(num(attrs.breakminutes, 5), 1, 120)

  const [mode, setMode] = useState<Mode>('focus')
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(focusMin * 60)
  const [pulse, setPulse] = useState(false)
  const endAt = useRef(0)

  const duration = (mode === 'focus' ? focusMin : breakMin) * 60

  // Settings changed while idle: snap to the new duration
  useEffect(() => {
    if (!running) setRemaining((mode === 'focus' ? focusMin : breakMin) * 60)
  }, [focusMin, breakMin])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const left = (endAt.current - Date.now()) / 1000
      if (left <= 0) {
        const next: Mode = mode === 'focus' ? 'break' : 'focus'
        setRunning(false)
        setMode(next)
        setRemaining((next === 'focus' ? focusMin : breakMin) * 60)
        setPulse(true)
        window.setTimeout(() => setPulse(false), 1600)
      } else {
        setRemaining(left)
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [running, mode, focusMin, breakMin])

  const start = () => {
    endAt.current = Date.now() + remaining * 1000
    setRunning(true)
  }

  const switchMode = (m: Mode) => {
    setRunning(false)
    setMode(m)
    setRemaining((m === 'focus' ? focusMin : breakMin) * 60)
  }

  const reset = () => switchMode(mode)
  const progress = clamp(1 - remaining / duration, 0, 1)

  return (
    <div className={`jx-timer${pulse ? ' is-pulse' : ''}`} data-tone={mode === 'focus' ? 'teal' : 'amber'}>
      <div className="jx-timer__modes" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'focus'} title={`Focus · ${focusMin} min`}
          className={`jx-timer__mode${mode === 'focus' ? ' is-active' : ''}`} onClick={() => switchMode('focus')}>
          <Brain size={13} /> Focus
        </button>
        <button type="button" role="tab" aria-selected={mode === 'break'} title={`Break · ${breakMin} min`}
          className={`jx-timer__mode${mode === 'break' ? ' is-active' : ''}`} onClick={() => switchMode('break')}>
          <Coffee size={13} /> Break
        </button>
      </div>

      <div className="jx-timer__dial">
        <svg viewBox="0 0 128 128" className="jx-timer__ring" aria-hidden="true">
          <circle cx="64" cy="64" r={RING_R} className="jx-timer__ring-track" />
          <circle cx="64" cy="64" r={RING_R} className="jx-timer__ring-fill"
            strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - progress)} />
        </svg>
        <div className="jx-timer__readout">
          <span className="jx-timer__time" aria-live="polite">{format(remaining)}</span>
          <span className="jx-timer__state">{running ? (mode === 'focus' ? 'Focusing' : 'On break') : 'Paused'}</span>
        </div>
      </div>

      <div className="jx-timer__controls">
        <button type="button" className="jx-btn jx-btn--primary jx-timer__primary"
          title={running ? 'Pause' : 'Start'} onClick={() => (running ? setRunning(false) : start())}>
          {running ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Start</>}
        </button>
        <button type="button" className="jx-icon-btn" title="Reset" onClick={reset}>
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  )
}

export const timerWidget: WidgetSpec = {
  name: 'timer',
  label: 'Focus Timer',
  description: 'Pomodoro-style focus timer',
  icon: Timer,
  keywords: ['timer', 'pomodoro', 'focus', 'break', 'clock', 'stopwatch'],
  category: 'productivity',
  defaults: { title: 'Focus session', minutes: '25', breakminutes: '5' },
  fields: [
    { key: 'title', label: 'Label', kind: 'text' },
    { key: 'minutes', label: 'Focus minutes', kind: 'number', placeholder: '25' },
    { key: 'breakminutes', label: 'Break minutes', kind: 'number', placeholder: '5' }
  ],
  View: TimerView
}
