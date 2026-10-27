import CodeBlock from '@tiptap/extension-code-block'
import { mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CodeBlockNodeView } from '../components/CodeBlockNodeView'

/**
 * Code block with:
 * - persistent `language` attribute (roundtrips via <code class="language-...">)
 * - NodeView UI header (language selector + copy)
 */
export const CodeBlockNode = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: 'typescript',
        parseHTML: (element) => {
          // element is <pre>
          const code = (element as HTMLElement).querySelector?.('code') as HTMLElement | null
          const cls = (code?.getAttribute('class') || '').toString()
          const m = /language-([a-z0-9_-]+)/i.exec(cls)
          return (m && m[1]) || (element as HTMLElement).getAttribute?.('data-language') || 'typescript'
        },
        renderHTML: (attrs) => {
          const lang = (attrs as any).language || 'typescript'
          return { 'data-language': String(lang) }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'pre',
        // Important: Exclude codeReference nodes logic so this doesn't capture them
        getAttrs: (node) => (node as HTMLElement).getAttribute('data-type') !== 'codeReference' && null
      }
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const lang = ((node as any)?.attrs?.language || 'typescript').toString()
    return [
      'pre',
      mergeAttributes(HTMLAttributes, { 'data-language': lang }),
      ['code', { class: `language-${lang}` }, 0]
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView)
  }
})


