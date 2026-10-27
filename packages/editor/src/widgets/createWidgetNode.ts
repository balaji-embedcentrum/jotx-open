import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { makeWidgetNodeView } from './WidgetFrame'
import type { WidgetSpec } from './types'

/**
 * Build the Tiptap node for a widget spec. Attributes are mirrored to
 * data-* attributes so widgets survive copy/paste between notes.
 */
export function createWidgetNode(spec: WidgetSpec) {
  return Node.create({
    name: spec.name,
    group: 'block',
    atom: true,
    selectable: true,
    draggable: true,

    addAttributes() {
      const attrs: Record<string, any> = {
        blockId: { default: null }
      }
      // Attributes default to empty: a property missing from the file stays missing.
      // spec.defaults is sample content used only when inserting from the slash menu.
      for (const key of Object.keys(spec.defaults)) {
        attrs[key] = {
          default: '',
          parseHTML: (el: HTMLElement) => el.getAttribute(`data-${key}`) ?? '',
          renderHTML: (a: Record<string, any>) => (a[key] ? { [`data-${key}`]: a[key] } : {})
        }
      }
      return attrs
    },

    parseHTML() {
      return [{ tag: `div[data-widget="${spec.name}"]` }]
    },

    renderHTML({ HTMLAttributes }) {
      return ['div', mergeAttributes(HTMLAttributes, { 'data-widget': spec.name })]
    },

    addNodeView() {
      return ReactNodeViewRenderer(makeWidgetNodeView(spec))
    }
  })
}
