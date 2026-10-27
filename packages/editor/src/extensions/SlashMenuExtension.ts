/**
 * Slash Menu Extension for Tiptap
 * Triggers slash menu on "/" character
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view'

export interface SlashMenuOptions {
  onOpen: (position: { x: number; y: number }, query: string) => void
  onClose: () => void
  onQueryChange: (query: string) => void
}

// Exported so the UI can read plugin state (e.g., delete "/query" after selection)
export const slashMenuPluginKey = new PluginKey('slashMenu')

export const SlashMenuExtension = Extension.create<SlashMenuOptions>({
  name: 'slashMenu',

  addOptions() {
    return {
      onOpen: () => {},
      onClose: () => {},
      onQueryChange: () => {}
    }
  },

  addProseMirrorPlugins() {
    const options = this.options
    const key = slashMenuPluginKey
    let viewRef: EditorView | null = null

    const isSlashDisabledInContext = (state: any): boolean => {
      const { selection } = state
      const { $from } = selection

      // Disable inside certain blocks where only plain text should be allowed
      const disabledParentNodes = new Set(['blockquote', 'codeBlock', 'callout', 'attach'])
      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d)
        if (disabledParentNodes.has(node.type?.name)) return true
      }

      // Disable when cursor is inside a link mark (link block should stay as text only)
      const marks = ([] as any[]).concat($from.marks?.() || [], state.storedMarks || [])
      if (marks.some((m) => m?.type?.name === 'link')) return true

      return false
    }

    return [
      new Plugin({
        key,

        state: {
          init() {
            return {
              active: false,
              range: null,
              query: ''
            }
          },

          apply(tr, prev, oldState, newState) {
            const { selection } = tr
            const { $from } = selection

            // Only support collapsed selection for slash trigger
            if (!selection.empty) {
              if (prev.active) options.onClose()
              return { active: false, range: null, query: '' }
            }

            // If the cursor is inside a block where slash commands are not allowed,
            // never open the menu ("/" should just be typed as normal text).
            if (isSlashDisabledInContext(newState)) {
              if (prev.active) options.onClose()
              return { active: false, range: null, query: '' }
            }

            // Text from start of the parent node up to cursor
            const parentText = $from.parent.textBetween(0, $from.parentOffset, '\n', '\n')
            const match = parentText.match(/\/([^\s]*)$/)

            if (match) {
              const query = match[1] || ''
              const from = $from.pos - match[0].length
              const to = $from.pos

              if (!prev.active || prev.query !== query) {
                options.onQueryChange(query)
              }

              if (!prev.active) {
                // Get cursor position for menu placement
                if (viewRef) {
                  const coords = viewRef.coordsAtPos(to)
                  options.onOpen({ x: coords.left, y: coords.bottom + 8 }, query)
                } else {
                  // Fallback: still open menu, position top-left-ish
                  options.onOpen({ x: 80, y: 80 }, query)
                }
              }

              return {
                active: true,
                range: { from, to },
                query
              }
            }

            // Close menu if no match
            if (prev.active) {
              options.onClose()
            }

            return {
              active: false,
              range: null,
              query: ''
            }
          }
        },

        view(view) {
          viewRef = view
          return {
            destroy() {
              viewRef = null
            }
          }
        },

        props: {
          handleKeyDown(view, event) {
            const { state } = view
            const pluginState = key.getState(state) as any

            // Don't handle if menu is not active
            if (!pluginState?.active) {
              return false
            }

            // Let slash menu handle arrow keys and enter
            if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) {
              return true
            }

            return false
          },

          decorations(state) {
            const pluginState = key.getState(state) as any

            if (!pluginState?.active || !pluginState.range) {
              return DecorationSet.empty
            }

            // Highlight the slash command text
            return DecorationSet.create(state.doc, [
              Decoration.inline(
                pluginState.range.from,
                pluginState.range.to,
                {
                  class: 'slash-command-active'
                }
              )
            ])
          }
        }
      })
    ]
  }
})

