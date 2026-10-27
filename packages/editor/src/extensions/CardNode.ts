import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CardNodeView } from '../components/CardNodeView'

/**
 * Card node - child of GridCard
 * Contains title, value, icon, color, link
 */
export const CardNode = Node.create({
    name: 'card',

    // NOT in 'block' group - cards are only children of gridcard, not standalone
    content: '',
    defining: false,
    selectable: false, // Don't allow individual card selection
    draggable: false,  // Cards can't be dragged individually

    addAttributes() {
        return {
            title: { default: '' },
            value: { default: '' },
            icon: { default: '' },
            color: { default: 'teal' },
            link: { default: '' },
            blockId: { default: null }
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="card"]',
                getAttrs: (node) => {
                    if (!(node instanceof HTMLElement)) return false
                    return {
                        title: node.getAttribute('data-title') || '',
                        value: node.getAttribute('data-value') || '',
                        icon: node.getAttribute('data-icon') || '',
                        color: node.getAttribute('data-color') || 'teal',
                        link: node.getAttribute('data-link') || ''
                    }
                }
            }
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'card',
                'data-title': HTMLAttributes.title || '',
                'data-value': HTMLAttributes.value || '',
                'data-icon': HTMLAttributes.icon || '',
                'data-color': HTMLAttributes.color || 'teal',
                'data-link': HTMLAttributes.link || ''
            }),
            0
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(CardNodeView)
    }
})
