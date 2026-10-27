/**
 * Image Block Node - Regular image with text below
 * Supports upload, resize, caption, and alignment
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageBlockNodeView } from '../components/ImageBlockNodeView'
import { logger } from '../utils/logger'

export const ImageBlockNode = Node.create({
  name: 'imageBlock',

  group: 'block',

  atom: true,

  draggable: true,

  onCreate() {
    logger.log('🎨 ImageBlockNode extension CREATED')
  },

  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: element => element.getAttribute('data-src') || element.getAttribute('src') || ''
      },
      alt: {
        default: '',
        parseHTML: element => element.getAttribute('alt') || ''
      },
      width: {
        default: 800,
        parseHTML: element => {
          const w = element.getAttribute('data-width')
          return w ? parseInt(w, 10) : 800
        }
      },
      height: {
        default: 'auto',
        parseHTML: element => element.getAttribute('data-height') || 'auto'
      },
      align: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align') || 'center'
      },
      caption: {
        default: '',
        parseHTML: element => element.getAttribute('data-caption') || ''
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="image-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'image-block',
        'data-src': HTMLAttributes.src,
        'data-alt': HTMLAttributes.alt,
        'data-width': String(HTMLAttributes.width),
        'data-height': HTMLAttributes.height,
        'data-align': HTMLAttributes.align,
        'data-caption': HTMLAttributes.caption
      })
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockNodeView)
  }
})

