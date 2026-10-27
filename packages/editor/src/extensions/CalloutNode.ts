import { Node, mergeAttributes } from '@tiptap/core'

/**
 * Callout block node
 * Renders as: <div data-type="callout" data-variant="info|warning|success|danger">...</div>
 */
export const CalloutNode = Node.create({
  name: 'callout',

  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'info'
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false
          return {
            variant: node.getAttribute('data-variant') || 'info'
          }
        }
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const variant = (HTMLAttributes as any).variant || 'info'
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        // ensure styling + serializer can read it reliably
        'data-type': 'callout',
        'data-variant': variant
      }),
      0
    ]
  }
})


