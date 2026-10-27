import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ButtonStripNodeView } from '../components/ButtonStripNodeView'

/**
 * ButtonStrip container node
 * Contains 1-3 button children in a horizontal flex layout
 * Width is distributed equally among buttons with gaps
 */
export const ButtonStripNode = Node.create({
    name: 'buttonstrip',

    group: 'block',
    content: 'button button button',  // EXACTLY 3 button children (user requirement)
    defining: true,
    isolating: true,         // Treat as single unit for selection/deletion
    draggable: true,         // Enable drag handle for the whole strip

    addAttributes() {
        return {
            blockId: {
                default: null
            },
            // Internal flag for initialization (same pattern as button)
            _initialized: {
                default: false
            }
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="buttonstrip"]',
            }
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'buttonstrip',
                class: 'buttonstrip-container'
            }),
            0  // Content hole for children
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(ButtonStripNodeView)
    }
})
