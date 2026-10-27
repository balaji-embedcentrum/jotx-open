import React, { useEffect, useRef, useState } from 'react'
import { SquareTerminal, Copy, Check } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { copyText } from '../text'
import '../../styles/widgets/terminal.css'

interface TermLine {
  kind: 'command' | 'output'
  text: string
}

function parseLines(text: string): TermLine[] {
  const raw = (text || '').replace(/^\s*\n/, '').replace(/\s+$/, '').split('\n')
  if (raw.length === 1 && !raw[0].trim()) return []
  const hasPrompt = raw.some(l => /^\s*\$( |$)/.test(l))
  if (!hasPrompt) {
    return raw.map(l => l.trim()).filter(Boolean).map(text => ({ kind: 'command' as const, text }))
  }
  return raw.map(l => {
    const m = l.match(/^\s*\$ ?(.*)$/)
    return m ? { kind: 'command' as const, text: m[1] } : { kind: 'output' as const, text: l }
  })
}

function useCopied(): [string | null, (key: string, text: string) => void] {
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<number>()
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const copy = (key: string, text: string) => {
    copyText(text).then(ok => {
      if (!ok) return
      setCopied(key)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(null), 1400)
    })
  }
  return [copied, copy]
}

function TerminalView({ attrs, editable, setEditing }: WidgetViewProps) {
  const termLines = parseLines(attrs.commands)
  const commands = termLines.filter(l => l.kind === 'command').map(l => l.text)
  const [copied, copy] = useCopied()

  return (
    <div className="jx-term">
      <div className="jx-term__bar">
        <span className="jx-term__dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="jx-term__title">{attrs.title || attrs.shell || 'Terminal'}</span>
        {attrs.shell && attrs.title && <span className="jx-term__shell">{attrs.shell}</span>}
        <span className="jx-term__spacer" />
        {commands.length > 0 && (
          <button
            type="button"
            className="jx-term__btn"
            title="Copy all commands"
            onClick={() => copy('all', commands.join('\n'))}
          >
            {copied === 'all' ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied === 'all' ? 'Copied' : 'Copy all'}</span>
          </button>
        )}
      </div>
      <div className="jx-term__screen">
        {termLines.length === 0 ? (
          <div className="jx-term__line is-output">
            {editable
              ? <button type="button" className="jx-term__empty" onClick={() => setEditing(true)}>Add commands…</button>
              : 'No commands'}
          </div>
        ) : termLines.map((line, i) => line.kind === 'command' ? (
          <div key={i} className="jx-term__line is-command">
            <span className="jx-term__prompt" aria-hidden="true">$</span>
            <code className="jx-term__cmd">{line.text}</code>
            <button
              type="button"
              className={`jx-term__copy${copied === `l${i}` ? ' is-copied' : ''}`}
              title="Copy command"
              onClick={() => copy(`l${i}`, line.text)}
            >
              {copied === `l${i}` ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        ) : (
          <div key={i} className="jx-term__line is-output"><code>{line.text || ' '}</code></div>
        ))}
      </div>
    </div>
  )
}

export const terminalWidget: WidgetSpec = {
  name: 'terminal',
  label: 'Terminal',
  description: 'Shell commands with one-click copy',
  icon: SquareTerminal,
  keywords: ['terminal', 'shell', 'bash', 'command', 'cli', 'console', 'zsh', 'snippet'],
  category: 'developer',
  defaults: {
    title: 'Setup',
    shell: 'bash',
    commands: '$ npm install\nadded 312 packages in 4s\n$ npm run build\n$ npm test'
  },
  fields: [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'shell', label: 'Shell', kind: 'text', placeholder: 'bash' },
    { key: 'commands', label: 'Commands', kind: 'textarea', rows: 7, mono: true, help: 'Lines starting with "$ " are commands; other lines are shown as output' }
  ],
  View: TerminalView,
  frameless: true
}
