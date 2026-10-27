import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { SectionNodeView } from '../components/SectionNodeView'

/**
 * Section block (collapsible container with title)
 *
 * HTML:
 * <div data-type="section" data-title="..." data-collapsed="true|false">
 *   <div data-role="section-content"> ...nested blocks... </div>
 * </div>
 */
export const SectionNode = Node.create({
  name: 'section',

  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: 'Section',
        parseHTML: (element) => (element as HTMLElement).getAttribute('data-title') || 'Section'
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
        tag: 'div[data-type="section"]',
        contentElement: 'div[data-role="section-content"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const title = ((HTMLAttributes as any).title || 'Section').toString()
    const collapsed = ((HTMLAttributes as any).collapsed ? 'true' : 'false').toString()
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'section',
        'data-title': title,
        'data-collapsed': collapsed
      }),
      ['div', { 'data-role': 'section-content' }, 0]
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(SectionNodeView)
  }
})


