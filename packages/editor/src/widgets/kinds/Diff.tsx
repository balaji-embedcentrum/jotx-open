import React, { useMemo, useState } from 'react'
import { GitCompare } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import '../../styles/widgets/diff.css'

type Op = 'eq' | 'del' | 'add'

interface DiffRow {
  op: Op
  text: string
  a?: number // line number in "before"
  b?: number // line number in "after"
}

const MAX_LINES = 2000

function splitLines(text: string): string[] {
  if (!text) return []
  return text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n')
}

/** Line diff: trim the common prefix/suffix, then LCS on the middle. */
function diffLines(before: string[], after: string[]): DiffRow[] {
  const a = before.slice(0, MAX_LINES)
  const b = after.slice(0, MAX_LINES)
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB-- }

  const midA = a.slice(start, endA)
  const midB = b.slice(start, endB)
  const n = midA.length
  const m = midB.length
  const rows: DiffRow[] = []

  for (let i = 0; i < start; i++) rows.push({ op: 'eq', text: a[i], a: i + 1, b: i + 1 })

  if (n * m > 4_000_000) {
    // Too large for a full LCS table: show the changed region as a replace
    midA.forEach((t, i) => rows.push({ op: 'del', text: t, a: start + i + 1 }))
    midB.forEach((t, j) => rows.push({ op: 'add', text: t, b: start + j + 1 }))
  } else {
    const w = m + 1
    const lcs = new Uint32Array((n + 1) * w)
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i * w + j] = midA[i] === midB[j]
          ? lcs[(i + 1) * w + j + 1] + 1
          : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1])
      }
    }
    let i = 0
    let j = 0
    while (i < n || j < m) {
      if (i < n && j < m && midA[i] === midB[j]) {
        rows.push({ op: 'eq', text: midA[i], a: start + i + 1, b: start + j + 1 })
        i++; j++
      } else if (j < m && (i >= n || lcs[i * w + j + 1] >= lcs[(i + 1) * w + j])) {
        rows.push({ op: 'add', text: midB[j], b: start + j + 1 })
        j++
      } else {
        rows.push({ op: 'del', text: midA[i], a: start + i + 1 })
        i++
      }
    }
  }

  for (let k = 0; k < a.length - endA; k++) {
    rows.push({ op: 'eq', text: a[endA + k], a: endA + k + 1, b: endB + k + 1 })
  }
  return rows
}

interface SplitRow {
  left?: DiffRow
  right?: DiffRow
}

/** Pair runs of deletions with the following additions for side-by-side view. */
function toSplit(rows: DiffRow[]): SplitRow[] {
  const out: SplitRow[] = []
  let k = 0
  while (k < rows.length) {
    if (rows[k].op === 'eq') {
      out.push({ left: rows[k], right: rows[k] })
      k++
      continue
    }
    const dels: DiffRow[] = []
    const adds: DiffRow[] = []
    while (k < rows.length && rows[k].op === 'del') dels.push(rows[k++])
    while (k < rows.length && rows[k].op === 'add') adds.push(rows[k++])
    for (let x = 0; x < Math.max(dels.length, adds.length); x++) out.push({ left: dels[x], right: adds[x] })
  }
  return out
}

const SIGN: Record<Op, string> = { eq: ' ', del: '−', add: '+' }

function Cell({ row, side }: { row?: DiffRow; side: 'a' | 'b' }) {
  if (!row) return <><td className="jx-diff__num is-blank" /><td className="jx-diff__code is-blank" /></>
  const op = row.op
  return (
    <>
      <td className={`jx-diff__num is-${op}`}>{side === 'a' ? row.a : row.b}</td>
      <td className={`jx-diff__code is-${op}`}><span className="jx-diff__sign">{SIGN[op]}</span>{row.text || ' '}</td>
    </>
  )
}

function DiffView({ attrs, editable, setEditing }: WidgetViewProps) {
  const [mode, setMode] = useState<'unified' | 'split'>('unified')
  const rows = useMemo(
    () => diffLines(splitLines(attrs.before), splitLines(attrs.after)),
    [attrs.before, attrs.after]
  )
  const added = rows.filter(r => r.op === 'add').length
  const removed = rows.filter(r => r.op === 'del').length

  if (!attrs.before && !attrs.after) {
    return (
      <div className="jx-empty">
        Nothing to compare.{editable && <> <button type="button" className="jx-btn jx-btn--ghost" onClick={() => setEditing(true)}>Add before / after</button></>}
      </div>
    )
  }

  return (
    <div className="jx-diff">
      <div className="jx-diff__bar">
        <span className="jx-diff__stat is-add">+{added}</span>
        <span className="jx-diff__stat is-del">−{removed}</span>
        {attrs.language && <span className="jx-chip">{attrs.language}</span>}
        <span className="jx-diff__spacer" />
        <div className="jx-diff__toggle" role="group" aria-label="Diff layout">
          <button type="button" className={mode === 'unified' ? 'is-active' : ''} onClick={() => setMode('unified')} title="Unified view" aria-pressed={mode === 'unified'}>Unified</button>
          <button type="button" className={mode === 'split' ? 'is-active' : ''} onClick={() => setMode('split')} title="Side-by-side view" aria-pressed={mode === 'split'}>Split</button>
        </div>
      </div>
      <div className="jx-diff__scroll">
        {mode === 'unified' ? (
          <table className="jx-diff__table">
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className={`jx-diff__num is-${r.op}`}>{r.a ?? ''}</td>
                  <td className={`jx-diff__num is-${r.op}`}>{r.b ?? ''}</td>
                  <td className={`jx-diff__code is-${r.op}`}><span className="jx-diff__sign">{SIGN[r.op]}</span>{r.text || ' '}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="jx-diff__table is-split">
            <tbody>
              {toSplit(rows).map((r, i) => (
                <tr key={i}>
                  <Cell row={r.left} side="a" />
                  <Cell row={r.right} side="b" />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export const diffWidget: WidgetSpec = {
  name: 'diff',
  label: 'Diff',
  description: 'Before/after code diff, unified or split',
  icon: GitCompare,
  keywords: ['diff', 'compare', 'changes', 'patch', 'before', 'after', 'git', 'review'],
  category: 'developer',
  defaults: {
    title: 'Retry on failure',
    language: 'typescript',
    before: 'async function load(url: string) {\n  const res = await fetch(url)\n  return res.json()\n}',
    after: 'async function load(url: string, retries = 3) {\n  for (let i = 0; i < retries; i++) {\n    const res = await fetch(url)\n    if (res.ok) return res.json()\n  }\n  throw new Error(`Failed: ${url}`)\n}'
  },
  fields: [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'language', label: 'Language', kind: 'text', placeholder: 'typescript' },
    { key: 'before', label: 'Before', kind: 'textarea', rows: 8, mono: true },
    { key: 'after', label: 'After', kind: 'textarea', rows: 8, mono: true }
  ],
  View: DiffView
}
