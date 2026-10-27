import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { GridCardNodeView } from '../components/GridCardNodeView'

/**
 * Grid Card container node
 * Contains card children in a grid layout
 */
export const GridCardNode = Node.create({
    name: 'gridcard',

    group: 'block',
    content: 'card+',
    defining: true,
    isolating: true, // Treat as single unit for selection/deletion
    draggable: true, // Enable drag handle for the whole gridcard

    addAttributes() {
        return {
            layout: {
                default: '2x2'
            },
            blockId: {
                default: null
            }
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="gridcard"]',
                getAttrs: (node) => {
                    if (!(node instanceof HTMLElement)) return false
                    return {
                        layout: node.getAttribute('data-layout') || '2x2'
                    }
                }
            }
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'gridcard',
                'data-layout': HTMLAttributes.layout || '2x2'
            }),
            0
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(GridCardNodeView)
    }
})
