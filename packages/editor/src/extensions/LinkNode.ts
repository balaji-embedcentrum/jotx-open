import { Node, mergeAttributes } from '@tiptap/core'

/**
 * Link block node - for standalone clickable link blocks
 * Different from inline link marks within paragraphs
 */
export const LinkNode = Node.create({
  name: 'linkBlock',
  
  group: 'block',
  
  content: 'inline*',
  
  defining: true,
  
  addAttributes() {
    return {
      href: {
        default: '',
        parseHTML: element => element.getAttribute('data-href'),
        renderHTML: attributes => {
          return {
            'data-href': attributes.href
          }
        }
      }
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'div[data-jotx-link]'
      }
    ]
  },
  
  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-jotx-link': 'true',
        class: 'jotx-link-block'
      }),
      [
        'a',
        {
          href: node.attrs.href,
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'jotx-link-block-anchor'
        },
        0
      ]
    ]
  }
})

