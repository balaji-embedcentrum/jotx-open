/**
 * @jotx-labs/embed — show .jot documents in any web page.
 *
 *   <script src="https://cdn.jsdelivr.net/npm/@jotx-labs/embed@3.1.4/dist/jotx.min.js"></script>
 *   <jotx-doc src="notes/plan.jot"></jotx-doc>
 *
 * or inline:
 *
 *   <jotx-doc>
 *     <script type="text/jot">
 *       def heading "Hello"
 *     </script>
 *   </jotx-doc>
 *
 * Documents render read-only with the same blocks and widgets as the jotx editor.
 */

import './host' // must come first: installs the host stand-in the editor expects
import { setNavigator } from './host'
import React from 'react'
import { createRoot, Root } from 'react-dom/client'
import { parse, validate } from '@jotx-labs/core'
import { registerStandardBlocks } from '@jotx-labs/standard-lib'
import { TiptapAdapter } from '@jotx-labs/adapters'
// Import only what the read-only view needs, so the graph view and other editor tools stay out of the bundle
import { JotxEditor } from '@jotx-labs/editor/components/JotxEditor'
import { EditorModeProvider } from '@jotx-labs/editor/contexts/EditorModeContext'
import './embed.css'

declare const __JOTX_VERSION__: string
export const version = __JOTX_VERSION__

registerStandardBlocks()
const adapter = new TiptapAdapter()

type Theme = 'auto' | 'light' | 'dark'

/** Remove the indentation an HTML author used around inline jot text. */
function dedent(text: string): string {
  const lines = text.replace(/^\s*\n/, '').replace(/\s+$/, '').split('\n')
  const indents = lines.filter(l => l.trim()).map(l => l.match(/^ */)![0].length)
  const cut = indents.length ? Math.min(...indents) : 0
  return lines.map(l => l.slice(cut)).join('\n')
}

/** Inline snippets may skip the header; give them one so the parser accepts them. */
function withHeader(text: string): string {
  return /^\s*hdef\s/.test(text) ? text : `hdef jotx inline\n\n${text}\n`
}

// Blocks whose src is a file to load. Mermaid and math keep their source code in src, so they are left alone.
const MEDIA_NODES = new Set(['image', 'imageBlock', 'floatImageBlock', 'videoBlock'])

/** Rewrite relative media paths so they load next to the .jot file, not the page. */
function resolveMedia(node: any, base: string) {
  if (!node || typeof node !== 'object') return
  const attrs = node.attrs
  if (MEDIA_NODES.has(node.type) && attrs && typeof attrs.src === 'string' && attrs.src && !/^(https?:|data:|blob:|\/\/)/i.test(attrs.src)) {
    try { attrs.src = new URL(attrs.src, base).href } catch { /* leave as is */ }
  }
  for (const child of node.content || []) resolveMedia(child, base)
}

export interface RenderResult {
  errors: { message: string; line?: number }[]
}

/** Parse jot text into the editor document; throws with a readable message on syntax errors. */
export function toDocument(text: string, base = document.baseURI) {
  const ast = parse(withHeader(text))
  const tiptapDoc = { type: 'doc', content: ast.document.blocks.map(b => adapter.blockToTiptap(b)) }
  resolveMedia(tiptapDoc, base)
  const errors = validate(ast.document).filter((e: any) => e.severity === 'error').map((e: any) => ({ message: e.message, line: e.line }))
  return { id: ast.document.id, title: ast.document.metadata?.title as string | undefined, tiptapDoc, errors }
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : null

export class JotxDocElement extends HTMLElement {
  static observedAttributes = ['src', 'theme']

  private root: Root | null = null
  private mount: HTMLDivElement | null = null
  private inlineText: string | null = null
  private loadToken = 0
  private onSchemeChange = () => this.applyTheme()

  /** URL of the loaded .jot file; relative links and media resolve against it. */
  get baseUrl(): string {
    const src = this.getAttribute('src')
    return src ? new URL(src, document.baseURI).href : document.baseURI
  }

  connectedCallback() {
    if (!this.mount && !this.getAttribute('src') && document.readyState === 'loading') {
      // When the script loads first, the element connects before the parser has added its inline text
      document.addEventListener('DOMContentLoaded', () => { if (this.isConnected) this.connectedCallback() }, { once: true })
      return
    }
    if (!this.mount) {
      // Inline source: <script type="text/jot"> keeps quotes and indentation intact
      const script = this.querySelector('script[type="text/jot"]')
      this.inlineText = script ? script.textContent || '' : (this.getAttribute('src') ? null : this.textContent || '')
      this.textContent = ''
      this.mount = document.createElement('div')
      this.mount.className = 'jotx-embed jx-scope'
      this.appendChild(this.mount)
      this.root = createRoot(this.mount)
      // Clicks decide which document "open file" links belong to
      this.addEventListener('pointerdown', () => { activeElement = this }, true)
    }
    media?.addEventListener?.('change', this.onSchemeChange)
    this.applyTheme()
    this.load()
  }

  disconnectedCallback() {
    media?.removeEventListener?.('change', this.onSchemeChange)
  }

  attributeChangedCallback(name: string, oldValue: string | null, value: string | null) {
    if (!this.mount || oldValue === value) return
    if (name === 'theme') this.applyTheme()
    if (name === 'src') { this.inlineText = null; this.load() }
  }

  /** Render jot text directly (replaces the current document). */
  setText(text: string) {
    this.removeAttribute('src')
    this.inlineText = text
    this.load()
  }

  private applyTheme() {
    if (this.mount) this.mount.dataset.theme = resolveTheme((this.getAttribute('theme') as Theme) || 'auto')
  }

  private async load() {
    const token = ++this.loadToken
    const src = this.getAttribute('src')
    let text = this.inlineText
    if (src) {
      this.renderMessage('Loading…')
      try {
        const res = await fetch(this.baseUrl)
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`.trim())
        text = await res.text()
      } catch (e) {
        if (token === this.loadToken) this.renderMessage(`Could not load ${src}: ${e instanceof Error ? e.message : e}`, true)
        return
      }
    }
    if (token !== this.loadToken) return
    this.renderText(dedent(text || ''))
  }

  private renderText(text: string) {
    let doc
    try {
      doc = toDocument(text, this.baseUrl)
    } catch (e) {
      this.renderMessage(`This document could not be read. ${e instanceof Error ? e.message : e}`, true)
      return
    }
    this.dispatchEvent(new CustomEvent('jotx:load', { detail: { title: doc.title, errors: doc.errors } }))
    this.root!.render(
      <RenderGuard key={`${this.loadToken}`}>
        <EditorModeProvider initialMode="preview">
          <JotxEditor
            documentId={doc.id}
            documentType="page"
            tiptapDoc={doc.tiptapDoc}
            ribbonExpanded={false}
            outline={this.hasAttribute('outline')}
          />
        </EditorModeProvider>
      </RenderGuard>
    )
  }

  private renderMessage(message: string, isError = false) {
    this.root!.render(<div className={`jotx-embed-message${isError ? ' is-error' : ''}`} role={isError ? 'alert' : 'status'}>{message}</div>)
  }
}

/**
 * Without this, an exception in any block unmounts the whole document and leaves an empty
 * space. A failure that depends on timing gets one fresh attempt; after that, show the error
 * and the component it came from, so readers and authors can see what went wrong.
 */
class RenderGuard extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; where: string; attempt: number }
> {
  state = { error: null as Error | null, where: '', attempt: 0 }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[jotx] The document could not be shown:', error, info.componentStack)
    const where = /at (\w+)/.exec(info.componentStack || '')?.[1] || ''
    if (this.state.attempt === 0) {
      // Remount the whole document once, on a clean tick
      setTimeout(() => this.setState({ error: null, where: '', attempt: 1 }), 50)
    } else {
      this.setState({ where })
    }
  }

  render() {
    const { error, where, attempt } = this.state
    if (!error) return <React.Fragment key={attempt}>{this.props.children}</React.Fragment>
    if (attempt === 0) return null
    return (
      <div className="jotx-embed-message is-error" role="alert">
        This document could not be shown in this browser. {error.message}
        {where && ` (in ${where})`}
      </div>
    )
  }
}

// Links to other .jot files open in the same element unless the page handles jotx:navigate
let activeElement: JotxDocElement | null = null
setNavigator(path => {
  const el = activeElement || document.querySelector<JotxDocElement>('jotx-doc')
  if (!el) return
  let target: URL
  try { target = new URL(path, el.baseUrl) } catch { return }
  // Only web links: javascript:, data: and other schemes are never followed
  if (target.protocol !== 'https:' && target.protocol !== 'http:') return
  const url = target.href
  if (!/\.(jot|jotx|meet)$/i.test(target.pathname)) {
    // An ordinary web page: same-site links navigate, other sites open in a new tab
    if (target.origin === location.origin) location.assign(url)
    else window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  const event = new CustomEvent('jotx:navigate', { detail: { url }, bubbles: true, cancelable: true })
  if (el.dispatchEvent(event)) el.setAttribute('src', url)
})

if (typeof customElements !== 'undefined' && !customElements.get('jotx-doc')) {
  customElements.define('jotx-doc', JotxDocElement)
}
