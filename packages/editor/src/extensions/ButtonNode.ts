import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ButtonNodeView } from '../components/ButtonNodeView'

/**
 * Button node for navigation
 * Renders as a clickable button that navigates to linked file
 */
export const ButtonNode = Node.create({
    name: 'button',

    group: 'block',
    atom: true,       // Mark as atomic node - ensures onUpdate fires immediately
    isolating: true,  // Isolate from surrounding content

    addAttributes() {
        return {
            label: { default: '' },
            link: { default: '' },
            style: { default: 'primary' },
            align: { default: 'left' },
            blockId: { default: null },
            // CRITICAL: This attribute starts false and gets set to true on mount
            // This pattern (same as Mermaid/Math's showSource) ensures onUpdate fires
            _initialized: { default: false }
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="button"]',
                getAttrs: (node) => {
                    if (!(node instanceof HTMLElement)) return false
                    return {
                        label: node.getAttribute('data-label') || '',
                        link: node.getAttribute('data-link') || '',
                        style: node.getAttribute('data-style') || 'primary',
                        align: node.getAttribute('data-align') || 'left'
                    }
                }
            }
        ]
    },

    renderHTML({ node, HTMLAttributes }) {
        // Don't use 0 (content hole) for atom nodes - render actual content
        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'button',
                'data-label': (node.attrs.label || '').toString(),
                'data-link': (node.attrs.link || '').toString(),
                'data-style': (node.attrs.style || 'primary').toString(),
                'data-align': (node.attrs.align || 'left').toString()
            }),
            ['span', { 'data-role': 'button-label' }, (node.attrs.label || 'Button').toString()]
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(ButtonNodeView)
    }
})

