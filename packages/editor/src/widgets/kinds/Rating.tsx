import React, { useState } from 'react'
import { Star } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { num, clamp } from '../text'
import '../../styles/widgets/rating.css'

function RatingView({ attrs, update, editable }: WidgetViewProps) {
  const max = clamp(Math.round(num(attrs.max, 5)), 1, 10)
  const value = clamp(Math.round(num(attrs.value, 0)), 0, max)
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value

  const set = (n: number) => update({ value: String(n === value ? 0 : n) })

  return (
    <div className="jx-rating">
      {attrs.title && <span className="jx-rating__label">{attrs.title}</span>}
      <div
        className={`jx-rating__stars${editable ? ' is-editable' : ''}`}
        role={editable ? 'radiogroup' : 'img'}
        aria-label={`${value} out of ${max}`}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: max }, (_, i) => {
          const n = i + 1
          const on = n <= shown
          const star = <Star size={18} strokeWidth={1.75} />
          return editable ? (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === value}
              className={`jx-rating__star${on ? ' is-on' : ''}${hover !== null ? ' is-preview' : ''}`}
              title={n === value ? 'Clear rating' : `Rate ${n} of ${max}`}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(null)}
              onClick={() => set(n)}
            >
              {star}
            </button>
          ) : (
            <span key={n} className={`jx-rating__star${on ? ' is-on' : ''}`}>{star}</span>
          )
        })}
      </div>
      <span className="jx-rating__value">{shown} / {max}</span>
    </div>
  )
}

export const ratingWidget: WidgetSpec = {
  name: 'rating',
  label: 'Rating',
  description: 'Star rating',
  icon: Star,
  keywords: ['rating', 'stars', 'score', 'review', 'rank'],
  category: 'productivity',
  defaults: { title: 'Overall', value: '4', max: '5' },
  fields: [
    { key: 'title', label: 'Label', kind: 'text', placeholder: 'Overall' },
    { key: 'value', label: 'Rating', kind: 'number' },
    { key: 'max', label: 'Out of', kind: 'select', options: ['3', '5', '10'] }
  ],
  frameless: true,
  View: RatingView
}
