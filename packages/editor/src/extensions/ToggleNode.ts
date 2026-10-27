import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ToggleNodeView } from '../components/ToggleNodeView'

/**
 * Toggle block (collapsible container)
 *
 * HTML:
 * <div data-type="toggle" data-title="..." data-collapsed="true|false">
 *   <div data-role="toggle-content"> ...nested blocks... </div>
 * </div>
 */
export const ToggleNode = Node.create({
  name: 'toggle',

  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: 'Toggle',
        parseHTML: (element) => (element as HTMLElement).getAttribute('data-title') || 'Toggle'
      },
      collapsed: {
        default: false,
        parseHTML: (element) => ((element as HTMLElement).getAttribute('data-collapsed') || 'false') === 'true'
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="toggle"]',
        contentElement: 'div[data-role="toggle-content"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const title = ((HTMLAttributes as any).title || 'Toggle').toString()
    const collapsed = ((HTMLAttributes as any).collapsed ? 'true' : 'false').toString()
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'toggle',
        'data-title': title,
        'data-collapsed': collapsed
      }),
      ['div', { 'data-role': 'toggle-content' }, 0]
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleNodeView)
  }
})


