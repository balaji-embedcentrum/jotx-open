import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { TabsNodeView } from '../components/TabsNodeView'

/**
 * Tabs: a tab bar over consecutive tab blocks.
 *
 * In .jot files tabs are plain siblings; the adapter wraps neighbours in one tabs node:
 *
 *   def tab "Overview"
 *     def paragraph "..."
 *   def tab "Tasks"
 *     def kanban "Sprint 12"
 *
 * The node view draws the bar and marks the open tab; CSS hides the others, so every tab
 * stays ordinary editable content.
 */
export const TabsNode = Node.create({
  name: 'tabs',
  group: 'block',
  content: 'tab+',
  defining: true,
  isolating: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="tabs"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'tabs', class: 'jx-tabs' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TabsNodeView)
  }
})

export const TabNode = Node.create({
  name: 'tab',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: 'Tab',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-title') || 'Tab',
        renderHTML: (attrs: Record<string, any>) => ({ 'data-title': attrs.title })
      },
      icon: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-icon') || '',
        renderHTML: (attrs: Record<string, any>) => (attrs.icon ? { 'data-icon': attrs.icon } : {})
      },
      blockId: { default: null }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="tab"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'tab', class: 'jx-tab', role: 'tabpanel' }), 0]
  }
})

/** Tiptap content for a new tab bar with two empty tabs. */
export function tabsInsertContent() {
  const tab = (title: string) => ({ type: 'tab', attrs: { title }, content: [{ type: 'paragraph' }] })
  return [{ type: 'tabs', content: [tab('First tab'), tab('Second tab')] }, { type: 'paragraph' }]
}

/** URL-friendly name of a tab, used for links such as #tasks. */
export function tabSlug(title: string): string {
  return title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tab'
}
