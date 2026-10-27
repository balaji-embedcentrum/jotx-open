import { Table } from '@tiptap/extension-table'

/**
 * JotxTable
 * Extends Tiptap Table node to persist view state (sort/filter) via data attributes.
 *
 * NOTE: We intentionally keep this minimal and stringly typed so it roundtrips through:
 * ProseMirror attrs -> HTML <table data-*> -> NoteEditorProvider serializer -> .jot text model.
 */
export const JotxTable = Table.extend({
  addAttributes() {
    const parentAttrs = (this.parent?.() as Record<string, any>) || {}
    return {
      ...parentAttrs,
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-jotx-title'),
        renderHTML: (attrs) => (attrs.title ? { 'data-jotx-title': String(attrs.title) } : {})
      },
      jotxFilter: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-jotx-filter'),
        renderHTML: (attrs) => (attrs.jotxFilter ? { 'data-jotx-filter': String(attrs.jotxFilter) } : {})
      },
      jotxFilterCol: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-jotx-filter-col'),
        renderHTML: (attrs) =>
          attrs.jotxFilterCol != null ? { 'data-jotx-filter-col': String(attrs.jotxFilterCol) } : {}
      },
      jotxSort: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-jotx-sort'),
        renderHTML: (attrs) => (attrs.jotxSort ? { 'data-jotx-sort': String(attrs.jotxSort) } : {})
      }
    }
  }
})


