/**
 * Generic settings panel rendered from a widget's field list.
 */

import React from 'react'
import type { WidgetAttrs, WidgetField } from './types'

interface WidgetSettingsProps {
  fields: WidgetField[]
  attrs: WidgetAttrs
  update: (patch: WidgetAttrs) => void
  onDone: () => void
}

/** <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" without seconds/zone. */
function toLocalInput(value: string, kind: 'date' | 'datetime'): string {
  if (!value) return ''
  if (kind === 'date') return value.slice(0, 10)
  return value.length >= 16 ? value.slice(0, 16) : value
}

export function WidgetSettings({ fields, attrs, update, onDone }: WidgetSettingsProps) {
  return (
    <div className="jx-widget__settings" onKeyDown={(e) => { if (e.key === 'Escape') onDone() }}>
      {fields.map((field) => {
        const value = attrs[field.key] ?? ''
        const id = `jx-field-${field.key}`
        const set = (v: string) => update({ [field.key]: v })
        let control: React.ReactNode

        switch (field.kind) {
          case 'textarea':
            control = (
              <textarea
                id={id}
                className={`jx-input jx-textarea${field.mono ? ' jx-mono' : ''}`}
                rows={field.rows || 5}
                value={value}
                placeholder={field.placeholder}
                spellCheck={!field.mono}
                onChange={(e) => set(e.target.value)}
              />
            )
            break
          case 'select':
            control = (
              <select id={id} className="jx-input" value={value} onChange={(e) => set(e.target.value)}>
                {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )
            break
          case 'number':
            control = (
              <input id={id} className="jx-input" type="number" value={value} placeholder={field.placeholder}
                onChange={(e) => set(e.target.value)} />
            )
            break
          case 'date':
          case 'datetime':
            control = (
              <input id={id} className="jx-input" type={field.kind === 'date' ? 'date' : 'datetime-local'}
                value={toLocalInput(value, field.kind)} onChange={(e) => set(e.target.value)} />
            )
            break
          case 'color':
            control = (
              <div className="jx-color-field">
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#14b8a6'}
                  onChange={(e) => set(e.target.value)} aria-label={field.label} />
                <input id={id} className="jx-input jx-mono" value={value} placeholder="#14b8a6"
                  onChange={(e) => set(e.target.value)} />
              </div>
            )
            break
          default:
            control = (
              <input id={id} className="jx-input" type="text" value={value} placeholder={field.placeholder}
                onChange={(e) => set(e.target.value)} />
            )
        }

        return (
          <div key={field.key} className={`jx-field${field.kind === 'textarea' ? ' jx-field--wide' : ''}`}>
            <label htmlFor={id} className="jx-field__label">{field.label}</label>
            {control}
            {field.help && <div className="jx-field__help">{field.help}</div>}
          </div>
        )
      })}
      <div className="jx-widget__settings-actions">
        <button type="button" className="jx-btn jx-btn--primary" onClick={onDone}>Done</button>
      </div>
    </div>
  )
}
