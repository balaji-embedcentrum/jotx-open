import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { PreservedBlockView } from '../components/PreservedBlockView'

/**
 * A block the editor has no editing view for (a link card, or a block from a newer jotx).
 * It keeps the block exactly as written, as JSON in one attribute, so saving never loses it.
 */
export const PreservedBlockNode = Node.create({
  name: 'preservedBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      block: {
        default: '{}',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-block') || '{}',
        renderHTML: (attrs: Record<string, any>) => ({ 'data-block': attrs.block })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="preserved-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'preserved-block' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PreservedBlockView)
  }
})
