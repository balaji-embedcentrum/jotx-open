import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { JotxLinkNodeView } from '../components/JotxLinkNodeView'

export const JotxLinkNode = Node.create({
    name: 'jotxlink',
    group: 'block',
    atom: true,
    isolating: true,
    defining: true,

    addAttributes() {
        return {
            refType: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-ref-type') || ''
            },
            refId: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-ref-id') || ''
            }
        }
    },

    parseHTML() {
        return [{ tag: 'div[data-type="jotxlink"]' }]
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'jotxlink',
                'data-ref-type': node.attrs.refType || '',
                'data-ref-id': node.attrs.refId || ''
            }),
            ['span', {}, `${node.attrs.refType || 'ref'} ${node.attrs.refId || ''}`]
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(JotxLinkNodeView)
    }
})
