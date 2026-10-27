/**
 * jotx Serializer - Converts AST back to text
 *
 * Two output styles, both read by the parser:
 *   classic  - every block has an id, every property on its own line, values quoted
 *   compact  - the token-lean form: primary value inline, ids only where links and the
 *              knowledge graph use them, defaults omitted, one-line list items and table rows
 */

import { registry } from '@jotx-labs/registry';
import { AST, BlockNode, DocumentNode } from '../types/ast'

export type SyntaxStyle = 'classic' | 'compact'

export interface SerializeOptions {
  style?: SyntaxStyle
}

/** Blocks that keep their id in compact syntax: link targets and knowledge-graph nodes. */
export const COMPACT_ID_TYPES = new Set(['table', 'mermaid', 'chart', 'math', 'jotxlink', 'link', 'button', 'card'])

/** Values that compact syntax leaves out because the reader assumes them. */
export const COMPACT_DEFAULTS: Record<string, Record<string, string>> = {
  heading: { level: '1' },
  list: { listtype: 'bulleted' },
  taskitem: { checked: 'false' },
  callout: { variant: 'info' },
  chart: { charttype: 'bar', showsource: 'false' },
  mermaid: { showsource: 'false' },
  math: { showsource: 'false' }
}

// Fallback: identifier-like properties that should never be quoted when the registry is unavailable
const KNOWN_IDENTIFIERS = ['refid', 'reftype', 'variant', 'charttype', 'level'];

export class Serializer {
  private style: SyntaxStyle = 'classic'
  private keepIds = new Set<string>()

  /**
   * Serialize AST to jotx text
   */
  serialize(ast: AST, options: SerializeOptions = {}): string {
    this.style = options.style || 'classic'
    this.keepIds = this.style === 'compact' ? this.referencedIds(ast.document.blocks) : new Set()
    const lines: string[] = []

    // Serialize document header
    lines.push(this.serializeDocumentHeader(ast.document))
    lines.push('')

    // Serialize metadata
    const metadataLines = this.serializeMetadata(ast.document)
    if (metadataLines.length > 0) {
      lines.push(...metadataLines)
      lines.push('')
    }

    // Serialize blocks
    for (const block of ast.document.blocks) {
      lines.push(...this.serializeBlock(block, 1))
      lines.push('')
    }

    return lines.join('\n').trim() + '\n'
  }

  /**
   * Serialize document header: hdef <type> <id>
   */
  private serializeDocumentHeader(doc: DocumentNode): string {
    return `hdef ${doc.type} ${doc.id}`
  }

  /**
   * Serialize document metadata
   */
  private serializeMetadata(doc: DocumentNode): string[] {
    const lines: string[] = []
    const metadata = doc.metadata

    // Serialize each metadata field
    for (const [key, value] of Object.entries(metadata)) {
      if (value === undefined || value === null) continue

      if (key === 'type') {
        // Force unquoted for known enum types in header
        lines.push(`  ${key} ${value}`)
      } else if (Array.isArray(value)) {
        // Arrays: tags "tag1", "tag2"
        const items = value.map(v => `"${v}"`).join(', ')
        lines.push(`  ${key} ${items}`)
      } else if (typeof value === 'string') {
        // Strings: key "value"
        lines.push(`  ${key} ${this.stringValue(value)}`)
      } else if (typeof value === 'number') {
        // Numbers: key 123
        lines.push(`  ${key} ${value}`)
      } else {
        // Other: convert to string
        lines.push(`  ${key} "${String(value)}"`)
      }
    }

    return lines
  }

  /**
   * Convert camelCase to flatcase
   */
  private toFlatcase(str: string): string {
    return str.replace(/[A-Z]/g, letter => letter.toLowerCase());
  }

  /** Ids that jotx links or block references in this document point at. */
  private referencedIds(blocks: BlockNode[]): Set<string> {
    const ids = new Set<string>()
    const walk = (bs: BlockNode[]) => {
      for (const b of bs) {
        for (const key of ['refid', 'refId', 'ref']) {
          const v = b.properties?.[key]
          if (typeof v === 'string' && v) ids.add(v.includes('#') ? v.split('#').pop()! : v)
        }
        if (b.children) walk(b.children)
      }
    }
    walk(blocks)
    return ids
  }

  /** Compact syntax writes plain single-line strings without quotes when the reader can't misread them. */
  private canBeBare(value: string): boolean {
    return this.style === 'compact' &&
      value.length > 0 &&
      value.trim() === value &&
      !/["\n]/.test(value) &&
      !/\s#/.test(value) &&
      !/^[#\[\-|>]/.test(value) &&
      !/^-?\d+(\.\d+)?$/.test(value) &&
      !/^(true|false)$/.test(value)
  }

  private stringValue(value: string): string {
    return this.canBeBare(value) ? value : `"${value}"`
  }

  private multiline(value: string): string {
    let delimiter = '"""';
    // Find longest sequence of quotes so the content can't close the string early
    const quoteMatches = value.match(/"{3,}/g);
    if (quoteMatches) {
      const maxLength = Math.max(...quoteMatches.map(m => m.length));
      delimiter = '"'.repeat(maxLength + 1);
    }
    return `${delimiter}${value}${delimiter}`
  }

  private propertyLine(def: ReturnType<typeof registry.get>, key: string, value: any): string {
    // Convert to flatcase (camelCase -> flatcase)
    const outKey = this.toFlatcase(key);

    let isUnquoted = false;
    if (def && def.schema.properties[key]) {
      const propType = def.schema.properties[key].type;
      // Enum and identifier types should be unquoted
      isUnquoted = propType === 'enum' || propType === 'identifier';
    } else if (KNOWN_IDENTIFIERS.includes(key.toLowerCase())) {
      isUnquoted = true;
    }

    if (typeof value === 'string' && !isUnquoted) {
      return value.includes('\n') ? `${outKey} ${this.multiline(value)}` : `${outKey} ${this.stringValue(value)}`
    }
    // Numbers, booleans, enum values and identifiers stay unquoted
    return `${outKey} ${value}`
  }

  /** Compact list/checklist body: one item per line when no item has nested content. */
  private compactItems(block: BlockNode): string | null {
    if (block.type !== 'list' && block.type !== 'checklist') return null
    const items = block.children || []
    if (!items.length) return null
    // Only plain items fit on one line: the expected item type, no nested blocks, no extra fields
    const itemType = block.type === 'checklist' ? 'taskitem' : 'listitem'
    const allowed = block.type === 'checklist' ? ['text', 'checked'] : ['text']
    const simple = items.every(c =>
      c.type === itemType &&
      !(c.children || []).length &&
      !String(c.properties.text ?? '').includes('\n') &&
      Object.keys(c.properties).every(k => allowed.includes(k)))
    if (!simple) return null
    return items.map(c => {
      const text = String(c.properties.text ?? '')
      return block.type === 'checklist' ? `${String(c.properties.checked) === 'true' ? '[x]' : '[ ]'} ${text}` : text
    }).join('\n')
  }

  /** Compact table body: one row per line when every cell is a single line of text. */
  private compactRows(block: BlockNode): string | null {
    if (block.type !== 'table') return null
    const rows = block.children || []
    if (!rows.length) return null
    const out: string[] = []
    for (const row of rows) {
      if (row.type !== 'row' || Object.keys(row.properties || {}).length) return null
      const cells: string[] = []
      for (const cell of row.children || []) {
        if (cell.type !== 'cell' || Object.keys(cell.properties || {}).length) return null
        const kids = cell.children || []
        if (kids.length > 1) return null
        const only = kids[0]
        if (only && (only.type !== 'paragraph' || (only.children || []).length)) return null
        const text = only ? String(only.properties.text ?? '') : ''
        if (text.includes('\n')) return null
        cells.push(text.replace(/\|/g, '\\|'))
      }
      out.push(cells.join(' | '))
    }
    return out.join('\n')
  }

  /** Compact chart data: "Label | Series" header plus one row per label, when the JSON is plain labels + datasets. */
  private compactChartData(json: unknown): string | null {
    try {
      const data = JSON.parse(String(json))
      const keys = Object.keys(data).sort().join(',')
      if (keys !== 'datasets,labels' || !Array.isArray(data.labels) || !Array.isArray(data.datasets)) return null
      if (!data.datasets.every((d: any) => Object.keys(d).every(k => k === 'label' || k === 'data') && Array.isArray(d.data))) return null
      const esc = (s: unknown) => String(s).replace(/\|/g, '\\|')
      const header = ['Label', ...data.datasets.map((d: any) => esc(d.label ?? ''))].join(' | ')
      const rows = data.labels.map((label: unknown, i: number) => [esc(label), ...data.datasets.map((d: any) => d.data[i] ?? 0)].join(' | '))
      return [header, ...rows].join('\n')
    } catch {
      return null
    }
  }

  /**
   * Serialize a block
   */
  private serializeBlock(block: BlockNode, indentLevel: number): string[] {
    const lines: string[] = []
    const indent = '  '.repeat(indentLevel)
    const propIndent = '  '.repeat(indentLevel + 1)
    const compact = this.style === 'compact'

    // Get block definition from registry
    const def = registry.get(block.type);

    // Use keyword from registry; if no definition found, use the type as-is (lowercased)
    const keyword = def?.syntax.keyword || block.type.toLowerCase();

    const properties: Record<string, any> = { ...block.properties }
    let head = `${indent}def ${keyword}`

    if (!compact) {
      // Block definition: def <keyword> <id>
      head += ` ${block.id}`
    } else {
      if (COMPACT_ID_TYPES.has(block.type) || this.keepIds.has(block.id)) head += ` ${block.id}`

      for (const [key, value] of Object.entries(COMPACT_DEFAULTS[block.type] || {})) {
        if (properties[key] !== undefined && String(properties[key]) === value) delete properties[key]
      }

      // Primary value inline: def heading "Goals"
      const primary = def?.syntax.primary
      if (primary && typeof properties[primary] === 'string' && properties[primary] !== '' && !properties[primary].includes('\n')) {
        head += ` "${properties[primary]}"`
        delete properties[primary]
      }

      if (block.type === 'chart' && properties.json !== undefined) {
        const data = this.compactChartData(properties.json)
        if (data) { delete properties.json; properties.data = data }
      }
    }
    lines.push(head)

    const items = compact ? this.compactItems(block) : null
    const rows = compact ? this.compactRows(block) : null
    if (items !== null) properties.items = items
    if (rows !== null) properties.rows = rows

    for (const [key, value] of Object.entries(properties)) {
      if (value === undefined || value === null) continue
      if (compact && value === '') continue
      // One-item-per-line bodies always use triple quotes, so they read as lists even with one item
      if (compact && (key === 'items' || key === 'rows' || key === 'data') && (items !== null || rows !== null || block.type === 'chart')) {
        lines.push(`${propIndent}${key} ${this.multiline(String(value))}`)
        continue
      }
      lines.push(propIndent + this.propertyLine(def, key, value))
    }

    // Serialize children (nested blocks, items, rows, etc), unless written compactly above
    if (items === null && rows === null && block.children && block.children.length > 0) {
      for (const child of block.children) {
        lines.push(...this.serializeBlock(child, indentLevel + 1))
      }
    }

    return lines
  }
}

/**
 * Guess which style a file was written in, so editors can save it the same way.
 * Compact files have a def line without an id, an inline quoted value, or compact bodies.
 */
export function detectSyntaxStyle(text: string): SyntaxStyle {
  let open: string | null = null // delimiter of the multi-line value we are inside, if any
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (open) {
      if (line.endsWith(open)) open = null
      continue
    }
    const start = line.match(/^[a-zA-Z_]+\s+("{3,})(.*)$/)
    if (start) {
      if (!start[2].endsWith(start[1])) open = start[1]
      continue
    }
    if (!line.startsWith('def ')) continue
    if (line.includes('"')) return 'compact'
    if (line.split(/\s+/).length < 3) return 'compact'
  }
  return 'classic'
}
