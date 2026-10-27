import React, { useState } from 'react'
import { Scale, ThumbsUp, ThumbsDown, Plus, X } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { lines } from '../text'
import '../../styles/widgets/proscons.css'

type Side = 'pros' | 'cons'

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function ProsConsView({ attrs, update, editable }: WidgetViewProps) {
  const lists: Record<Side, string[]> = { pros: lines(attrs.pros), cons: lines(attrs.cons) }
  const [adding, setAdding] = useState<Side | null>(null)
  const [draft, setDraft] = useState('')

  const add = (side: Side) => {
    const text = draft.trim()
    if (!text) return
    update({ [side]: [...lists[side], text].join('\n') })
    setDraft('')
  }

  const remove = (side: Side, i: number) => update({ [side]: lists[side].filter((_, j) => j !== i).join('\n') })

  const p = lists.pros.length
  const c = lists.cons.length
  const total = p + c
  const proShare = total === 0 ? 50 : Math.round((p / total) * 100)
  const verdict = total === 0 ? 'Nothing weighed yet' : p === c ? 'Evenly balanced' : p > c ? 'Leaning yes' : 'Leaning no'

  const column = (side: Side) => {
    const isPro = side === 'pros'
    return (
      <section className={`jx-pc__col jx-pc__col--${side}`} data-tone={isPro ? 'green' : 'red'}>
        <header className="jx-pc__head">
          {isPro ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
          <span>{isPro ? 'Pros' : 'Cons'}</span>
          <span className="jx-pc__count">{lists[side].length}</span>
        </header>
        <ul className="jx-pc__list">
          {lists[side].map((item, i) => (
            <li key={`${i}-${item}`} className="jx-pc__item">
              <span className="jx-pc__mark">{isPro ? '+' : '−'}</span>
              <span className="jx-pc__text">{item}</span>
              {editable && (
                <button type="button" className="jx-icon-btn jx-pc__remove" title="Remove" onClick={() => remove(side, i)}>
                  <X size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {editable && (adding === side ? (
          <input
            className="jx-input jx-pc__input"
            autoFocus
            placeholder={isPro ? 'Add a pro, Enter to save' : 'Add a con, Enter to save'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { add(side); setAdding(null) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); add(side) }
              if (e.key === 'Escape') { setDraft(''); setAdding(null) }
            }}
          />
        ) : (
          <button type="button" className="jx-pc__add" title={isPro ? 'Add pro' : 'Add con'}
            onClick={() => { setDraft(''); setAdding(side) }}>
            <Plus size={12} /> Add {isPro ? 'pro' : 'con'}
          </button>
        ))}
      </section>
    )
  }

  return (
    <div className="jx-pc">
      <div className="jx-pc__balance">
        <div className="jx-pc__balance-meta">
          <span className="jx-pc__verdict">{verdict}</span>
          <span className="jx-subtle">{plural(p, 'pro')} vs {plural(c, 'con')}</span>
        </div>
        <div className="jx-pc__bar" role="img" aria-label={`${p} pros versus ${c} cons`}>
          <span className="jx-pc__bar-pro" style={{ width: `${proShare}%` }} />
          <span className="jx-pc__bar-con" style={{ width: `${100 - proShare}%` }} />
        </div>
      </div>
      <div className="jx-pc__cols">
        {column('pros')}
        {column('cons')}
      </div>
    </div>
  )
}

export const prosconsWidget: WidgetSpec = {
  name: 'proscons',
  label: 'Pros & Cons',
  description: 'Weigh two sides of a decision',
  icon: Scale,
  keywords: ['pros', 'cons', 'decision', 'compare', 'tradeoff', 'versus', 'weigh'],
  category: 'planning',
  defaults: {
    title: 'Migrate to a monorepo?',
    pros: 'One place for shared types\nAtomic cross-package changes\nSimpler CI setup',
    cons: 'Longer initial clone\nTooling migration effort'
  },
  fields: [
    { key: 'title', label: 'Question', kind: 'text' },
    { key: 'pros', label: 'Pros', kind: 'textarea', rows: 4, help: 'One pro per line' },
    { key: 'cons', label: 'Cons', kind: 'textarea', rows: 4, help: 'One con per line' }
  ],
  View: ProsConsView
}
