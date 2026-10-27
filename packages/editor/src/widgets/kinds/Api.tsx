import React, { useEffect, useRef, useState } from 'react'
import { Webhook, Copy, Check, ChevronRight } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import { copyText } from '../text'
import '../../styles/widgets/api.css'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const METHOD_TONE: Record<string, string> = {
  GET: 'blue',
  POST: 'green',
  PUT: 'amber',
  PATCH: 'violet',
  DELETE: 'red',
  HEAD: 'slate',
  OPTIONS: 'slate'
}

/** Split a path into plain text and :param / {param} segments. */
function pathParts(path: string): Array<{ text: string; param: boolean }> {
  const out: Array<{ text: string; param: boolean }> = []
  const re = /(\{[^}/]+\}|:[A-Za-z_][\w-]*)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(path)) !== null) {
    if (m.index > last) out.push({ text: path.slice(last, m.index), param: false })
    out.push({ text: m[0], param: true })
    last = m.index + m[0].length
  }
  if (last < path.length) out.push({ text: path.slice(last), param: false })
  return out
}

/** Pretty-print JSON when the pane holds valid JSON; otherwise show it verbatim. */
function prettify(text: string): string {
  const t = text.trim()
  if (!/^[[{]/.test(t)) return text
  try {
    return JSON.stringify(JSON.parse(t), null, 2)
  } catch {
    return text
  }
}

function Pane({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>()
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const body = prettify(text)

  return (
    <div className={`jx-api__pane${open ? ' is-open' : ''}`}>
      <div className="jx-api__pane-head">
        <button type="button" className="jx-api__pane-toggle" onClick={() => setOpen(!open)} aria-expanded={open} title={open ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
          <ChevronRight size={14} className="jx-api__chevron" />
          <span>{label}</span>
        </button>
        <button
          type="button"
          className="jx-icon-btn"
          title={`Copy ${label.toLowerCase()}`}
          onClick={() => copyText(body).then(ok => {
            if (!ok) return
            setCopied(true)
            window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => setCopied(false), 1400)
          })}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      {open && <pre className="jx-api__code"><code>{body}</code></pre>}
    </div>
  )
}

function ApiView({ attrs }: WidgetViewProps) {
  const method = (attrs.method || 'GET').toUpperCase()
  const path = attrs.path || '/'
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>()
  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <div className="jx-api">
      <div className="jx-api__head">
        <span className="jx-api__method" data-tone={METHOD_TONE[method] || 'slate'}>{method}</span>
        <code className="jx-api__path">
          {pathParts(path).map((p, i) => p.param
            ? <span key={i} className="jx-api__param">{p.text}</span>
            : <React.Fragment key={i}>{p.text}</React.Fragment>)}
        </code>
        <button
          type="button"
          className="jx-icon-btn jx-api__copy"
          title="Copy path"
          onClick={() => copyText(path).then(ok => {
            if (!ok) return
            setCopied(true)
            window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => setCopied(false), 1400)
          })}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      {attrs.summary && <div className="jx-api__summary">{attrs.summary}</div>}
      {(attrs.request.trim() || attrs.response.trim()) && (
        <div className="jx-api__panes">
          {attrs.request.trim() && <Pane label="Request" text={attrs.request} />}
          {attrs.response.trim() && <Pane label="Response" text={attrs.response} />}
        </div>
      )}
    </div>
  )
}

export const apiWidget: WidgetSpec = {
  name: 'api',
  label: 'API Endpoint',
  description: 'Document an HTTP endpoint with examples',
  icon: Webhook,
  keywords: ['api', 'endpoint', 'rest', 'http', 'route', 'request', 'response', 'get', 'post'],
  category: 'developer',
  defaults: {
    method: 'GET',
    path: '/api/v1/users/{id}',
    summary: 'Fetch a single user by id.',
    request: '',
    response: '{\n  "id": "u_123",\n  "name": "Ada Lovelace",\n  "email": "ada@example.com"\n}'
  },
  fields: [
    { key: 'method', label: 'Method', kind: 'select', options: METHODS },
    { key: 'path', label: 'Path', kind: 'text', placeholder: '/api/v1/users/{id}' },
    { key: 'summary', label: 'Summary', kind: 'textarea', rows: 2 },
    { key: 'request', label: 'Request', kind: 'textarea', rows: 5, mono: true, help: 'Request body or example (JSON is pretty-printed)' },
    { key: 'response', label: 'Response', kind: 'textarea', rows: 6, mono: true, help: 'Response example (JSON is pretty-printed)' }
  ],
  View: ApiView,
  frameless: true
}
