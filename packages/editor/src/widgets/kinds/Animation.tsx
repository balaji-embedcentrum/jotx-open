import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Waypoints, Play, Pause, StepBack, StepForward, RotateCcw } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { lines, cells, num, clamp } from '../text'
import '../../styles/widgets/animation.css'

interface Step {
  node: string
  caption: string
}

function parseSteps(text: string): Step[] {
  return lines(text).map(line => {
    const [node, ...rest] = line.split('|')
    return { node: (node || '').trim(), caption: rest.join('|').trim() }
  }).filter(s => s.node)
}

const VERTICAL_BELOW = 560
const END_PAUSE_MS = 1100

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return reduced
}

function AnimationView({ attrs }: WidgetViewProps) {
  const steps = parseSteps(attrs.steps)
  const count = steps.length
  const speed = clamp(num(attrs.speed, 1.6), 0.4, 10)
  const reduced = usePrefersReducedMotion()
  const autoplay = attrs.autoplay !== 'false'

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(() => autoplay && !reduced)
  const [visible, setVisible] = useState(true)
  const [docHidden, setDocHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  const [vertical, setVertical] = useState(false)
  const [token, setToken] = useState<{ x: number; y: number } | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])

  // Keep the index valid when steps are edited
  useEffect(() => {
    if (index > Math.max(0, count - 1)) setIndex(0)
  }, [count, index])

  // Reduced motion: never auto-play
  useEffect(() => {
    if (reduced) setPlaying(false)
  }, [reduced])

  // Pause offscreen and in background tabs
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(entries => setVisible(entries[0]?.isIntersecting ?? true), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    const on = () => setDocHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])

  // Switch to a vertical layout in narrow containers
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth
      setVertical(w < VERTICAL_BELOW)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Place the token on the active node's center
  const measure = useCallback(() => {
    const track = trackRef.current
    const node = nodeRefs.current[index]
    if (!track || !node) { setToken(null); return }
    const t = track.getBoundingClientRect()
    const n = node.getBoundingClientRect()
    // Row layout: centered above the node; vertical layout: in the lane left of the nodes
    const x = vertical ? 9 : n.left - t.left + n.width / 2 + track.scrollLeft
    setToken({ x, y: n.top - t.top + n.height / 2 })
  }, [index, vertical])

  useLayoutEffect(() => { measure() }, [measure, vertical, count, attrs.steps])
  useEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(track)
    return () => ro.disconnect()
  }, [measure])

  // Playback loop: dwell on each node, then a longer pause before looping
  const running = playing && visible && !docHidden && count > 1
  useEffect(() => {
    if (!running) return
    const atEnd = index >= count - 1
    const id = window.setTimeout(() => setIndex(i => (i >= count - 1 ? 0 : i + 1)), speed * 1000 + (atEnd ? END_PAUSE_MS : 0))
    return () => window.clearTimeout(id)
  }, [running, index, count, speed])

  if (count === 0) {
    return <div className="jx-empty">Add steps (one per line: Node | caption) to animate a flow.</div>
  }

  const active = steps[Math.min(index, count - 1)]
  const travelMs = Math.round(Math.min(speed * 0.55, 0.9) * 1000)
  const progress = count > 1 ? index / (count - 1) : 1

  const go = (i: number) => setIndex(((i % count) + count) % count)

  return (
    <div
      ref={rootRef}
      className={`jx-anim${vertical ? ' is-vertical' : ''}${reduced ? ' is-reduced' : ''}`}
      style={{ ['--jx-anim-travel' as any]: `${travelMs}ms` }}
    >
      <div className="jx-anim__stage">
        <div className="jx-anim__track" ref={trackRef}>
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <div className={`jx-anim__link${i <= index ? ' is-done' : ''}`} aria-hidden="true">
                  <span className="jx-anim__link-fill" />
                  <span className="jx-anim__arrow" />
                </div>
              )}
              <div
                ref={el => { nodeRefs.current[i] = el }}
                className={`jx-anim__node${i === index ? ' is-active' : ''}${i < index ? ' is-past' : ''}`}
              >
                <button type="button" className="jx-anim__node-btn" title={`Go to step ${i + 1}`} onClick={() => go(i)}>
                  <span className="jx-anim__num">{i + 1}</span>
                  <span className="jx-anim__label">{s.node}</span>
                </button>
              </div>
            </React.Fragment>
          ))}
          {token && (
            <span
              className="jx-anim__token"
              aria-hidden="true"
              style={{ transform: `translate(${token.x}px, ${token.y}px)` }}
            />
          )}
        </div>
      </div>

      <div className="jx-anim__caption" aria-live="polite">
        <span className="jx-anim__step">Step {index + 1} of {count}</span>
        <span className="jx-anim__caption-node">{active.node}</span>
        {active.caption && <span className="jx-anim__caption-text">{active.caption}</span>}
      </div>

      <div className="jx-anim__controls">
        <button type="button" className="jx-icon-btn" title="Restart" onClick={() => go(0)}>
          <RotateCcw size={14} />
        </button>
        <button type="button" className="jx-icon-btn" title="Previous step" onClick={() => go(index - 1)}>
          <StepBack size={14} />
        </button>
        <button
          type="button"
          className="jx-icon-btn jx-anim__play"
          title={playing ? 'Pause' : (reduced ? 'Auto-play is off because reduced motion is on' : 'Play')}
          aria-pressed={playing}
          disabled={reduced || count < 2}
          onClick={() => setPlaying(p => !p)}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button type="button" className="jx-icon-btn" title="Next step" onClick={() => go(index + 1)}>
          <StepForward size={14} />
        </button>
        <div
          className="jx-anim__progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={count}
          aria-valuenow={index + 1}
        >
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

export const animationWidget: WidgetSpec = {
  name: 'animation',
  label: 'Animated Flow',
  description: 'Animate a request or process moving step by step',
  icon: Waypoints,
  keywords: ['animation', 'animate', 'flow', 'sequence', 'process', 'lifecycle', 'walkthrough', 'architecture'],
  category: 'planning',
  defaults: {
    title: 'Saving a document',
    steps: 'Browser | User clicks Save\nAPI gateway | Auth checked, request routed\nSync service | Change merged with CRDT\nDatabase | Write committed\nBrowser | UI confirms the save',
    speed: '1.6',
    autoplay: 'true'
  },
  fields: [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'steps', label: 'Steps', kind: 'textarea', rows: 6, help: 'One step per line: Node | caption' },
    { key: 'speed', label: 'Seconds per step', kind: 'number', placeholder: '1.6' },
    { key: 'autoplay', label: 'Autoplay', kind: 'select', options: ['true', 'false'] }
  ],
  View: AnimationView
}
