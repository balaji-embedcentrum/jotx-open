import { Node, mergeAttributes } from '@tiptap/core'

/**
 * Columns layout: a row of 2-4 columns, each holding regular blocks.
 *
 *   def columns c1
 *     def column left
 *       def paragraph p1
 *         text "..."
 *     def column right
 *       width "2"
 *       ...
 */
export const ColumnsNode = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column{2,4}',
  defining: true,
  isolating: true,
  draggable: true,

  addAttributes() {
    return {
      blockId: { default: null }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columns', class: 'jx-columns' }), 0]
  }
})

export const ColumnNode = Node.create({
  name: 'column',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      width: {
        default: '1',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-width') || '1',
        renderHTML: (attrs: Record<string, any>) => {
          const grow = Math.max(0.25, Math.min(4, parseFloat(attrs.width) || 1))
          return { 'data-width': attrs.width, style: `flex: ${grow} 1 0` }
        }
      },
      blockId: { default: null }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'jx-column' }), 0]
  }
})

/** Tiptap content for an empty n-column layout. */
export function columnsInsertContent(count: number) {
  return [
    {
      type: 'columns',
      content: Array.from({ length: count }, () => ({
        type: 'column',
        attrs: { width: '1' },
        content: [{ type: 'paragraph' }]
      }))
    },
    { type: 'paragraph' }
  ]
}
