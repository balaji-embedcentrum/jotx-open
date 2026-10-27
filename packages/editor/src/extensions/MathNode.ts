import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { MathNodeView } from '../components/MathNodeView'

export const MathNode = Node.create({
  name: 'math',
  group: 'block',
  atom: true,
  isolating: true,
  defining: true,
  content: '', // Explicitly no content - prevents text from being stored inside

  addAttributes() {
    return {
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-title') || ''
      },
      src: {
        default: '',
        parseHTML: (element) => {
          const script = element.querySelector?.('script[data-role="math-src"]') as HTMLScriptElement | null
          const raw = script?.textContent || ''
          try {
            return JSON.parse(raw)
          } catch {
            return raw
          }
        }
      },
      display: {
        default: 'block',
        parseHTML: (element) => element.getAttribute('data-display') || 'block'
      },
      showSource: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-show-source') === 'true'
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const src = JSON.stringify((node.attrs.src || '').toString()).replace(/</g, '\\u003c')
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'math',
        'data-display': (node.attrs.display || 'block').toString(),
        'data-show-source': (node.attrs.showSource || false).toString()
      }),
      ['script', { type: 'application/json', 'data-role': 'math-src' }, src]
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView)
  }
})


