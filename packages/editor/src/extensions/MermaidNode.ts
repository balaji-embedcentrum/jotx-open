import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { MermaidNodeView } from '../components/MermaidNodeView'

export const MermaidNode = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-title') || ''
      },
      src: {
        default: '',
        parseHTML: (element) => {
          const script = element.querySelector?.('script[data-role="mermaid-src"]') as HTMLScriptElement | null
          if (script?.textContent) {
            const raw = script.textContent
            try {
              return JSON.parse(raw)
            } catch {
              return raw
            }
          }
          const code = element.querySelector?.('code') as HTMLElement | null
          return code?.textContent || ''
        }
      },
      showSource: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-show-source') === 'true'
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaid"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'mermaid',
        'data-show-source': (node.attrs.showSource || false).toString()
      }),
      ['script', { type: 'application/json', 'data-role': 'mermaid-src' }, JSON.stringify((node.attrs.src || '').toString()).replace(/</g, '\\u003c')]
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView)
  }
})


