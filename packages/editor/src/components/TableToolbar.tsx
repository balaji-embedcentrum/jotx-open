import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Editor } from '@tiptap/react'
import {
  SlidersHorizontal,
  Filter,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Check
} from 'lucide-react'
import '../styles/TableToolbar.css'

/**
 * TableToolbar - Simplified to Sort/Filter only
 * Row/column/cell ops are now in the ribbon
 */
export function TableToolbar({ editor }: { editor: Editor }) {
  const [handlePos, setHandlePos] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 0,
    y: 0
  })
  const [open, setOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [filterCol, setFilterCol] = useState<string>('all')
  const [sortCol, setSortCol] = useState<string>('0')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const filterDebounceRef = useRef<number | null>(null)

  const getActiveTableInfo = (): { pos: number; nodeSize: number; node: any } | null => {
    const { $from } = editor.state.selection
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d)
      if (node.type?.name === 'table') {
        return { pos: $from.before(d), nodeSize: node.nodeSize, node }
      }
    }
    return null
  }

  const headers = useMemo(() => {
    const info = getActiveTableInfo()
    if (!info?.node) return []
    try {
      const firstRow = info.node.childCount > 0 ? info.node.child(0) : null
      if (!firstRow) return []
      const hs: string[] = []
      for (let i = 0; i < firstRow.childCount; i++) {
        const cell = firstRow.child(i)
        const text = (cell.textContent || '').trim()
        hs.push(text || `Column ${i + 1}`)
      }
      return hs
    } catch {
      return []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.state.selection.from, editor.state.selection.to, editor.state.doc])

  const syncStateFromNodeAttrs = () => {
    const info = getActiveTableInfo()
    const attrs = info?.node?.attrs || {}
    const f = (attrs.jotxFilter || '').toString()
    const fc = attrs.jotxFilterCol == null || attrs.jotxFilterCol === '' ? 'all' : String(attrs.jotxFilterCol)
    const s = (attrs.jotxSort || '').toString()
    setFilterText(f)
    setFilterCol(fc)
    if (s) {
      const m = /^(\d+):(asc|desc)$/i.exec(s.trim())
      if (m) {
        setSortCol(m[1])
        setSortDir(m[2].toLowerCase() as any)
      }
    }
  }

  const setTableAttrs = (next: { jotxFilter?: string | null; jotxFilterCol?: string | number | null; jotxSort?: string | null }) => {
    const info = getActiveTableInfo()
    if (!info) return
    editor.commands.command(({ tr }) => {
      tr.setNodeMarkup(info.pos, undefined, {
        ...(info.node.attrs || {}),
        ...next
      })
      return true
    })
  }

  const applyFilter = (nextFilterText: string, nextFilterCol: string) => {
    if (filterDebounceRef.current) window.clearTimeout(filterDebounceRef.current)
    filterDebounceRef.current = window.setTimeout(() => {
      setTableAttrs({
        jotxFilter: nextFilterText.trim() ? nextFilterText : null,
        jotxFilterCol: nextFilterText.trim() ? (nextFilterCol === 'all' ? null : nextFilterCol) : null
      })
    }, 120)
  }

  const sortRowsInTable = () => {
    const info = getActiveTableInfo()
    if (!info?.node) return
    const colIndex = Math.max(0, Math.min((headers.length || 1) - 1, Number(sortCol || 0)))
    const dir = sortDir

    const tableNode = info.node
    if (tableNode.childCount <= 1) return

    const headerRow = tableNode.child(0)
    const bodyRows: any[] = []
    for (let i = 1; i < tableNode.childCount; i++) bodyRows.push(tableNode.child(i))

    const getRowKey = (rowNode: any) => {
      const cell = rowNode.childCount > colIndex ? rowNode.child(colIndex) : null
      const text = (cell?.textContent || '').toString().trim().toLowerCase()
      return text
    }

    const sorted = bodyRows
      .map((r, idx) => ({ r, idx, key: getRowKey(r) }))
      .sort((a, b) => {
        if (a.key === b.key) return a.idx - b.idx
        if (a.key < b.key) return dir === 'asc' ? -1 : 1
        return dir === 'asc' ? 1 : -1
      })
      .map((x) => x.r)

    const newContent = [headerRow, ...sorted]
    const newTable = tableNode.type.create(tableNode.attrs, newContent, tableNode.marks)

    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.replaceWith(info.pos, info.pos + tableNode.nodeSize, newTable)
        tr.setNodeMarkup(info.pos, undefined, { ...(newTable.attrs || {}), jotxSort: `${colIndex}:${dir}` })
        return true
      })
      .run()
  }

  useEffect(() => {
    const update = () => {
      if (!editor?.isActive('table')) {
        setHandlePos((p) => (p.visible ? { ...p, visible: false } : p))
        setOpen(false)
        return
      }
      try {
        const { from } = editor.state.selection
        const domAt = editor.view.domAtPos(from).node as any
        const el: HTMLElement | null =
          domAt?.nodeType === 1 ? (domAt as HTMLElement) : (domAt?.parentElement as HTMLElement | null)
        const table = el?.closest?.('table') as HTMLTableElement | null
        if (!table) {
          setHandlePos((p) => (p.visible ? { ...p, visible: false } : p))
          setOpen(false)
          return
        }
        const rect = table.getBoundingClientRect()
        const x = Math.max(10, Math.min(window.innerWidth - 44, rect.left + 8))
        const y = Math.max(10, Math.min(window.innerHeight - 44, rect.top + 8))
        setHandlePos({ visible: true, x, y })
        if (!open) syncStateFromNodeAttrs()
      } catch {
        setHandlePos((p) => (p.visible ? { ...p, visible: false } : p))
        setOpen(false)
      }
    }

    update()
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  if (!handlePos.visible) return null

  return (
    <>
      {/* Small handle anchored to the table */}
      <button
        className="jotx-table-handle jotx-table-toolbar-floating"
        style={{ left: `${handlePos.x}px`, top: `${handlePos.y}px` }}
        title="Table sort & filter"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setOpen((v) => {
            const next = !v
            if (next) syncStateFromNodeAttrs()
            return next
          })
        }}
      >
        <SlidersHorizontal size={16} />
      </button>

      {open && (
        <div
          className="jotx-table-toolbar jotx-table-toolbar-floating"
          style={{ left: `${Math.min(window.innerWidth - 400, handlePos.x + 42)}px`, top: `${handlePos.y}px` }}
          role="toolbar"
          aria-label="Table sort & filter"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Filter */}
          <div className="jotx-table-toolbar-group" aria-label="Filter">
            <span className="jotx-table-toolbar-label">
              <Filter size={14} /> Filter
            </span>
            <input
              className="jotx-table-filter-input"
              value={filterText}
              placeholder="Type to filter…"
              onChange={(e) => {
                const v = e.target.value
                setFilterText(v)
                applyFilter(v, filterCol)
              }}
            />
            <select
              className="jotx-table-filter-select"
              value={filterCol}
              onChange={(e) => {
                const v = e.target.value
                setFilterCol(v)
                applyFilter(filterText, v)
              }}
              title="Filter column"
            >
              <option value="all">All</option>
              {headers.map((h, i) => (
                <option key={i} value={String(i)}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="jotx-table-toolbar-group" aria-label="Sort">
            <span className="jotx-table-toolbar-label">Sort</span>
            <select
              className="jotx-table-filter-select"
              value={sortCol}
              onChange={(e) => setSortCol(e.target.value)}
              title="Sort column"
            >
              {headers.map((h, i) => (
                <option key={i} value={String(i)}>
                  {h}
                </option>
              ))}
              {headers.length === 0 && <option value="0">Column 1</option>}
            </select>
            <button
              className="jotx-table-toolbar-btn"
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            >
              {sortDir === 'asc' ? <ArrowUpNarrowWide size={16} /> : <ArrowDownWideNarrow size={16} />}
            </button>
            <button
              className="jotx-table-toolbar-btn"
              title="Apply sort (reorders rows)"
              onMouseDown={(e) => e.preventDefault()}
              onClick={sortRowsInTable}
            >
              <Check size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
