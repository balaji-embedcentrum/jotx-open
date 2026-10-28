/**
 * Markdown Converter - Bidirectional conversion between Jotx and Markdown
 * Supports extended Markdown (Obsidian-compatible) for better fidelity
 */

import { marked, Tokens } from 'marked'
import { AST, BlockNode, DocumentNode } from '../types/ast'
import { BlockType, DocumentType } from '../types/enums'
import { generateBlockId } from '../utils/idGenerator'

// ============================================================================
// JOTX → MARKDOWN (Export)
// ============================================================================

/**
 * Convert Jotx AST to Markdown string
 * Uses extended Markdown features (Obsidian-compatible) for better fidelity
 */
export function jotToMarkdown(ast: AST): string {
  const lines: string[] = []
  const doc = ast.document

  // Generate YAML frontmatter for metadata
  if (Object.keys(doc.metadata).length > 0) {
    lines.push('---')
    for (const [key, value] of Object.entries(doc.metadata)) {
      if (value === undefined || value === null) continue

      if (Array.isArray(value)) {
        lines.push(`${key}:`)
        value.forEach(v => lines.push(`  - ${v}`))
      } else {
        lines.push(`${key}: ${value}`)
      }
    }
    lines.push('---')
    lines.push('')
  }

  // Convert blocks
  for (const block of doc.blocks) {
    const blockMarkdown = blockToMarkdown(block, 0)
    if (blockMarkdown) {
      lines.push(blockMarkdown)
      lines.push('')
    }
  }

  return lines.join('\n').trim() + '\n'
}

/**
 * Convert a single Jotx block to Markdown
 */
function blockToMarkdown(block: BlockNode, nestLevel: number): string {
  const indent = '  '.repeat(nestLevel)
  const props = block.properties

  switch (block.type) {
    // ========== HEADINGS ==========
    case 'heading': {
      const level = props.level || 1
      const prefix = '#'.repeat(level)
      return `${prefix} ${props.text || ''}`
    }

    // ========== TEXT BLOCKS ==========
    case 'paragraph':
      return props.text || ''

    case 'quote':
      return `> ${props.text || ''}`

    // ========== LISTS ==========
    case 'list': {
      const lines: string[] = []
      const listType = props.listtype || 'bulleted'

      if (block.children) {
        block.children.forEach((item, idx) => {
          if (item.type === 'listitem') { // V3 uses flatcase internally
            const bullet = listType === 'numbered' ? `${idx + 1}.` : '-'
            lines.push(`${indent}${bullet} ${item.properties.text || ''}`)

            // Nested children
            if (item.children) {
              item.children.forEach(child => {
                const childMd = blockToMarkdown(child, nestLevel + 1)
                if (childMd) lines.push(childMd)
              })
            }
          }
        })
      }
      return lines.join('\n')
    }

    case 'checklist': {
      const lines: string[] = []

      if (block.children) {
        block.children.forEach(item => {
          if (item.type === 'taskitem') { // V3 uses flatcase internally
            const checked = item.properties.checked ? 'x' : ' '
            lines.push(`${indent}- [${checked}] ${item.properties.text || ''}`)
          }
        })
      }
      return lines.join('\n')
    }

    // ========== CODE & TECHNICAL ==========
    case 'code': {
      const language = props.language || ''
      const text = props.text || ''
      return `\`\`\`${language}\n${text}\n\`\`\``
    }

    case 'math': {
      const equation = props.src || ''
      const display = props.display !== false
      return display ? `$$\n${equation}\n$$` : `$${equation}$`
    }

    case 'mermaid': {
      const diagram = props.src || ''
      return `\`\`\`mermaid\n${diagram}\n\`\`\``
    }

    // ========== MEDIA ==========
    case 'image': {
      const src = props.relativePath || props.src || ''
      const alt = props.alt || props.title || ''
      const width = props.width ? ` {width=${props.width}}` : ''
      return `![${alt}](${src})${width}`
    }

    case 'floatimage': {
      // Flatten: image + children as separate blocks
      const lines: string[] = []
      const src = props.relativePath || props.src || ''
      const alt = props.alt || props.title || ''
      lines.push(`![${alt}](${src})`)

      if (block.children) {
        block.children.forEach(child => {
          const childMd = blockToMarkdown(child, nestLevel)
          if (childMd) lines.push(childMd)
        })
      }
      return lines.join('\n\n')
    }

    case 'video': {
      const src = props.src || ''
      const title = props.title || 'Video'
      const type = props.type || 'youtube'

      if (type === 'youtube') {
        // YouTube embed (HTML for better compatibility)
        return `[🎥 ${title}](${src})`
      } else {
        return `[🎥 ${title}](${src})`
      }
    }

    // ========== CONTAINERS ==========
    case 'callout': {
      // Obsidian-style callout: > [!type] Title
      const variant = props.variant || 'info'
      const text = props.text || ''
      const lines = text.split('\n')
      const result: string[] = []

      result.push(`> [!${variant}]`)
      lines.forEach((line: string) => result.push(`> ${line}`))

      return result.join('\n')
    }

    case 'tab': {
      // Markdown has no tabs: each tab becomes a heading with its content below
      const label = [props.icon, props.title || 'Tab'].filter(Boolean).join(' ')
      const lines = [`## ${label}`, '']
      for (const child of block.children || []) {
        const childMd = blockToMarkdown(child, nestLevel)
        if (childMd) lines.push(childMd, '')
      }
      return lines.join('\n').trim()
    }

    case 'toggle': {
      // HTML details tag (widely supported)
      const title = props.title || 'Toggle'
      const lines: string[] = []

      lines.push(`<details>`)
      lines.push(`<summary>${title}</summary>`)
      lines.push('')

      if (block.children) {
        block.children.forEach(child => {
          const childMd = blockToMarkdown(child, nestLevel)
          if (childMd) lines.push(childMd)
        })
      }

      lines.push('')
      lines.push(`</details>`)

      return lines.join('\n')
    }

    case 'section': {
      // Convert section to markdown heading + children
      const title = props.title || ''
      const lines: string[] = []

      if (title) {
        lines.push(`### ${title}`)
        lines.push('')
      }

      if (block.children) {
        block.children.forEach(child => {
          const childMd = blockToMarkdown(child, nestLevel)
          if (childMd) lines.push(childMd)
        })
      }

      return lines.join('\n')
    }

    // ========== DATA ==========
    case 'table': {
      const lines: string[] = []

      // Get headers from first row or properties
      let headers: string[] = []
      let dataRows: BlockNode[] = []

      if (block.children) {
        const rows = block.children.filter(c => c.type === 'row') // V3 AST

        if (rows.length > 0) {
          // First row as headers
          const headerRow = rows[0]
          if (headerRow.children) {
            headers = headerRow.children
              .filter(c => c.type === 'cell' || c.type === 'header')
              .map(c => c.properties.text || '')
          }
          dataRows = rows.slice(1)
        }
      }

      if (headers.length > 0) {
        // Header row
        lines.push('| ' + headers.join(' | ') + ' |')
        // Separator
        lines.push('| ' + headers.map(() => '---').join(' | ') + ' |')

        // Data rows
        dataRows.forEach(row => {
          if (row.children) {
            const cells = row.children
              .filter(c => c.type === 'cell')
              .map(c => c.properties.text || '')
            lines.push('| ' + cells.join(' | ') + ' |')
          }
        })
      }

      return lines.join('\n')
    }

    case 'datetime': {
      const timestamp = props.timestamp || ''
      const format = props.format || 'datetime'

      if (timestamp) {
        const date = new Date(timestamp)
        if (format === 'date') {
          return date.toLocaleDateString()
        } else if (format === 'time') {
          return date.toLocaleTimeString()
        } else {
          return date.toLocaleString()
        }
      }
      return ''
    }

    // ========== MISC ==========
    case 'divider':
      return '---'

    case 'link': {
      const url = props.url || ''
      const text = props.text || url
      return `[${text}](${url})`
    }

    case 'linkcard': {
      const url = props.url || ''
      const title = props.title || ''
      const description = props.description || ''

      const lines: string[] = []
      lines.push(`[**${title}**](${url})`)
      if (description) {
        lines.push(`> ${description}`)
      }
      return lines.join('\n')
    }

    case 'attach': {
      const path = props.path || ''
      const name = props.name || 'Attachment'
      return `[📎 ${name}](${path})`
    }

    case 'chart':
      // Not supported in standard Markdown
      return `> [!note] Chart: ${props.title || 'Untitled'}\n> (Chart data not exported to Markdown)`

    default:
      return ''
  }
}

// ============================================================================
// MARKDOWN → JOTX (Import)
// ============================================================================

/**
 * Convert Markdown string to Jotx AST
 */
export async function markdownToJot(markdown: string, documentId?: string): Promise<AST> {
  const blocks: BlockNode[] = []
  const metadata: any = {}

  // Extract YAML frontmatter
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n/)
  let contentMarkdown = markdown

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1]
    contentMarkdown = markdown.slice(frontmatterMatch[0].length)

    // Parse frontmatter (simple key: value parsing)
    frontmatter.split('\n').forEach(line => {
      const match = line.match(/^(\w+):\s*(.*)$/)
      if (match) {
        const [, key, value] = match
        metadata[key] = value
      }
    })
  }

  // Parse Markdown to tokens
  const tokens = marked.lexer(contentMarkdown)

  // Convert tokens to Jotx blocks
  for (const token of tokens) {
    const block = await tokenToBlock(token)
    if (block) {
      blocks.push(block)
    }
  }

  // Create document
  const document: DocumentNode = {
    type: 'jotx' as DocumentType,
    id: documentId || 'imported_doc',
    metadata: metadata,
    blocks: blocks
  }

  return {
    document,
    errors: []
  }
}

/**
 * Convert a Marked token to Jotx block
 */
async function tokenToBlock(token: Tokens.Generic): Promise<BlockNode | null> {
  const id = generateBlockId()

  switch (token.type) {
    case 'heading': {
      const level = Math.min(token.depth, 6)
      return {
        type: 'heading',
        id,
        properties: {
          level: level,
          text: token.text
        }
      }
    }

    case 'paragraph': {
      return {
        type: 'paragraph',
        id,
        properties: {
          text: token.text
        }
      }
    }

    case 'blockquote': {
      const text = token.text

      // Check for Obsidian-style callout: > [!type]
      const calloutMatch = text.match(/^\[!(\w+)\]\s*([\s\S]*)/)
      if (calloutMatch) {
        const [, variant, content] = calloutMatch
        return {
          type: 'callout',
          id,
          properties: {
            variant: variant.toLowerCase(),
            text: content.trim()
          }
        }
      }

      return {
        type: 'quote',
        id,
        properties: {
          text: text
        }
      }
    }

    case 'code': {
      const language = token.lang || ''
      const text = token.text

      // Special case: mermaid diagrams
      if (language === 'mermaid') {
        return {
          type: 'mermaid',
          id,
          properties: {
            src: text
          }
        }
      }

      return {
        type: 'code',
        id,
        properties: {
          language,
          text
        }
      }
    }

    case 'list': {
      const listToken = token as any
      const isChecklist = listToken.items?.some((item: any) =>
        typeof item.checked === 'boolean'
      )

      if (isChecklist) {
        // Checklist
        const items: BlockNode[] = listToken.items.map((item: any) => ({
          type: 'taskitem',
          id: generateBlockId(),
          properties: {
            text: item.text,
            checked: item.checked || false
          }
        }))

        return {
          type: 'checklist',
          id,
          properties: {},
          children: items
        }
      } else {
        // Regular list
        const items: BlockNode[] = listToken.items.map((item: any) => ({
          type: 'listitem',
          id: generateBlockId(),
          properties: {
            text: item.text
          }
        }))

        return {
          type: 'list',
          id,
          properties: {
            listtype: listToken.ordered ? 'numbered' : 'bulleted'
          },
          children: items
        }
      }
    }

    case 'table': {
      const tableToken = token as any
      const rows: BlockNode[] = []

      // Header row
      const headerCells: BlockNode[] = tableToken.header.map((cell: any) => ({
        type: 'header',
        id: generateBlockId(),
        properties: {
          text: cell.text
        }
      }))

      rows.push({
        type: 'row',
        id: generateBlockId(),
        properties: {},
        children: headerCells
      })

      // Data rows
      tableToken.rows.forEach((row: any) => {
        const cells: BlockNode[] = row.map((cell: any) => ({
          type: 'cell',
          id: generateBlockId(),
          properties: {
            text: cell.text
          }
        }))

        rows.push({
          type: 'row',
          id: generateBlockId(),
          properties: {},
          children: cells
        })
      })

      return {
        type: 'table',
        id,
        properties: {},
        children: rows
      }
    }

    case 'hr': {
      return {
        type: 'divider',
        id,
        properties: {}
      }
    }

    case 'html': {
      const html = token.text

      // Check for <details> tag (toggle)
      const detailsMatch = html.match(/<details>([\s\S]*?)<\/details>/)
      if (detailsMatch) {
        const summaryMatch = detailsMatch[1].match(/<summary>(.*?)<\/summary>/)
        const title = summaryMatch ? summaryMatch[1] : 'Toggle'

        return {
          type: 'toggle',
          id,
          properties: {
            title
          },
          children: []
        }
      }

      return null
    }

    default:
      return null
  }
}

