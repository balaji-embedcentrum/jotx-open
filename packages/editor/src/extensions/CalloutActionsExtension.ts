import { Extension } from '@tiptap/core'

function setVariant(editor: any, variant: 'info' | 'warning' | 'success' | 'danger'): boolean {
  const { state, view } = editor
  const { $from } = state.selection

  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (node.type?.name === 'callout') {
      const pos = $from.before(d)
      const tr = state.tr.setNodeMarkup(pos, undefined, { ...(node.attrs || {}), variant })
      view.dispatch(tr)
      editor.commands.focus()
      return true
    }
  }
  return false
}

export const CalloutActionsExtension = Extension.create({
  name: 'jotxCalloutActions',

  addKeyboardShortcuts() {
    return {
      // Wrap selection in a callout (info)
      'Mod-Shift-A': () => {
        try {
          return this.editor.chain().focus().wrapIn('callout', { variant: 'info' }).run()
        } catch {
          return false
        }
      },

      // Change callout variant (when cursor is inside a callout)
      'Mod-Alt-1': () => setVariant(this.editor, 'info'),
      'Mod-Alt-2': () => setVariant(this.editor, 'warning'),
      'Mod-Alt-3': () => setVariant(this.editor, 'success'),
      'Mod-Alt-4': () => setVariant(this.editor, 'danger')
    }
  }
})


