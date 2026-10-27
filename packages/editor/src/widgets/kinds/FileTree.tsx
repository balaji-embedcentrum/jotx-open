import React, { useState } from 'react'
import {
  FolderTree, Folder, FolderOpen, File, FileCode, FileText, FileJson,
  FileImage, FileCog, ChevronRight
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { WidgetSpec, WidgetViewProps } from '../types'
import '../../styles/widgets/filetree.css'

interface TreeNode {
  name: string
  note: string
  folder: boolean
  children: TreeNode[]
  path: string
}

/** Width of one indent level, inferred from the smallest indentation used. */
function indentUnit(raw: string[]): number {
  let unit = 0
  for (const l of raw) {
    const n = l.match(/^ */)![0].length
    if (n > 0 && (unit === 0 || n < unit)) unit = n
  }
  return unit || 2
}

function parseTree(text: string): TreeNode[] {
  const raw = (text || '')
    .split('\n')
    .map(l => l.replace(/\t/g, '    ').replace(/\s+$/, ''))
    .filter(l => l.trim())
  const unit = indentUnit(raw)
  const roots: TreeNode[] = []
  const stack: Array<{ depth: number; node: TreeNode }> = []

  for (const line of raw) {
    const depth = Math.round(line.match(/^ */)![0].length / unit)
    let body = line.trim().replace(/^[-*]\s+/, '').replace(/^[│├└─\s]+/, '')
    let note = ''
    // Notes need whitespace before "//" so names like "https://..." stay intact
    const nm = body.match(/\s+\/\/\s*(.*)$/)
    if (nm) {
      note = nm[1].trim()
      body = body.slice(0, nm.index).trim()
    }
    const folder = body.endsWith('/')
    const name = folder ? body.replace(/\/+$/, '') : body
    if (!name) continue

    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop()
    const parent = stack[stack.length - 1]?.node
    const node: TreeNode = { name, note, folder, children: [], path: parent ? `${parent.path}/${name}` : name }
    if (parent) {
      parent.folder = true
      parent.children.push(node)
    } else {
      roots.push(node)
    }
    stack.push({ depth, node })
  }
  return roots
}

const CODE_EXT = /\.(tsx?|jsx?|mjs|cjs|py|rs|go|java|kt|swift|c|cc|cpp|h|hpp|cs|rb|php|sh|zsh|vue|svelte|css|scss|html|sql|lua|dart)$/i
const IMG_EXT = /\.(png|jpe?g|gif|svg|webp|ico|bmp)$/i
const TEXT_EXT = /\.(md|mdx|txt|rst|jot|jotx|adoc)$/i
const CONFIG_NAMES = /^(\.[\w.-]+|.*\.(ya?ml|toml|ini|env|lock|config\.[jt]s)|Dockerfile|Makefile|LICENSE)$/i

function fileIcon(name: string): { icon: LucideIcon; tone: string } {
  if (/\.json$/i.test(name)) return { icon: FileJson, tone: 'amber' }
  if (CODE_EXT.test(name)) return { icon: FileCode, tone: 'blue' }
  if (IMG_EXT.test(name)) return { icon: FileImage, tone: 'pink' }
  if (TEXT_EXT.test(name)) return { icon: FileText, tone: 'slate' }
  if (CONFIG_NAMES.test(name)) return { icon: FileCog, tone: 'violet' }
  return { icon: File, tone: 'slate' }
}

function TreeRows({ nodes, depth, collapsed, toggle }: {
  nodes: TreeNode[]
  depth: number
  collapsed: Set<string>
  toggle: (path: string) => void
}) {
  return (
    <>
      {nodes.map(node => {
        const open = !collapsed.has(node.path)
        const { icon: Icon, tone } = node.folder
          ? { icon: open ? FolderOpen : Folder, tone: 'teal' }
          : fileIcon(node.name)
        const row = (
          <>
            {Array.from({ length: depth }, (_, i) => <span key={i} className="jx-ftree__guide" />)}
            <span className="jx-ftree__chevron">
              {node.folder && <ChevronRight size={13} className={open ? 'is-open' : ''} />}
            </span>
            <span className="jx-ftree__icon" data-tone={tone}><Icon size={15} /></span>
            <span className={`jx-ftree__name${node.folder ? ' is-folder' : ''}`}>{node.name}{node.folder ? '/' : ''}</span>
            {node.note && <span className="jx-ftree__note">{node.note}</span>}
          </>
        )
        return (
          <React.Fragment key={node.path}>
            {node.folder ? (
              <button
                type="button"
                className="jx-ftree__row"
                onClick={() => toggle(node.path)}
                aria-expanded={open}
                title={open ? 'Collapse folder' : 'Expand folder'}
              >
                {row}
              </button>
            ) : (
              <div className="jx-ftree__row">{row}</div>
            )}
            {node.folder && open && node.children.length > 0 && (
              <TreeRows nodes={node.children} depth={depth + 1} collapsed={collapsed} toggle={toggle} />
            )}
          </React.Fragment>
        )
      })}
    </>
  )
}

function FileTreeView({ attrs, editable, setEditing }: WidgetViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const nodes = parseTree(attrs.tree)

  const toggle = (path: string) => setCollapsed(prev => {
    const next = new Set(prev)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    return next
  })

  if (nodes.length === 0) {
    return (
      <div className="jx-empty">
        Empty tree.{editable && <> <button type="button" className="jx-btn jx-btn--ghost" onClick={() => setEditing(true)}>Add files</button></>}
      </div>
    )
  }

  return (
    <div className="jx-ftree" role="tree">
      <TreeRows nodes={nodes} depth={0} collapsed={collapsed} toggle={toggle} />
    </div>
  )
}

export const filetreeWidget: WidgetSpec = {
  name: 'filetree',
  label: 'File Tree',
  description: 'Project directory structure with notes',
  icon: FolderTree,
  keywords: ['filetree', 'tree', 'files', 'folders', 'directory', 'structure', 'project', 'layout'],
  category: 'developer',
  defaults: {
    title: 'my-app',
    tree: 'src/\n  components/\n    Button.tsx\n    Modal.tsx\n  lib/\n    api.ts  // fetch helpers\n  index.ts  // entry point\npublic/\n  logo.svg\npackage.json\nREADME.md'
  },
  fields: [
    { key: 'title', label: 'Root name', kind: 'text', placeholder: 'my-app' },
    { key: 'tree', label: 'Tree', kind: 'textarea', rows: 10, mono: true, help: 'Indent 2 spaces per level; folders end with "/"; add notes with "  // note"' }
  ],
  View: FileTreeView
}
