import React from 'react'
import { BadgeCheck } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { lines, cells, accentAt, ACCENTS } from '../text'
import '../../styles/widgets/badges.css'

interface Badge {
  label: string
  message: string
  tone?: string
  hex?: string
}

/** Pick a sensible tone from common status words when no color is given. */
function inferTone(message: string, index: number): string {
  const m = message.toLowerCase()
  if (/^(passing|passed|success|ok|stable|healthy|up|enabled|yes|done)$/.test(m)) return 'green'
  if (/^(failing|failed|error|down|broken|critical|no)$/.test(m)) return 'red'
  if (/^(pending|beta|alpha|warning|unstable|degraded|wip)$/.test(m)) return 'amber'
  const pct = m.match(/^(\d{1,3})%$/)
  if (pct) {
    const n = Number(pct[1])
    return n >= 80 ? 'green' : n >= 50 ? 'amber' : 'red'
  }
  return accentAt(index)
}

function parseBadges(text: string): Badge[] {
  return lines(text).map((line, i) => {
    const [label, message, color] = cells(line, 3)
    const c = color.toLowerCase()
    if (/^#[0-9a-f]{3,8}$/i.test(c)) return { label, message, hex: color }
    if ((ACCENTS as readonly string[]).includes(c)) return { label, message, tone: c }
    return { label, message, tone: inferTone(message, i) }
  })
}

function BadgesView({ attrs, editable, setEditing }: WidgetViewProps) {
  const badges = parseBadges(attrs.items)

  if (badges.length === 0) {
    return (
      <div className="jx-empty">
        No badges yet.{editable && <> <button type="button" className="jx-btn jx-btn--ghost" onClick={() => setEditing(true)}>Add badges</button></>}
      </div>
    )
  }

  return (
    <div className="jx-badges">
      {badges.map((b, i) => (
        <span
          key={i}
          className={`jx-badge${b.message ? '' : ' is-single'}`}
          data-tone={b.tone}
          style={b.hex ? ({ '--jx-tone': b.hex } as React.CSSProperties) : undefined}
        >
          <span className="jx-badge__label">{b.label || b.message}</span>
          {b.message && b.label && <span className="jx-badge__message">{b.message}</span>}
        </span>
      ))}
    </div>
  )
}

export const badgesWidget: WidgetSpec = {
  name: 'badges',
  label: 'Badges',
  description: 'Status badges: build, version, coverage…',
  icon: BadgeCheck,
  keywords: ['badges', 'badge', 'shield', 'status', 'build', 'version', 'coverage', 'license'],
  category: 'developer',
  defaults: {
    items: 'build | passing\nversion | v2.5.0 | blue\ncoverage | 92%\nlicense | Apache-2.0 | slate\nnode | >=18 | violet'
  },
  fields: [
    { key: 'items', label: 'Badges', kind: 'textarea', rows: 6, mono: true, help: 'One per line: label | message | color (teal, blue, violet, pink, amber, green, red, slate or #hex)' }
  ],
  View: BadgesView,
  frameless: true
}
