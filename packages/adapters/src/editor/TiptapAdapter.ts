/**
 * jotx 2.0 TiptapAdapter - Bridge between @jotx-labs/core and Tiptap editor
 * 
 * Converts:
 * - Core BlockNode (jotx 2.0 format) ↔ Tiptap JSON
 * 
 * All text content uses properties.text (consistent with jotx 2.0 syntax)
 */

import { BlockNode, generateBlockId, isWidgetBlockType } from '@jotx-labs/core'

export interface TiptapNode {
  type: string
  attrs?: Record<string, any>
  content?: TiptapNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, any> }>
}

export interface TiptapDocument {
  type: 'doc'
  content: TiptapNode[]
}

/**
 * jotx 2.0 TiptapAdapter - Updated for consistent property-based syntax
 */
/** .jot files hold true/false as booleans (from the parser) or as text (older files). */
const isTrue = (value: unknown) => value === true || value === 'true'

export class TiptapAdapter {

  /**
   * Parse Markdown-style formatting in text and convert to Tiptap content with marks
   * Handles: **bold**, *italic*, ~~strike~~, `code`, [link](url), ==highlight==
   */
  private parseFormattedText(text: string): TiptapNode[] {
    if (!text) return []

    const nodes: TiptapNode[] = []
    let pos = 0

    // Regex patterns for inline formatting (order matters!)
    // Using .+? (non-greedy) instead of [^x]+ to allow nested formatting
    const patterns = [
      { type: 'code', regex: /`([^`]+)`/g, marks: ['code'] },
      { type: 'jotxlink', regex: /\[\[([^\]]+)\]\]/g, marks: [] }, // [[target]] -> jotxlink node
      { type: 'link', regex: /\[([^\]]+)\]\(([^)]+)\)/g, marks: [] }, // Special handling
      { type: 'bold', regex: /\*\*(.+?)\*\*/g, marks: ['bold'] },  // Changed [^*]+ to .+?
      { type: 'italic', regex: /\*(.+?)\*/g, marks: ['italic'] },   // Changed [^*]+ to .+?
      { type: 'strike', regex: /~~(.+?)~~/g, marks: ['strike'] },   // Changed [^~]+ to .+?
      { type: 'highlight', regex: /==(.+?)==/g, marks: ['highlight'] }, // Changed [^=]+ to .+?
      { type: 'textStyle', regex: /<span style="color:([^"]+)">(.+?)<\/span>/g, marks: [] }
    ]

    // Find all matches
    interface Match {
      start: number
      end: number
      text: string
      marks: Array<{ type: string; attrs?: Record<string, any> }>
    }

    const matches: Match[] = []

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex.source, 'g')
      let match

      while ((match = regex.exec(text)) !== null) {
        if (pattern.type === 'link') {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[1], // Link text
            marks: [{ type: 'link', attrs: { href: match[2] } }]
          })
        } else if (pattern.type === 'jotxlink') {
          // [[target|text]] or [[target]]
          const content = match[1]
          const parts = content.split('|')
          const target = parts[0]
          const text = parts[1] || target

          // We represent inline wikilink as a 'jotxlink' NODE, not a mark.
          // Note: This requires the schema to allow 'jotxlink' inline.
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: text,
            marks: [], // No marks, it's a node (handled later? No, this array is matches with marks)
            // Wait, parseFormattedText returns TiptapNode[].
            // I need to intercept this in the loop below.
            // I'll attach a special 'nodeType' property to the match object if possible?
            // The Match interface doesn't support it.
            // I'll update Match interface? No, I'll use 'marks' to signal it.
            // Actually, I can add a custom type to marks: { type: 'jotxlink', attrs: { target } }
            // But 'jotxlink' is a node type, not mark type.
            // If I use a mark, I have to ensure Tiptap has a mark for it.
            // User wants 'jotxlink' block.
            // If it's inline, it must be inline node.
            // I'll cheat: Use a special mark 'jotxlink_mark' and convert it to node in the loop?
            // Or better: Modify Match interface.
          })
          // Wait, I can't modify Match interface easily it's inside the method.
          // Let's look at the existing code again relative to where I am inserting.
          // I will use a dummy mark { type: 'INTERNAL_JOTXLINK', attrs: { target } }
          // and then in the loop convert it to a node.
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: text,
            marks: [{ type: 'INTERNAL_JOTXLINK', attrs: { target } }]
          })
        } else if (pattern.type === 'textStyle') {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[2], // Content
            marks: [{ type: 'textStyle', attrs: { color: match[1] } }]
          })
        } else {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[1], // Content inside marks
            marks: pattern.marks.map(type => ({ type }))
          })
        }
      }
    }

    // Sort matches by start position, then by length (longer first for preference)
    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start
      return (b.end - b.start) - (a.end - a.start) // Prefer longer matches
    })

    // Remove overlapping matches (keep first/longer match)
    const filteredMatches: Match[] = []
    for (const match of matches) {
      const overlaps = filteredMatches.some(existing =>
        (match.start >= existing.start && match.start < existing.end) ||
        (match.end > existing.start && match.end <= existing.end) ||
        (match.start <= existing.start && match.end >= existing.end)
      )
      if (!overlaps) {
        filteredMatches.push(match)
      }
    }

    // Sort filtered matches by start position
    filteredMatches.sort((a, b) => a.start - b.start)

    // Build content nodes
    let lastPos = 0

    for (const match of filteredMatches) {
      // Add plain text before this match
      if (match.start > lastPos) {
        const plainText = text.substring(lastPos, match.start)
        if (plainText) {
          nodes.push({ type: 'text', text: plainText })
        }
      }

      // Check for internal jotxlink mark
      const jotxLinkMark = match.marks.find(m => m.type === 'INTERNAL_JOTXLINK')

      if (jotxLinkMark) {
        nodes.push({
          type: 'jotxlink',
          attrs: {
            target: jotxLinkMark.attrs?.target,
            text: match.text
          }
        })
      } else {
        // Add formatted text
        nodes.push({
          type: 'text',
          text: match.text,
          marks: match.marks
        })
      }

      lastPos = match.end
    }

    // Add remaining plain text
    if (lastPos < text.length) {
      const plainText = text.substring(lastPos)
      if (plainText) {
        nodes.push({ type: 'text', text: plainText })
      }
    }

    // If no matches found, return plain text
    if (nodes.length === 0 && text) {
      nodes.push({ type: 'text', text })
    }

    return nodes
  }

  /**
   * Convert a single BlockNode to Tiptap node
   * Reads from properties.text (jotx 2.0 format) and parses Markdown-style formatting
   */
  blockToTiptap(block: BlockNode): TiptapNode {
    const text = (block.properties?.text as string) || ''

    // Widgets: properties map 1:1 to node attributes (all values kept as strings)
    if (isWidgetBlockType(block.type)) {
      const attrs: Record<string, any> = { blockId: block.id }
      for (const [key, value] of Object.entries(block.properties || {})) {
        if (value !== undefined && value !== null) attrs[key] = String(value)
      }
      return { type: block.type, attrs }
    }

    switch (block.type) {
      // ========== TEXT BLOCKS ==========
      case 'heading':
        const level = block.properties?.level ? parseInt(String(block.properties.level)) : 1;
        return {
          type: 'heading',
          attrs: { level, blockId: block.id },
          content: this.parseFormattedText(text)
        }

      case 'list':
        const listType = block.properties?.listtype === 'numbered' || block.properties?.type === 'numbered' ? 'orderedList' : 'bulletList'
        return {
          type: listType,
          attrs: { blockId: block.id },
          content: this.blocksToTiptap(block.children || [])
        }

      case 'listitem':
        return {
          type: 'listItem',
          attrs: { blockId: block.id },
          content: [{
            type: 'paragraph',
            content: this.parseFormattedText(text)
          }, ...this.blocksToTiptap(block.children || [])]
        }

      case 'checklist':
        return {
          type: 'taskList',
          attrs: { blockId: block.id },
          // Items may be written as taskitem or listitem; both are tasks here
          content: (block.children || []).map(child =>
            this.blockToTiptap(child.type === 'listitem' ? { ...child, type: 'taskitem' as any } : child))
        }

      case 'taskitem':
        return {
          type: 'taskItem',
          attrs: {
            checked: isTrue(block.properties?.checked),
            priority: (block.properties?.priority as string) || null,
            blockId: block.id
          },
          content: [{
            type: 'paragraph',
            content: this.parseFormattedText(text)
          }, ...this.blocksToTiptap(block.children || [])]
        }

      case 'paragraph':
        return {
          type: 'paragraph',
          attrs: { blockId: block.id },
          content: this.parseFormattedText(text)
        }

      case 'quote':
        return {
          type: 'blockquote',
          attrs: { blockId: block.id },
          content: [{
            type: 'paragraph',
            content: this.parseFormattedText(text)
          }]
        }

      // ========== CODE & MEDIA BLOCKS ==========
      case 'code':
        return {
          type: 'codeBlock',
          attrs: {
            language: block.properties?.language || 'plaintext',
            blockId: block.id
          },
          content: [{ type: 'text', text }]
        }

      case 'codereference':
        return {
          type: 'codeReference',
          attrs: {
            path: block.properties?.path || '',
            lines: block.properties?.lines || '',
            language: block.properties?.language || 'typescript',
            blockId: block.id
          },
          content: text ? [{ type: 'text', text }] : []
        }

      case 'math':
        return {
          type: 'math',
          attrs: {
            title: (block.properties?.title as string) || '',
            src: (block.properties?.src as string) || '',
            display: block.properties?.display || 'block',
            blockId: block.id
          }
        }

      case 'mermaid':
        return {
          type: 'mermaid',
          attrs: {
            title: (block.properties?.title as string) || '',
            src: (block.properties?.src as string) || '',
            showSource: isTrue(block.properties?.showsource),
            blockId: block.id
          }
        }

      case 'chart':
        return {
          type: 'chart',
          attrs: {
            title: (block.properties?.title as string) || '',
            chartType: (block.properties?.charttype as string) || 'bar',
            json: (block.properties?.json as string) || '',
            showSource: isTrue(block.properties?.showsource),
            blockId: block.id
          }
        }

      case 'datetime':
        return {
          type: 'datetime',
          attrs: {
            value: block.properties?.value || '',
            mode: block.properties?.mode || 'datetime',
            blockId: block.id
          }
        }

      case 'floatimage':
        return {
          type: 'floatImageBlock',
          attrs: {
            src: block.properties?.src || '',
            alt: block.properties?.alt || '',
            width: block.properties?.width ? parseInt(block.properties.width as string) : 400,
            height: block.properties?.height || 'auto',
            float: block.properties?.float || 'left',
            caption: block.properties?.caption || '',
            title: block.properties?.title || '',
            description: block.properties?.description || '',
            image: block.properties?.image || '',
            siteName: block.properties?.sitename || '',
            blockId: block.id
          },
          content: this.blocksToTiptap(block.children || [])
        }

      case 'jotxlink':
        return {
          type: 'jotxlink',
          attrs: {
            refType: block.properties?.reftype || '',
            refId: block.properties?.refid || '',
            blockId: block.id
          }
        }

      case 'blockref':
        return {
          type: 'blockref',
          attrs: {
            ref: block.properties?.ref || '',
            blockId: block.id
          }
        }

      // ========== MISSING BLOCKS (Added for Roundtrip Fix) ==========
      case 'video':
        const srcOrUrl = (block.properties?.src as string) || (block.properties?.url as string) || ''
        return {
          type: 'videoBlock',
          attrs: {
            src: srcOrUrl,
            url: srcOrUrl,
            title: block.properties?.title || '',
            type: block.properties?.type || 'youtube',
            width: block.properties?.width || 800,
            height: block.properties?.height || 450,
            // Controls are on unless the file turns them off
            controls: block.properties?.controls === undefined || isTrue(block.properties.controls) ? 'true' : 'false',
            autoplay: isTrue(block.properties?.autoplay) ? 'true' : 'false',
            muted: isTrue(block.properties?.muted) ? 'true' : 'false',
            loop: isTrue(block.properties?.loop) ? 'true' : 'false',
            blockId: block.id
          }
        }

      case 'link':
        return {
          type: 'linkBlock',
          attrs: {
            href: (block.properties?.url as string) || (block.properties?.href as string) || '',
            blockId: block.id
          },
          content: [{ type: 'text', text: (block.properties?.text as string) || '' }]
        }

      case 'divider':
        return {
          type: 'horizontalRule',
          attrs: { blockId: block.id }
        }

      case 'attach':
        return {
          type: 'attach',
          attrs: {
            path: block.properties?.path || '',
            text: (block.properties?.text as string) || (block.properties?.name as string) || '',
            blockId: block.id
          },
          content: this.blocksToTiptap(block.children || [])
        }


      case 'image':
        return {
          type: 'imageBlock',
          attrs: {
            src: block.properties?.src || '',
            alt: block.properties?.alt || '',
            caption: block.properties?.caption || '',
            width: block.properties?.width ? parseInt(block.properties.width as string) : 800,
            align: block.properties?.align || 'center',
            blockId: block.id
          }
        }

      // ========== PROPERTIES TABLE (2-column key-value table) ==========
      // ========== CONTAINER BLOCKS (Added for Roundtrip Fix) ==========
      case 'toggle':
        return {
          type: 'toggle',
          attrs: {
            title: block.properties?.title || 'Toggle',
            // A toggle is closed unless the file says otherwise
            collapsed: block.properties?.collapsed === undefined ? true : isTrue(block.properties.collapsed),
            blockId: block.id
          },
          content: this.blocksToTiptap(block.children || [])
        }

      case 'section':
        return {
          type: 'section',
          attrs: {
            title: block.properties?.title || 'Section',
            collapsed: isTrue(block.properties?.collapsed),
            blockId: block.id
          },
          content: this.blocksToTiptap(block.children || [])
        }

      case 'callout':
        // Callout in AST has 'text' property, but Tiptap node expects content children (paragraph)
        // Use parseFormattedText to render markdown formatting (**bold**, *italic*, etc.)
        const calloutText = block.properties?.text || ''
        return {
          type: 'callout',
          attrs: {
            variant: block.properties?.variant || 'info',
            blockId: block.id
          },
          content: [{
            type: 'paragraph',
            content: calloutText ? this.parseFormattedText(calloutText) : []
          }]
        }

      // ========== TABLE (complex nested structure) ==========
      case 'table': {
        const columnNames = String(block.properties?.columns || '')
          .split(',')
          .map((c: string) => c.trim())
          .filter(Boolean)

        // Header row from `columns`: names exactly as written, so saving never changes them
        const headerRow = columnNames.length ? [{
          type: 'tableRow',
          content: columnNames.map((name: string) => ({
            type: 'tableHeader',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: name, marks: [{ type: 'bold' }] }] }]
          }))
        }] : []

        const dataRows = (block.children || []).filter(row => row.type === 'row').map(row => ({
          type: 'tableRow',
          attrs: { blockId: row.id },
          content: (row.children || []).map(cell => {
            // A cell holds blocks, or (classic syntax) a text property
            const blocks = this.blocksToTiptap(cell.children || [])
            const text = cell.properties?.text as string | undefined
            const content = blocks.length ? blocks : [{ type: 'paragraph', content: text ? this.parseFormattedText(String(text)) : [] }]
            const attrs: Record<string, any> = { blockId: cell.id }
            if (Number(cell.properties?.colspan) > 1) attrs.colspan = Number(cell.properties!.colspan)
            if (Number(cell.properties?.rowspan) > 1) attrs.rowspan = Number(cell.properties!.rowspan)
            return { type: (cell.type as string) === 'header' ? 'tableHeader' : 'tableCell', attrs, content }
          })
        })).filter(row => row.content.length > 0)

        const rows = [...headerRow, ...dataRows]
        return {
          type: 'table',
          attrs: { blockId: block.id, title: (block.properties?.title as string) || null },
          // A table needs at least one cell to edit
          content: rows.length ? rows : [{ type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [] }] }] }]
        }
      }

      // ========== NAVIGATION BLOCKS ==========
      case 'gridcard':
        return {
          type: 'gridcard',
          attrs: {
            layout: block.properties?.layout || '2x2',
            blockId: block.id
          },
          content: this.blocksToTiptap(block.children || [])
        }

      case 'buttonstrip':
        return {
          type: 'buttonstrip',
          attrs: {
            blockId: block.id
          },
          content: this.blocksToTiptap(block.children || [])
        }

      // ========== LAYOUT BLOCKS ==========
      case 'columns': {
        const columns = (block.children || []).filter(child => child.type === 'column')
        return {
          type: 'columns',
          attrs: { blockId: block.id },
          content: columns.map(child => this.blockToTiptap(child))
        }
      }

      case 'column': {
        const children = this.blocksToTiptap(block.children || [])
        return {
          type: 'column',
          attrs: {
            width: (block.properties?.width as string) || '1',
            blockId: block.id
          },
          // A column must always hold at least one block
          content: children.length > 0 ? children : [{ type: 'paragraph', content: [] }]
        }
      }

      case 'tab':
        // A tab on its own still needs the tab bar around it; blocksToTiptap groups neighbours
        return { type: 'tabs', attrs: {}, content: [this.tabToTiptap(block)] }

      case 'card':
        return {
          type: 'card',
          attrs: {
            title: (block.properties?.title as string) || '',
            value: (block.properties?.value as string) || '',
            icon: (block.properties?.icon as string) || '',
            color: block.properties?.color || 'teal',
            link: (block.properties?.link as string) || '',
            blockId: block.id
          }
        }

      case 'button':
        return {
          type: 'button',
          attrs: {
            label: (block.properties?.label as string) || '',
            link: (block.properties?.link as string) || '',
            style: block.properties?.style || 'primary',
            align: block.properties?.align || 'left',
            blockId: block.id
          }
        }

      default:
        // No editing view (a link card, or a block from a newer jotx): keep it exactly as written
        return { type: 'preservedBlock', attrs: { block: JSON.stringify(block) } }
    }
  }

  /**
   * Convert Tiptap node to BlockNode
   * Writes to properties.text (jotx 2.0 format)
   * (Reverse direction - for saving edits from Tiptap)
   */
  tiptapToBlock(node: TiptapNode, index?: number): BlockNode {
    // Preserve existing ID or generate new one
    const blockId = node.attrs?.blockId || generateBlockId()
    const attrs = node.attrs || {}
    const content = node.content || []

    // Widgets: attributes map 1:1 back to properties; empty values are omitted to keep files clean
    if (isWidgetBlockType(node.type)) {
      const properties: Record<string, string> = {}
      for (const [key, value] of Object.entries(attrs)) {
        if (key === 'blockId' || value === undefined || value === null || value === '') continue
        properties[key] = String(value)
      }
      return { id: blockId, type: node.type, properties, children: undefined }
    }

    switch (node.type) {
      // ========== TEXT BLOCKS ==========
      case 'heading':
        const level = attrs.level || 1
        return {
          id: blockId,
          type: 'heading',
          properties: {
            text: this.extractText(node),
            level: level
          },
          children: undefined
        }

      case 'paragraph':
        return {
          id: blockId,
          type: 'paragraph',
          properties: {
            text: this.extractText(node)
          },
          children: undefined
        }

      case 'blockquote':
        return {
          id: blockId,
          type: 'quote',
          properties: {
            text: this.extractText(node)
          },
          children: undefined
        }

      // ========== CODE & MEDIA BLOCKS ==========
      case 'codeBlock':
        return {
          id: blockId,
          type: 'code',
          properties: {
            language: attrs.language || 'plaintext',
            text: this.extractText(node)
          },
          children: undefined
        }

      case 'math':
        // CRITICAL: Math is an atomic node - src MUST come from attrs only.
        // Never fall back to extractText() as it causes accidental content ingestion
        // when text nodes accidentally end up as children of the math node.
        return {
          id: blockId,
          type: 'math' as any,
          properties: {
            title: attrs.title || '',
            src: attrs.src || '',
            display: attrs.display || 'block'
          },
          children: undefined
        }

      case 'image':
      case 'imageBlock':
        return {
          id: blockId,
          type: 'image',
          properties: {
            src: this.convertWebviewUriToRelativePath(attrs.src || ''),
            alt: attrs.alt || '',
            width: attrs.width || 800,
            ...(attrs.height && attrs.height !== 'auto' ? { height: attrs.height } : {}),
            align: attrs.align || 'center',
            caption: attrs.caption || ''
          },
          children: undefined
        }

      case 'floatImageBlock':
        // Float image is now a CONTAINER with content children
        return {
          id: blockId,
          type: 'floatimage',
          properties: {
            src: this.convertWebviewUriToRelativePath(attrs.src || ''),
            alt: attrs.alt || '',
            width: attrs.width || 400,
            ...(attrs.height && attrs.height !== 'auto' ? { height: attrs.height } : {}),
            float: attrs.float || 'left',
            caption: attrs.caption || '',
            title: attrs.title || '',
            description: attrs.description || '',
            image: attrs.image || '',
            sitename: attrs.siteName || ''
          },
          children: this.nodesToBlocks(content)
        }

      case 'videoBlock':
        return {
          id: blockId,
          type: 'video',
          properties: {
            type: attrs.type || 'youtube',
            src: this.convertWebviewUriToRelativePath(attrs.src || attrs.url || ''),
            title: attrs.title || '',
            width: attrs.width || 800,
            height: attrs.height || 450,
            ...(attrs.controls === 'false' ? { controls: false } : {}),
            ...(isTrue(attrs.autoplay) ? { autoplay: true } : {}),
            ...(isTrue(attrs.muted) ? { muted: true } : {}),
            ...(isTrue(attrs.loop) ? { loop: true } : {})
          },
          children: undefined
        }

      case 'codeReference':
        return {
          id: blockId,
          type: 'codereference',
          properties: {
            path: attrs.path || '',
            lines: attrs.lines || '',
            language: attrs.language || 'typescript',
            text: this.extractText(node)
          },
          children: undefined
        }

      // ========== CONTAINER BLOCKS ==========
      case 'callout':
        return {
          id: blockId,
          type: 'callout',
          properties: {
            variant: attrs.variant || 'info',
            text: this.extractText(node)
          },
          children: undefined
        }

      case 'toggle':
        return {
          id: blockId,
          type: 'toggle' as any,
          // Closed is the default, so only an open toggle is written
          properties: attrs.collapsed ? { title: attrs.title || 'Toggle' } : { title: attrs.title || 'Toggle', collapsed: false },
          children: this.nodesToBlocks(content)
        }

      case 'section':
        return {
          id: blockId,
          type: 'section' as any,
          // Open is the default, so only a folded section is written
          properties: attrs.collapsed ? { title: attrs.title || 'Section', collapsed: true } : { title: attrs.title || 'Section' },
          children: this.nodesToBlocks(content)
        }

      // ========== LIST BLOCKS (write to children in jotx 2.0) ==========
      case 'bulletList':
      case 'orderedList':
        return {
          id: blockId,
          type: 'list',
          properties: {
            listtype: node.type === 'orderedList' ? 'numbered' : 'bulleted'
          },
          children: this.nodesToBlocks(content)
        }

      case 'listItem':
        // Segregate content: first paragraph is 'text', rest are children
        let itemText = ''
        const childBlocks: BlockNode[] = []
        let hasFoundText = false

        if (content) {
          for (const child of content) {
            // The first paragraph is considered the item's main text
            if (!hasFoundText && child.type === 'paragraph') {
              itemText = this.extractText(child)
              hasFoundText = true
            } else {
              // Any other blocks (sub-lists, etc.) are children
              childBlocks.push(this.tiptapToBlock(child))
            }
          }
        }

        return {
          type: 'listitem',
          id: blockId,
          properties: {
            text: itemText
          },
          children: childBlocks.length > 0 ? childBlocks : undefined
        }

      case 'taskList':
        return {
          type: 'checklist',
          id: blockId,
          properties: {},
          children: this.nodesToBlocks(content)
        }

      case 'taskItem':
        // Same logic as listItem
        let taskText = ''
        const taskChildren: BlockNode[] = []
        let hasFoundTaskText = false

        if (content) {
          for (const child of content) {
            if (!hasFoundTaskText && child.type === 'paragraph') {
              taskText = this.extractText(child)
              hasFoundTaskText = true
            } else {
              taskChildren.push(this.tiptapToBlock(child))
            }
          }
        }

        return {
          type: 'taskitem',
          id: blockId,
          properties: {
            text: taskText,
            checked: !!attrs.checked,
            ...(attrs.priority ? { priority: String(attrs.priority) } : {})
          },
          children: taskChildren.length > 0 ? taskChildren : undefined
        }

      // ========== SEPARATOR & EMBED BLOCKS ==========
      case 'horizontalRule':
        return {
          id: blockId,
          type: 'divider',
          properties: {},
          children: undefined
        }

      case 'linkBlock':
        return {
          id: blockId,
          type: 'link',
          properties: {
            text: this.extractText(node)
          },
          children: undefined
        }

      case 'attach':
        return {
          id: blockId,
          type: 'attach',
          properties: {
            path: attrs.path || '',
            text: this.extractText(node)
          },
          children: this.nodesToBlocks(content)
        }

      // ========== RICH / INTERACTIVE BLOCKS ==========
      case 'mermaid':
        return {
          id: blockId,
          type: 'mermaid' as any,
          properties: {
            title: attrs.title || '',
            src: attrs.src || this.extractText(node),
            ...(attrs.showSource ? { showsource: true } : {})
          },
          children: undefined
        }

      case 'chart':
        return {
          id: blockId,
          type: 'chart' as any,
          properties: {
            title: attrs.title || '',
            charttype: attrs.chartType || 'bar',
            json: attrs.json || this.extractText(node),
            ...(attrs.showSource ? { showsource: true } : {})
          },
          children: undefined
        }

      case 'datetime':
        return {
          id: blockId,
          type: 'datetime' as any,
          properties: {
            value: attrs.value || '',
            mode: attrs.mode || 'datetime',
            timezone: attrs.timezone || ''
          },
          children: undefined
        }

      case 'jotxlink':
        // Only include reftype and refid if they have values
        // Empty values cause serializer to output invalid syntax like "reftype " (no value)
        const jotxlinkProps: Record<string, string> = {};
        if (attrs.refType) jotxlinkProps.reftype = attrs.refType;
        if (attrs.refId) jotxlinkProps.refid = attrs.refId;

        return {
          id: blockId,
          type: 'jotxlink' as any,
          properties: jotxlinkProps,
          children: undefined
        }

      case 'blockref':
        return {
          id: blockId,
          type: 'blockref' as any,
          properties: {
            ref: attrs.ref || ''
          },
          children: undefined
        }

      // ========== TABLE (complex nested structure) ==========
      case 'table': {
        const allRows = content.filter(row => row.type === 'tableRow')
        const plainText = (cell: TiptapNode) => (cell.content?.[0]?.content || []).map(n => n.text || '').join('').trim()

        // A first row of header cells, each one plain line without commas, is the `columns` line
        const first = allRows[0]
        const firstCells = first?.content || []
        const isColumnsRow = firstCells.length > 0 && firstCells.every(cell =>
          cell.type === 'tableHeader' && (cell.content || []).length === 1 && cell.content![0].type === 'paragraph' &&
          (cell.content![0].content || []).every(n => n.type === 'text') && !plainText(cell).includes(',') &&
          !(Number(cell.attrs?.colspan) > 1) && !(Number(cell.attrs?.rowspan) > 1))
        const columns = isColumnsRow ? firstCells.map(plainText).join(', ') : ''
        const bodyRows = isColumnsRow ? allRows.slice(1) : allRows

        const rows = bodyRows.map((rowNode, i) => ({
          type: 'row' as any,
          id: rowNode.attrs?.blockId || `row_${i + 1}`,
          properties: {},
          children: (rowNode.content || []).map((cellNode, j) => {
            const span: Record<string, string> = {}
            if (Number(cellNode.attrs?.colspan) > 1) span.colspan = String(cellNode.attrs!.colspan)
            if (Number(cellNode.attrs?.rowspan) > 1) span.rowspan = String(cellNode.attrs!.rowspan)
            return {
              type: (cellNode.type === 'tableHeader' ? 'header' : 'cell') as any,
              id: cellNode.attrs?.blockId || `cell_${j + 1}`,
              properties: span,
              children: this.nodesToBlocks(cellNode.content || [])
            }
          })
        }))

        const properties: Record<string, any> = {}
        if (attrs.title) properties.title = String(attrs.title)
        if (columns) properties.columns = columns
        return { id: blockId, type: 'table', properties, children: rows }
      }

      // ========== NAVIGATION BLOCKS ==========
      case 'gridcard':
        return {
          id: blockId,
          type: 'gridcard',
          properties: {
            layout: node.attrs?.layout || '2x2'
          },
          children: this.nodesToBlocks(content)
        }

      // ========== LAYOUT BLOCKS ==========
      case 'columns':
        return {
          id: blockId,
          type: 'columns',
          properties: {},
          children: this.nodesToBlocks(content)
        }

      case 'column': {
        const columnProps: Record<string, string> = {}
        if (attrs.width && String(attrs.width) !== '1') columnProps.width = String(attrs.width)
        return {
          id: blockId,
          type: 'column',
          properties: columnProps,
          children: this.nodesToBlocks(content)
        }
      }

      case 'preservedBlock':
        try {
          return JSON.parse(attrs.block)
        } catch {
          return { id: blockId, type: 'paragraph', properties: { text: '' }, children: undefined }
        }

      case 'tab': {
        const tabProps: Record<string, string> = { title: attrs.title || 'Tab' }
        if (attrs.icon) tabProps.icon = String(attrs.icon)
        return {
          id: blockId,
          type: 'tab',
          properties: tabProps,
          children: this.nodesToBlocks(content)
        }
      }

      case 'tabs':
        // Only the tabs themselves are saved; nodesToBlocks flattens every tab, this keeps the first
        return this.nodesToBlocks([node])[0]

      case 'buttonstrip':
        return {
          id: blockId,
          type: 'buttonstrip',
          properties: {},
          children: this.nodesToBlocks(content)
        }


      case 'card':
        return {
          id: blockId,
          type: 'card',
          properties: {
            title: node.attrs?.title || '',
            value: node.attrs?.value || '',
            icon: node.attrs?.icon || '',
            ...(node.attrs?.color && node.attrs.color !== 'teal' ? { color: node.attrs.color } : {}),
            link: node.attrs?.link || ''
          },
          children: undefined
        }

      case 'button':
        return {
          id: blockId,
          type: 'button',
          properties: {
            label: node.attrs?.label || '',
            link: node.attrs?.link || '',
            style: node.attrs?.style || 'primary',
            align: node.attrs?.align || 'left'
          },
          children: undefined
        }

      default:
        // Fallback: convert to paragraph
        return {
          id: blockId,
          type: 'paragraph',
          properties: {
            text: this.extractText(node)
          },
          children: undefined
        }
    }
  }

  /**
   * Convert Tiptap document to BlockNodes
   */
  tiptapToBlocks(doc: TiptapDocument): BlockNode[] {
    return this.nodesToBlocks(doc.content || [])
  }

  /**
   * Convert sibling blocks to Tiptap nodes. In .jot files tabs are plain sibling blocks;
   * the editor needs consecutive tabs wrapped in one tabs node to draw a single tab bar.
   */
  blocksToTiptap(blocks: BlockNode[]): TiptapNode[] {
    const nodes: TiptapNode[] = []
    for (const block of blocks) {
      if (block.type === 'tab') {
        const last = nodes[nodes.length - 1]
        if (last?.type === 'tabs' && last.attrs?.open) last.content!.push(this.tabToTiptap(block))
        else nodes.push({ type: 'tabs', attrs: { open: true }, content: [this.tabToTiptap(block)] })
      } else {
        nodes.push(this.blockToTiptap(block))
      }
    }
    for (const node of nodes) if (node.type === 'tabs') node.attrs = {}
    return nodes
  }

  /** Convert sibling Tiptap nodes to BlockNodes, unwrapping tab bars back into their tabs. */
  private nodesToBlocks(nodes: TiptapNode[]): BlockNode[] {
    const blocks: BlockNode[] = []
    for (const node of nodes) {
      if (node.type === 'tabs') {
        for (const tab of node.content || []) if (tab.type === 'tab') blocks.push(this.tiptapToBlock(tab))
      } else {
        blocks.push(this.tiptapToBlock(node))
      }
    }
    return blocks
  }

  private tabToTiptap(block: BlockNode): TiptapNode {
    const children = this.blocksToTiptap(block.children || [])
    return {
      type: 'tab',
      attrs: {
        title: (block.properties?.title as string) || 'Tab',
        icon: (block.properties?.icon as string) || '',
        blockId: block.id
      },
      // A tab must always hold at least one block
      content: children.length > 0 ? children : [{ type: 'paragraph', content: [] }]
    }
  }

  /**
   * Extract text content from Tiptap node WITH formatting (Markdown-style)
   * Converts Tiptap marks to Markdown syntax for storage in jotx files
   */
  private extractText(node: TiptapNode): string {
    // Direct text node with marks
    if (node.text !== undefined) {
      let text = node.text

      // Apply marks in the correct order (innermost to outermost)
      if (node.marks && node.marks.length > 0) {
        // Sort marks for consistent nesting: code > link > strong > em > strike > highlight
        const sortedMarks = [...node.marks].sort((a, b) => {
          const order: Record<string, number> = { code: 1, link: 2, bold: 3, strong: 3, italic: 4, em: 4, strike: 5, highlight: 6 }
          return (order[a.type] || 99) - (order[b.type] || 99)
        })

        for (const mark of sortedMarks) {
          switch (mark.type) {
            case 'code':
              text = `\`${text}\``
              break
            case 'link':
              const href = mark.attrs?.href || ''
              text = `[${text}](${href})`
              break
            case 'bold':
            case 'strong':
              text = `**${text}**`
              break
            case 'italic':
            case 'em':
              text = `*${text}*`
              break
            case 'strike':
              text = `~~${text}~~`
              break
            case 'highlight':
              text = `==${text}==`
              break
          }
        }
      }

      return text
    }

    // Recurse through content
    if (!node.content) return ''
    return node.content.map(child => this.extractText(child)).join('')
  }

  /**
   * Convert webview URI back to relative path for serialization
   * Examples:
   *   vscode-webview://.../ attachments/image.png → attachments/image.png
   *   attachments/image.png → attachments/image.png (no change)
   *   https://... → https://... (no change for external URLs)
   */
  private convertWebviewUriToRelativePath(uri: string): string {
    if (!uri) return ''

    // Already a relative path? Return as-is
    if (uri.startsWith('attachments/')) return uri

    // VS Code shows files through https://file+.vscode-resource.vscode-cdn.net/<absolute path> (and older
    // vscode-webview:// forms). These must never reach the file: they hold the author's local folders.
    if (/vscode-(resource|webview|cdn)/i.test(uri)) {
      const match = decodeURIComponent(uri).match(/\/attachments\/([^?#]+)/)
      if (match) return `attachments/${match[1]}`
    }

    // External URL (http/https)? Return as-is
    if (uri.startsWith('http://') || uri.startsWith('https://')) return uri

    // Webview URI? Extract filename from path
    if (uri.includes('vscode-webview://') || uri.includes('vscode-webview-resource://')) {
      // Extract the last part after /attachments/
      const match = uri.match(/\/attachments\/([^?#]+)/)
      if (match) {
        return `attachments/${decodeURIComponent(match[1])}`
      }
    }

    // Fallback: if it looks like a file path with attachments, extract it
    if (uri.includes('/attachments/')) {
      const parts = uri.split('/attachments/')
      if (parts.length > 1) {
        return `attachments/${decodeURIComponent(parts[parts.length - 1]).split('?')[0]}`
      }
    }

    // Can't parse - return original
    return uri
  }
}
