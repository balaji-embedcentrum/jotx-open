
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CodeReferenceNodeView } from '../components/CodeReferenceNodeView'

export const CodeReferenceNode = Node.create({
    name: 'codeReference',
    group: 'block',
    content: 'text*',
    code: true,
    defining: true,
    whitespace: 'pre',

    addAttributes() {
        return {
            language: {
                default: 'typescript',
            },
            path: {
                default: '',
            },
            lines: {
                default: '',
            }
        }
    },

    parseHTML() {
        return [
            {
                tag: 'pre[data-type="codeReference"]',
                preserveWhitespace: 'full',
            }
        ]
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            'pre',
            mergeAttributes(HTMLAttributes, { 'data-type': 'codeReference' }),
            ['code', { class: `language-${node.attrs.language}` }, 0]
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(CodeReferenceNodeView)
    }
})
