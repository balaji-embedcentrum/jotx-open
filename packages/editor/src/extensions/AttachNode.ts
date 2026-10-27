import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { AttachBlockNodeView } from '../components/AttachBlockNodeView'

/**
 * Attach block node
 * Renders as: <div data-type="attach" data-path="..."><p>Name</p></div>
 */
export const AttachNode = Node.create({
  name: 'attach',

  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      path: {
        default: ''
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="attach"]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false
          return {
            path: node.getAttribute('data-path') || ''
          }
        }
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'attach'
      }),
      0
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachBlockNodeView)
  }
})


