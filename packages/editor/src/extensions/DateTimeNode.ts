import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { DateTimeNodeView } from '../components/DateTimeNodeView'

export const DateTimeNode = Node.create({
  name: 'datetime',
  group: 'block',
  atom: true,
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      mode: {
        default: 'datetime',
        parseHTML: (el) => el.getAttribute('data-mode') || 'datetime'
      },
      value: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-value') || ''
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="datetime"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'datetime',
        'data-mode': (node.attrs.mode || 'datetime').toString(),
        'data-value': (node.attrs.value || '').toString()
      }),
      ['span', { 'data-role': 'datetime-label' }, (node.attrs.value || '').toString()]
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DateTimeNodeView)
  }
})


