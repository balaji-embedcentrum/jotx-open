/**
 * StaticRenderer - BlockNode[] to complete, semantic HTML for every block type.
 *
 * Used to publish .jot files as web pages: the output reads well with no script, search
 * engines index all of it (every tab panel included), and widgets get a readable fallback
 * that the jotx script can replace with the live view. Everything from the document is
 * escaped, and links are limited to web, mail, relative and anchor addresses.
 */

import { BlockNode, BLOCK_TYPES } from '@jotx-labs/core'

export interface StaticRenderOptions {
  /** Rewrite a link target, e.g. "guides/start.jot" to "/guides/start/". */
  resolveLink?: (href: string) => string
  /** Rewrite an image, video or attachment path. */
  resolveMedia?: (src: string) => string
  /** Page address for a jotxlink to a document or block id, or null when unknown. */
  resolveRef?: (reftype: string, refid: string) => { href: string; label?: string } | null
  /** Title shown at the left of the top navigation of a one-file site */
  brand?: string
  /** Show a search button in the top navigation (the page provides the search) */
  search?: boolean
}

/**
 * A document that starts with tabs (after at most one menu) is a one-file site: its tabs are the
 * page's top navigation. Returns the index of the first of those tabs, or -1.
 */
export function siteNavStart(blocks: BlockNode[]): number {
  if (blocks[0]?.type === 'tab') return 0
  if (blocks[0]?.type === 'menu' && blocks[1]?.type === 'tab') return 1
  return -1
}

/** Blocks that need the jotx script for their full view; their HTML here is a readable fallback. */
export const SCRIPTED_BLOCKS = new Set([
  'mermaid', 'chart', 'math',
  'kanban', 'habit', 'progress', 'countdown', 'timer', 'matrix', 'proscons', 'decision', 'rating',
  'toc', 'steps', 'timeline', 'terminal', 'api', 'filetree', 'diff', 'palette', 'badges', 'animation', 'shortcuts'
])

/** Every block type the renderer handles; a test keeps this in step with BLOCK_TYPES. */
export const STATIC_BLOCK_TYPES = new Set<string>([
  'heading', 'paragraph', 'quote', 'list', 'listitem', 'checklist', 'taskitem', 'code', 'codereference', 'math',
  'image', 'floatimage', 'video', 'callout', 'section', 'toggle', 'table', 'row', 'cell', 'header', 'properties', 'property',
  'divider', 'link', 'attach', 'mermaid', 'chart', 'datetime', 'linkcard', 'jotxlink', 'blockref', 'custom',
  'gridcard', 'card', 'button', 'buttonstrip', 'columns', 'column', 'tab', 'menu',
  ...SCRIPTED_BLOCKS
])

const esc = (value: unknown) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const unesc = (value: string) =>
  value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')

const lines = (text: unknown) => String(text ?? '').split('\n').map(l => l.trim()).filter(Boolean)

const cells = (line: string, count: number) => {
  const parts = line.split('|').map(p => p.trim())
  while (parts.length < count) parts.push('')
  return parts
}

export function slugify(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section'
}

/** Web, mail, phone, anchor and relative addresses only; anything else (javascript:, data:) is dropped. */
export function safeUrl(url: string): string {
  const u = String(url || '').trim()
  if (!u) return ''
  if (/^(https?:|mailto:|tel:)/i.test(u) || /^[#/?.]/.test(u)) return u
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return ''
  return u
}

const isExternal = (url: string) => /^https?:\/\//i.test(url)

/** Colours for palettes, badges and text spans: hex, named and functional notations only. */
const safeColor = (value: string) => (/^(#[0-9a-f]{3,8}|[a-z]{3,20}|(rgb|hsl)a?\([\d\s.,%/]+\))$/i.test(value.trim()) ? value.trim() : '')

const ACCENTS = ['teal', 'blue', 'violet', 'pink', 'amber', 'green', 'red', 'slate']

export class StaticRenderer {
  private headings: { level: number; text: string; slug: string }[] = []
  private slugs = new Map<string, number>()

  constructor(private options: StaticRenderOptions = {}) {}

  /** Render a document's blocks. Consecutive tabs become one tab bar; leading tabs become the top navigation. */
  render(blocks: BlockNode[]): string {
    this.headings = []
    this.slugs = new Map()
    this.collectHeadings(blocks)
    this.slugs = new Map()
    const start = siteNavStart(blocks)
    if (start < 0) return this.renderList(blocks)
    let end = start
    while (end < blocks.length && blocks[end].type === 'tab') end++
    const menu = start === 1 ? blocks[0] : null
    return [this.renderTabs(blocks.slice(start, end), { menu }), this.renderList(blocks.slice(end))].filter(Boolean).join('\n')
  }

  /** Headings in document order with their anchor names, for tables of contents. */
  outline(blocks: BlockNode[]) {
    this.headings = []
    this.slugs = new Map()
    this.collectHeadings(blocks)
    return this.headings
  }

  // ---- Helpers ----

  private link(href: string): string {
    const resolved = this.options.resolveLink ? this.options.resolveLink(href) : href
    return safeUrl(resolved)
  }

  private media(src: string): string {
    if (!src) return ''
    if (/^data:image\//i.test(src)) return src
    return safeUrl(this.options.resolveMedia ? this.options.resolveMedia(src) : src)
  }

  private anchor(text: string): string {
    const base = slugify(text)
    const n = this.slugs.get(base) || 0
    this.slugs.set(base, n + 1)
    return n ? `${base}-${n + 1}` : base
  }

  private collectHeadings(blocks: BlockNode[]) {
    for (const block of blocks) {
      if (block.type === 'heading' && block.properties?.text) {
        const text = String(block.properties.text)
        this.headings.push({ level: Number(block.properties.level) || 1, text, slug: this.anchor(this.plain(text)) })
      }
      if (block.children) this.collectHeadings(block.children)
    }
  }

  /** Text with the inline marks removed, for anchors and titles. */
  private plain(text: string): string {
    return text.replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/(\*\*|\*|~~|==)(.+?)\1/g, '$2').replace(/<[^>]+>/g, '')
  }

  /** Inline formatting: **bold**, *italic*, ~~strike~~, ==highlight==, `code`, [links](url), [[refs]], colour spans. */
  inline(text: unknown): string {
    let html = esc(text)
    const codes: string[] = []
    html = html.replace(/`([^`]+)`/g, (_, code) => `\u0000${codes.push(`<code>${code}</code>`) - 1}\u0000`)
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
      const href = this.link(unesc(url))
      if (!href) return label
      const ext = isExternal(href) ? ' rel="noopener" target="_blank"' : ''
      return `<a href="${esc(href)}"${ext}>${label}</a>`
    })
    html = html.replace(/\[\[([^\]]+)\]\]/g, (_, target) => {
      const ref = this.options.resolveRef?.('doc', unesc(target))
      return ref ? `<a class="jx-s-ref" href="${esc(safeUrl(ref.href))}">${ref.label ? esc(ref.label) : target}</a>` : `<span class="jx-s-ref">${target}</span>`
    })
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
    html = html.replace(/~~(.+?)~~/g, '<s>$1</s>')
    html = html.replace(/==(.+?)==/g, '<mark>$1</mark>')
    html = html.replace(/&lt;span style=&quot;color:\s*([^&;]+);?&quot;&gt;(.+?)&lt;\/span&gt;/g, (_, color, inner) => {
      const c = safeColor(unesc(color))
      return c ? `<span style="color:${esc(c)}">${inner}</span>` : inner
    })
    html = html.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)])
    return html.replace(/\n/g, '<br>')
  }

  private renderList(blocks: BlockNode[]): string {
    const out: string[] = []
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].type === 'tab') {
        const tabs: BlockNode[] = []
        while (i < blocks.length && blocks[i].type === 'tab') tabs.push(blocks[i++])
        i--
        out.push(this.renderTabs(tabs))
      } else {
        const html = this.renderBlock(blocks[i])
        if (html) out.push(html)
      }
    }
    return out.join('\n')
  }

  private children(block: BlockNode): string {
    return block.children?.length ? this.renderList(block.children) : ''
  }

  private widget(block: BlockNode, body: string): string {
    const title = block.properties?.title ? `<div class="jx-s-widget__title">${esc(block.properties.title)}</div>` : ''
    return `<div class="jx-s-widget jx-s-widget--${esc(block.type)}">${title}${body}</div>`
  }

  private formatDate(value: string, withTime = false): string {
    const d = new Date(value)
    if (!value || isNaN(d.getTime())) return esc(value)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${Number(value.slice(8, 10))} ${months[Number(value.slice(5, 7)) - 1]} ${value.slice(0, 4)}`
      : `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
    const time = withTime && /T\d{2}:\d{2}/.test(value) ? ` ${value.match(/T(\d{2}:\d{2})/)![1]}` : ''
    return esc(date + time)
  }

  // ---- Blocks ----

  renderBlock(block: BlockNode): string {
    const p: Record<string, any> = block.properties || {}
    const text = String(p.text ?? '')

    switch (block.type as string) {
      case 'heading': {
        const level = Math.min(3, Math.max(1, Number(p.level) || 1))
        return `<h${level} id="${this.anchor(this.plain(text))}">${this.inline(text)}</h${level}>`
      }

      case 'paragraph':
        // An empty paragraph is a blank line in the editor
        return text.trim() ? `<p>${this.inline(text)}</p>` : ''

      case 'quote':
        return `<blockquote><p>${this.inline(text)}</p>${this.children(block)}</blockquote>`

      case 'list': {
        const tag = p.listtype === 'numbered' || p.type === 'numbered' ? 'ol' : 'ul'
        const items = block.children?.length
          ? block.children.map(c => this.renderBlock(c)).join('')
          : lines(p.items).map(l => `<li>${this.inline(l)}</li>`).join('')
        return `<${tag}>${items}</${tag}>`
      }

      case 'listitem':
        return `<li>${this.inline(text)}${this.children(block)}</li>`

      case 'checklist': {
        // Items may be written as taskitem or listitem; both are tasks with a tick box
        const items = block.children?.length
          ? block.children.map(c => (c.type === 'listitem' || c.type === 'taskitem'
            ? this.task(String(c.properties?.text ?? ''), c.properties?.checked === true || c.properties?.checked === 'true', this.children(c))
            : this.renderBlock(c))).join('')
          : lines(p.items).map(l => {
            const m = l.match(/^\[([ xX])\]\s*(.*)$/)
            return this.task(m ? m[2] : l, !!m && m[1].toLowerCase() === 'x')
          }).join('')
        return `<ul class="jx-s-checklist">${items}</ul>`
      }

      case 'taskitem':
        return this.task(text, p.checked === true || p.checked === 'true', this.children(block))

      case 'code':
        return `<div class="jx-s-code">${p.language ? `<div class="jx-s-code__lang">${esc(p.language)}</div>` : ''}<pre><code${p.language ? ` class="language-${esc(p.language)}"` : ''}>${esc(text)}</code></pre></div>`

      case 'codereference':
        return `<div class="jx-s-coderef"><code>${esc(p.path)}${p.lines ? `:${esc(p.lines)}` : ''}</code></div>`

      case 'math':
        return `<figure class="jx-s-math">${p.title ? `<figcaption>${esc(p.title)}</figcaption>` : ''}<code>${esc(p.src)}</code></figure>`

      case 'image': {
        const src = this.media(String(p.src || ''))
        if (!src) return ''
        const size = `${p.width && /^\d+$/.test(String(p.width)) ? ` width="${esc(p.width)}"` : ''}`
        return `<figure class="jx-s-image jx-s-align-${esc(p.align || 'center')}"><img src="${esc(src)}" alt="${esc(p.alt || p.caption || '')}"${size} loading="lazy">${p.caption ? `<figcaption>${this.inline(p.caption)}</figcaption>` : ''}</figure>`
      }

      case 'floatimage': {
        const src = this.media(String(p.src || ''))
        const img = src ? `<figure class="jx-s-float jx-s-float--${p.float === 'right' ? 'right' : 'left'}"><img src="${esc(src)}" alt="${esc(p.alt || p.caption || '')}" loading="lazy">${p.caption ? `<figcaption>${this.inline(p.caption)}</figcaption>` : ''}</figure>` : ''
        return `<div class="jx-s-floatwrap">${img}${this.children(block)}</div>`
      }

      case 'video': {
        const src = String(p.src || '')
        const yt = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)
        if (yt) {
          return `<div class="jx-s-video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(yt[1])}" title="${esc(p.title || 'Video')}" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`
        }
        const media = this.media(src)
        return media ? `<div class="jx-s-video"><video src="${esc(media)}" controls preload="metadata"${p.muted === 'true' ? ' muted' : ''}${p.loop === 'true' ? ' loop' : ''}></video></div>` : ''
      }

      case 'callout': {
        const variant = ['info', 'warning', 'success', 'danger'].includes(p.variant) ? p.variant : 'info'
        return `<aside class="jx-s-callout jx-s-callout--${variant}">${text ? `<p>${this.inline(text)}</p>` : ''}${this.children(block)}</aside>`
      }

      case 'section':
        return `<details class="jx-s-section"${p.collapsed === 'true' || p.collapsed === true ? '' : ' open'}><summary>${this.inline(p.title || 'Section')}</summary><div class="jx-s-section__body">${this.children(block)}</div></details>`

      case 'toggle':
        return `<details class="jx-s-toggle"${p.collapsed === 'false' || p.collapsed === false ? ' open' : ''}><summary>${this.inline(p.title || 'Toggle')}</summary><div class="jx-s-toggle__body">${this.children(block)}</div></details>`

      case 'table':
        return this.table(block)

      case 'row':
      case 'cell':
      case 'header':
        // Rendered by their table
        return this.children(block)

      case 'properties': {
        const rows = (block.children || []).filter(c => (c.type as string) === 'property')
          .map(c => `<dt>${esc(c.properties?.key)}</dt><dd>${this.inline(c.properties?.value)}</dd>`).join('')
        return `<dl class="jx-s-props">${p.title ? `<div class="jx-s-props__title">${esc(p.title)}</div>` : ''}${rows}</dl>`
      }

      case 'property':
        return `<dl class="jx-s-props"><dt>${esc(p.key)}</dt><dd>${this.inline(p.value)}</dd></dl>`

      case 'divider':
        return '<hr>'

      case 'link': {
        const href = this.link(String(p.url || ''))
        if (!href) return ''
        return `<p class="jx-s-link"><a href="${esc(href)}"${isExternal(href) ? ' rel="noopener" target="_blank"' : ''}>${this.inline(p.text || p.url)}</a></p>`
      }

      case 'attach': {
        const href = this.media(String(p.path || ''))
        const name = p.text || String(p.path || '').split('/').pop()
        return href ? `<p class="jx-s-attach"><a href="${esc(href)}" download>${esc(name)}</a></p>` : ''
      }

      case 'mermaid':
        return `<figure class="jx-s-diagram">${p.title ? `<figcaption>${esc(p.title)}</figcaption>` : ''}<pre>${esc(p.src)}</pre></figure>`

      case 'chart': {
        const rows = lines(p.data).map(l => cells(l, 1))
        if (!rows.length) return this.widget(block, '')
        const [head, ...body] = rows
        return `<figure class="jx-s-chart">${p.title ? `<figcaption>${esc(p.title)}</figcaption>` : ''}<div class="jx-s-table"><table><thead><tr>${head.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></figure>`
      }

      case 'datetime':
        return `<p class="jx-s-datetime"><time datetime="${esc(p.value)}">${this.formatDate(String(p.value || ''), p.mode !== 'date')}</time></p>`

      case 'linkcard': {
        const href = this.link(String(p.url || ''))
        const img = p.image ? this.media(String(p.image)) : ''
        return `<a class="jx-s-linkcard" href="${esc(href)}"${isExternal(href) ? ' rel="noopener" target="_blank"' : ''}>${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}<span class="jx-s-linkcard__body"><strong>${esc(p.title || p.url)}</strong>${p.description ? `<span>${esc(p.description)}</span>` : ''}${p.sitename ? `<small>${esc(p.sitename)}</small>` : ''}</span></a>`
      }

      case 'jotxlink': {
        const ref = this.options.resolveRef?.(String(p.reftype || 'doc'), String(p.refid || ''))
        return ref
          ? `<p class="jx-s-jotxlink"><a href="${esc(safeUrl(ref.href))}">${esc(ref.label || p.refid)}</a></p>`
          : `<p class="jx-s-jotxlink"><span class="jx-s-ref">${esc(p.refid)}</span></p>`
      }

      case 'blockref':
        return `<p class="jx-s-jotxlink"><span class="jx-s-ref">${esc(p.ref)}</span></p>`

      case 'gridcard': {
        const cols = Math.max(1, Math.min(4, parseInt(String(p.layout || '2x2'), 10) || 2))
        return `<div class="jx-s-grid" style="--jx-s-cols:${cols}">${(block.children || []).map(c => this.renderBlock(c)).join('')}</div>`
      }

      case 'card': {
        const color = ACCENTS.includes(p.color) ? p.color : 'teal'
        const href = p.link ? this.link(String(p.link)) : ''
        const inner = `${p.icon ? `<span class="jx-s-card__icon">${esc(p.icon)}</span>` : ''}<span class="jx-s-card__title">${esc(p.title)}</span>${p.value ? `<span class="jx-s-card__value">${esc(p.value)}</span>` : ''}`
        return href
          ? `<a class="jx-s-card jx-s-tone--${color}" href="${esc(href)}"${isExternal(href) ? ' rel="noopener" target="_blank"' : ''}>${inner}</a>`
          : `<div class="jx-s-card jx-s-tone--${color}">${inner}</div>`
      }

      case 'button': {
        if (!p.label) return ''
        const style = ['primary', 'secondary', 'outline', 'ghost'].includes(p.style) ? p.style : 'primary'
        const align = ['left', 'center', 'right'].includes(p.align) ? p.align : 'left'
        const back = p.link === ':previous'
        const href = back ? '#' : this.link(String(p.link || ''))
        return `<p class="jx-s-buttonrow jx-s-align-${align}"><a class="jx-s-button jx-s-button--${style}" href="${esc(href || '#')}"${back ? ' data-jx-back' : ''}${isExternal(href) ? ' rel="noopener" target="_blank"' : ''}>${esc(p.label)}</a></p>`
      }

      case 'buttonstrip':
        return `<div class="jx-s-buttonstrip">${(block.children || []).map(c => this.renderBlock(c)).join('')}</div>`

      case 'columns':
        return `<div class="jx-s-columns">${(block.children || []).map(c => this.renderBlock(c)).join('')}</div>`

      case 'column': {
        const grow = Math.max(0.25, Math.min(4, parseFloat(String(p.width || '1')) || 1))
        return `<div class="jx-s-column" style="flex:${grow} 1 0">${this.children(block)}</div>`
      }

      case 'tab':
        return this.renderTabs([block])

      case 'menu':
        return this.menu(p)

      case 'custom':
        return text ? `<p>${this.inline(text)}</p>` : ''

      // ---- Widgets: readable fallbacks; the jotx script draws the live view ----

      case 'kanban': {
        const columns: { name: string; cards: string[] }[] = []
        for (const l of lines(p.board)) {
          const head = l.match(/^\[(.+)\]$/)
          if (head) columns.push({ name: head[1], cards: [] })
          else {
            if (!columns.length) columns.push({ name: 'Cards', cards: [] })
            columns[columns.length - 1].cards.push(l)
          }
        }
        return this.widget(block, `<div class="jx-s-kanban">${columns.map(c => `<section><h4>${esc(c.name)} <small>${c.cards.length}</small></h4><ul>${c.cards.map(card => `<li>${this.inline(card)}</li>`).join('')}</ul></section>`).join('')}</div>`)
      }

      case 'habit': {
        const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
        const rows = lines(p.habits).map(l => cells(l, 2))
        return this.widget(block, `<div class="jx-s-table"><table class="jx-s-habit"><thead><tr><th></th>${days.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>${rows.map(([name, marks]) => `<tr><th>${esc(name)}</th>${days.map((_, i) => `<td>${marks[i] === '1' ? '●' : '○'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)
      }

      case 'progress': {
        const rows = lines(p.items).map(l => {
          const [label, a, b] = cells(l, 3)
          const pct = b ? (Number(a) / Math.max(1, Number(b))) * 100 : Number(a)
          const v = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0))
          return `<li><span>${esc(label)}</span><span class="jx-s-bar"><span style="width:${v.toFixed(0)}%"></span></span><span>${b ? `${esc(a)}/${esc(b)}` : `${v.toFixed(0)}%`}</span></li>`
        })
        return this.widget(block, `<ul class="jx-s-progress">${rows.join('')}</ul>`)
      }

      case 'countdown':
        return this.widget(block, `<p class="jx-s-countdown">Until <time datetime="${esc(p.target)}">${this.formatDate(String(p.target || ''), true)}</time></p>`)

      case 'timer':
        return this.widget(block, `<p class="jx-s-timer">${esc(p.minutes || 25)} min focus · ${esc(p.breakminutes || 5)} min break</p>`)

      case 'matrix': {
        const quad = (label: string, key: string) => `<section><h4>${label}</h4><ul>${lines(p[key]).map(l => `<li>${this.inline(l)}</li>`).join('')}</ul></section>`
        return this.widget(block, `<div class="jx-s-matrix">${quad('Do first', 'dofirst')}${quad('Schedule', 'schedule')}${quad('Delegate', 'delegate')}${quad('Eliminate', 'eliminate')}</div>`)
      }

      case 'proscons':
        return this.widget(block, `<div class="jx-s-proscons"><section><h4>Pros</h4><ul>${lines(p.pros).map(l => `<li>${this.inline(l)}</li>`).join('')}</ul></section><section><h4>Cons</h4><ul>${lines(p.cons).map(l => `<li>${this.inline(l)}</li>`).join('')}</ul></section></div>`)

      case 'decision':
        return this.widget(block, `<p class="jx-s-decision__meta">${p.status ? `<span class="jx-s-pill">${esc(p.status)}</span>` : ''}${p.date ? ` <time datetime="${esc(p.date)}">${this.formatDate(String(p.date))}</time>` : ''}</p><dl class="jx-s-decision">${[['Context', p.context], ['Decision', p.decision], ['Consequences', p.consequences]].filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${this.inline(v)}</dd>`).join('')}</dl>`)

      case 'rating': {
        const max = Math.max(1, Math.min(10, Number(p.max) || 5))
        const value = Math.max(0, Math.min(max, Number(p.value) || 0))
        return this.widget(block, `<p class="jx-s-rating" aria-label="${value} of ${max}">${'★'.repeat(Math.round(value))}${'☆'.repeat(max - Math.round(value))} <small>${value}/${max}</small></p>`)
      }

      case 'toc': {
        const depth = Math.max(1, Math.min(3, Number(p.depth) || 3))
        const items = this.headings.filter(h => h.level <= depth)
        return this.widget(block, `<nav class="jx-s-toc"><ul>${items.map(h => `<li class="jx-s-toc--l${h.level}"><a href="#${h.slug}">${esc(this.plain(h.text))}</a></li>`).join('')}</ul></nav>`)
      }

      case 'steps': {
        const items = lines(p.steps).map(l => {
          const m = l.match(/^\[([ xX])\]\s*(.*)$/)
          const [title, desc] = cells(m ? m[2] : l, 2)
          return `<li${m && m[1].toLowerCase() === 'x' ? ' class="is-done"' : ''}><strong>${this.inline(title)}</strong>${desc ? `<span>${this.inline(desc)}</span>` : ''}</li>`
        })
        return this.widget(block, `<ol class="jx-s-steps">${items.join('')}</ol>`)
      }

      case 'timeline': {
        const items = lines(p.events).map(l => {
          const [date, title, status, desc] = cells(l, 4)
          return `<li${status ? ` data-status="${esc(status)}"` : ''}><time datetime="${esc(date)}">${this.formatDate(date)}</time><strong>${this.inline(title)}</strong>${desc ? `<span>${this.inline(desc)}</span>` : ''}</li>`
        })
        return this.widget(block, `<ol class="jx-s-timeline">${items.join('')}</ol>`)
      }

      case 'terminal': {
        const body = String(p.commands || '').split('\n').map(l => (l.startsWith('$ ') ? `<span class="jx-s-prompt">$</span> <span class="jx-s-cmd">${esc(l.slice(2))}</span>` : `<span class="jx-s-out">${esc(l)}</span>`)).join('\n')
        return this.widget(block, `<pre class="jx-s-terminal">${body}</pre>`)
      }

      case 'api':
        return this.widget(block, `<p class="jx-s-api"><span class="jx-s-pill">${esc(String(p.method || 'GET').toUpperCase())}</span> <code>${esc(p.path)}</code></p>${p.summary ? `<p>${this.inline(p.summary)}</p>` : ''}${p.request ? `<div class="jx-s-code"><div class="jx-s-code__lang">Request</div><pre><code>${esc(p.request)}</code></pre></div>` : ''}${p.response ? `<div class="jx-s-code"><div class="jx-s-code__lang">Response</div><pre><code>${esc(p.response)}</code></pre></div>` : ''}`)

      case 'filetree': {
        const body = String(p.tree || '').split('\n').map(l => {
          const [path, note] = l.split(/\s+\/\/\s*/)
          return `${esc(path)}${note ? `  <span class="jx-s-out">${esc(note)}</span>` : ''}`
        }).join('\n')
        return this.widget(block, `<pre class="jx-s-filetree">${body}</pre>`)
      }

      case 'diff': {
        const before = String(p.before || '').split('\n').filter(Boolean).map(l => `<span class="jx-s-del">- ${esc(l)}</span>`)
        const after = String(p.after || '').split('\n').filter(Boolean).map(l => `<span class="jx-s-add">+ ${esc(l)}</span>`)
        return this.widget(block, `<pre class="jx-s-diff">${[...before, ...after].join('\n')}</pre>`)
      }

      case 'palette':
        return this.widget(block, `<ul class="jx-s-palette">${lines(p.colors).map(l => {
          const [name, hex] = cells(l, 2)
          const c = safeColor(hex)
          return `<li><span class="jx-s-swatch" style="background:${esc(c)}"></span><strong>${esc(name)}</strong><code>${esc(hex)}</code></li>`
        }).join('')}</ul>`)

      case 'badges':
        return `<p class="jx-s-badges">${lines(p.items).map(l => {
          const [label, message, color] = cells(l, 3)
          const tone = ACCENTS.includes(color.toLowerCase()) ? color.toLowerCase() : ''
          const hex = !tone ? safeColor(color) : ''
          return `<span class="jx-s-badge${tone ? ` jx-s-tone--${tone}` : ''}"${hex ? ` style="--jx-s-tone:${esc(hex)}"` : ''}><span>${esc(label || message)}</span>${message && label ? `<span>${esc(message)}</span>` : ''}</span>`
        }).join('')}</p>`

      case 'animation':
        return this.widget(block, `<ol class="jx-s-steps">${lines(p.steps).map(l => {
          const [node, caption] = cells(l, 2)
          return `<li><strong>${esc(node)}</strong>${caption ? `<span>${this.inline(caption)}</span>` : ''}</li>`
        }).join('')}</ol>`)

      case 'shortcuts':
        return this.widget(block, `<div class="jx-s-table"><table class="jx-s-shortcuts"><tbody>${lines(p.items).map(l => {
          const [keys, desc] = cells(l, 2)
          return `<tr><td>${keys.split('+').map(k => `<kbd>${esc(k.trim())}</kbd>`).join('+')}</td><td>${this.inline(desc)}</td></tr>`
        }).join('')}</tbody></table></div>`)

      default:
        return text ? `<p>${this.inline(text)}</p>` : this.children(block)
    }
  }

  private task(text: string, done: boolean, nested = ''): string {
    return `<li${done ? ' class="is-done"' : ''}><span class="jx-s-box" aria-hidden="true">${done ? '✓' : ''}</span><span>${this.inline(text)}${nested}</span></li>`
  }

  private table(block: BlockNode): string {
    const p: Record<string, any> = block.properties || {}
    let head: string[] = []
    let body: string[][] = []
    const rowBlocks = (block.children || []).filter(c => c.type === 'row')
    if (rowBlocks.length) {
      const cellHtml = (c: BlockNode) => {
        const content = c.children?.length ? this.renderList(c.children) : this.inline(c.properties?.text)
        // A cell holding a single paragraph reads better without the paragraph margin
        return content.replace(/^<p>([\s\S]*)<\/p>$/, '$1')
      }
      const rows = rowBlocks.map(r => (r.children || []).map(cellHtml))
      const firstIsHeader = (rowBlocks[0].children || []).some(c => c.type === 'header')
      if (firstIsHeader || p.columns) { head = rows[0]; body = rows.slice(1) } else body = rows
      if (p.columns && !firstIsHeader) { head = String(p.columns).split(',').map(c => esc(c.trim())); body = rows }
    } else {
      head = String(p.columns || '').split(',').map(c => c.trim()).filter(Boolean).map(c => esc(c))
      body = String(p.rows || '').split('\n').filter(l => l.trim()).map(l =>
        l.split(/(?<!\\)\|/).map(c => this.inline(c.trim().replace(/\\\|/g, '|'))))
    }
    const caption = p.title ? `<caption>${esc(p.title)}</caption>` : ''
    // Spaces between cells keep words apart in search excerpts
    const thead = head.length ? `<thead><tr>${head.map(h => `<th>${h}</th>`).join(' ')}</tr></thead>` : ''
    return `<div class="jx-s-table"><table>${caption}${thead}<tbody>${body.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join(' ')}</tr>`).join('\n')}</tbody></table></div>`
  }

  private tabSlugs(tabs: BlockNode[]): string[] {
    const used = new Map<string, number>()
    return tabs.map(t => {
      const base = slugify(String(t.properties?.title || 'tab'))
      const n = used.get(base) || 0
      used.set(base, n + 1)
      return n ? `${base}-${n + 1}` : base
    })
  }

  private renderTabs(tabs: BlockNode[], nav?: { menu: BlockNode | null }): string {
    const slugs = this.tabSlugs(tabs)
    const label = (t: BlockNode) => `${t.properties?.icon ? `<span class="jx-s-tabs__icon" aria-hidden="true">${esc(t.properties.icon)}</span>` : ''}${esc(t.properties?.title || 'Tab')}`
    const panels = tabs.map((t, i) => `<section class="jx-s-tabs__panel" role="tabpanel" data-tab="${slugs[i]}" data-title="${esc(t.properties?.title || 'Tab')}"${i === 0 ? '' : ' hidden'}><h2 class="jx-s-tabs__label">${label(t)}</h2>${this.children(t)}</section>`).join('')

    if (!nav) {
      const bar = tabs.map((t, i) => `<button type="button" role="tab" class="jx-s-tabs__tab" data-tab="${slugs[i]}" aria-selected="${i === 0}">${label(t)}</button>`).join('')
      return `<div class="jx-s-tabs" data-jx-tabs><div class="jx-s-tabs__bar" role="tablist">${bar}</div>${panels}</div>`
    }

    // Top navigation: title, the pages (a page holding tabs gets a dropdown of them), the menu's links, search
    const items = tabs.map((t, i) => {
      const button = `<button type="button" role="tab" class="jx-s-tabs__tab" data-tab="${slugs[i]}" aria-selected="${i === 0}">${label(t)}</button>`
      const children = t.children || []
      const first = children.findIndex(c => c.type === 'tab')
      if (first < 0) return button
      let last = first
      while (last < children.length && children[last].type === 'tab') last++
      const subs = children.slice(first, last)
      const subSlugs = this.tabSlugs(subs)
      const links = subs.map((sub, j) => `<a href="#${subSlugs[j]}">${esc(sub.properties?.title || 'Tab')}</a>`).join('')
      return `${button}<details class="jx-s-tabs__more"><summary aria-label="${esc(t.properties?.title || 'Tab')} pages"></summary><div class="jx-s-tabs__dropdown"><a class="is-overview" href="#${slugs[i]}">${esc(t.properties?.title || 'Tab')}</a>${links}</div></details>`
    }).join('')
    const extras = nav.menu ? String(nav.menu.properties?.items || '').split('\n').filter(l => l.trim()).map(l => {
      const [text, link] = cells(l.trim(), 2)
      const href = this.link(link)
      return `<a class="jx-s-tabs__extra" href="${esc(href || '#')}"${isExternal(href) ? ' rel="noopener" target="_blank"' : ''}>${esc(text || link)}</a>`
    }).join('') : ''
    const search = this.options.search ? '<button type="button" class="jx-s-tabs__search" data-jx-search aria-label="Search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>' : ''
    const brand = this.options.brand ? `<span class="jx-s-tabs__brand">${esc(this.options.brand)}</span>` : ''
    const toggle = `<button type="button" class="jx-s-tabs__navtoggle" aria-expanded="false">Menu</button>`
    return `<div class="jx-s-tabs jx-s-tabs--nav" data-jx-tabs><div class="jx-s-tabs__bar" role="tablist">${brand}${toggle}<div class="jx-s-tabs__pages">${items}</div><div class="jx-s-tabs__extras">${extras}${search}</div></div>${panels}</div>`
  }

  private menu(p: Record<string, any>): string {
    const top: { label: string; link: string; children: { label: string; link: string }[] }[] = []
    for (const raw of String(p.items || '').split('\n')) {
      if (!raw.trim()) continue
      const [label, link] = cells(raw.trim(), 2)
      const item = { label: label || link, link, children: [] as { label: string; link: string }[] }
      if (/^\s+/.test(raw) && top.length) top[top.length - 1].children.push(item)
      else top.push(item)
    }
    const a = (item: { label: string; link: string }, cls: string) => {
      const href = this.link(item.link)
      return `<a class="${cls}" href="${esc(href || '#')}"${isExternal(href) ? ' rel="noopener" target="_blank"' : ''}>${esc(item.label)}</a>`
    }
    const items = top.map(item => item.children.length
      ? `<li class="jx-s-menu__item has-children"><details><summary class="jx-s-menu__link">${esc(item.label)}</summary><ul class="jx-s-menu__dropdown">${item.link ? `<li>${a(item, 'jx-s-menu__sublink is-overview')}</li>` : ''}${item.children.map(c => `<li>${a(c, 'jx-s-menu__sublink')}</li>`).join('')}</ul></details></li>`
      : `<li class="jx-s-menu__item">${a(item, 'jx-s-menu__link')}</li>`).join('')
    return `<nav class="jx-s-menu"${p.title ? ` aria-label="${esc(p.title)}"` : ''}>${p.title ? `<span class="jx-s-menu__brand">${esc(p.title)}</span>` : ''}<ul class="jx-s-menu__list">${items}</ul></nav>`
  }
}

/** Block types that core knows but the static renderer does not; empty when the two agree. */
export function missingStaticTypes(): string[] {
  return (BLOCK_TYPES as readonly string[]).filter(t => !STATIC_BLOCK_TYPES.has(t))
}
