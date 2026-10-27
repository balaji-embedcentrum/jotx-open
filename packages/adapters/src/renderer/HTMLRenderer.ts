/**
 * jotx 2.0 HTMLRenderer - Convert BlockNode to HTML
 * 
 * Pure function: BlockNode[] → HTML string
 * For web hosting and static site generation
 */

import { BlockNode } from '@jotx-labs/core'

export class HTMLRenderer {
  /**
   * Render array of BlockNodes to HTML
   */
  render(blocks: BlockNode[]): string {
    if (!blocks || blocks.length === 0) {
      return '<p>No content</p>'
    }

    return blocks.map(block => this.renderBlock(block)).join('\n')
  }

  /**
   * Render a single BlockNode to HTML
   */
  renderBlock(block: BlockNode): string {
    const text = (block.properties?.text as string) || ''

    switch (block.type) {
      // ========== TEXT BLOCKS ==========
      case 'heading':
        const level = (block.properties?.level as number) || 1
        const headingTag = `h${Math.min(Math.max(level, 1), 6)}`
        return `<${headingTag}>${this.escapeHTML(text)}</${headingTag}>`

      case 'paragraph':
        return `<p>${this.escapeHTML(text)}</p>`

      case 'quote':
        return `<blockquote><p>${this.escapeHTML(text)}</p></blockquote>`

      // ========== CODE & MEDIA BLOCKS ==========
      case 'code':
        const language = (block.properties?.language as string) || 'plaintext'
        return `<pre><code class="language-${language}">${this.escapeHTML(text)}</code></pre>`

      case 'math':
        const display = (block.properties?.display as string) || 'block'
        return display === 'inline'
          ? `<span class="math-inline">\\(${this.escapeHTML(text)}\\)</span>`
          : `<div class="math-block">\\[${this.escapeHTML(text)}\\]</div>`

      case 'image':
        const src = (block.properties?.src as string) || ''
        const alt = (block.properties?.alt as string) || ''
        const width = (block.properties?.width as number) || 100
        const align = (block.properties?.align as string) || 'left'
        return `<img src="${this.escapeHTML(src)}" alt="${this.escapeHTML(alt)}" style="width: ${width}%; text-align: ${align};" />`

      // ========== CONTAINER BLOCKS ==========
      case 'callout':
        const variant = (block.properties?.variant as string) || 'info'
        return `<div class="callout callout-${variant}"><p>${this.escapeHTML(text)}</p></div>`

      case 'toggle':
        const title = (block.properties?.title as string) || 'Toggle'
        const collapsed = block.properties?.collapsed === 'true'
        return `
          <details ${collapsed ? '' : 'open'}>
            <summary>${this.escapeHTML(title)}</summary>
            <div>${this.escapeHTML(text)}</div>
          </details>`

      // ========== LIST BLOCKS ==========
      case 'list':
        const listType = block.properties?.type === 'numbered' ? 'ol' : 'ul'
        const items = (block.children || []).map(child => {
          const itemText = (child.properties?.text as string) || ''
          return `<li>${this.escapeHTML(itemText)}</li>`
        }).join('\n')
        return `<${listType}>\n${items}\n</${listType}>`

      case 'checklist':
        const checkItems = (block.children || []).map(child => {
          const itemText = (child.properties?.text as string) || ''
          const checked = child.properties?.checked === 'true'
          return `<li><input type="checkbox" ${checked ? 'checked' : ''} disabled> ${this.escapeHTML(itemText)}</li>`
        }).join('\n')
        return `<ul class="checklist">\n${checkItems}\n</ul>`

      // ========== SEPARATOR & EMBED BLOCKS ==========
      case 'divider':
        return '<hr />'

      case 'link': {
        const url = (block.properties?.url as string) || ''
        return `<a href="${this.escapeHTML(url)}">${this.escapeHTML(text)}</a>`
      }

      case 'attach':
        const path = (block.properties?.path as string) || ''
        return `<a href="${this.escapeHTML(path)}" class="attachment">📎 ${this.escapeHTML(text || path)}</a>`

      // ========== RICH / INTERACTIVE BLOCKS ==========
      case 'mermaid':
        return `<div class="mermaid">\n${this.escapeHTML(text)}\n</div>`

      case 'chart':
        const chartType = (block.properties?.charttype as string) || 'bar'
        return `<div class="chart" data-type="${chartType}" data-json="${this.escapeHTML(text)}">Chart</div>`

      case 'datetime':
        const timestamp = (block.properties?.timestamp as string) || ''
        const format = (block.properties?.format as string) || ''
        const timezone = (block.properties?.timezone as string) || ''
        return `<time datetime="${this.escapeHTML(timestamp)}" data-format="${this.escapeHTML(format)}" data-timezone="${this.escapeHTML(timezone)}">${this.escapeHTML(timestamp)}</time>`

      case 'linkcard':
        const url = (block.properties?.url as string) || ''
        const cardTitle = (block.properties?.title as string) || ''
        const description = (block.properties?.description as string) || ''
        const image = (block.properties?.image as string) || ''
        const siteName = (block.properties?.sitename as string) || ''
        return `
          <div class="link-card">
            ${image ? `<img src="${this.escapeHTML(image)}" alt="${this.escapeHTML(cardTitle)}" />` : ''}
            <div class="link-card-content">
              <h4>${this.escapeHTML(cardTitle)}</h4>
              <p>${this.escapeHTML(description)}</p>
              <a href="${this.escapeHTML(url)}">${this.escapeHTML(siteName || url)}</a>
            </div>
          </div>`

      // ========== TABLE ==========
      case 'table':
        const rows = (block.children || []).map(row => {
          const cells = (row.children || []).map(cell => {
            // Recursively render blocks inside cells
            const cellBlocks = (cell.children || [])
            const cellContent = cellBlocks.map(b => this.renderBlock(b)).join('')
            return `<td>${cellContent}</td>`
          }).join('')
          return `<tr>${cells}</tr>`
        }).join('\n')
        return `<table>\n${rows}\n</table>`

      // ========== CUSTOM BLOCKS ==========
      case 'custom':
        const customType = (block.properties?.customtype as string) || 'unknown'
        return `<div class="custom-block" data-type="${this.escapeHTML(customType)}">${this.escapeHTML(text)}</div>`

      default:
        // Fallback: render as div
        return `<div>${this.escapeHTML(text)}</div>`
    }
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}

