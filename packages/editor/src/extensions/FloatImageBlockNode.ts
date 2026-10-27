/**
 * Float Image Block Node - Floating image with text wrapping around
 * Supports upload, resize, caption, and float position (left/right)
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { FloatImageBlockNodeView } from '../components/FloatImageBlockNodeView'

export const FloatImageBlockNode = Node.create({
  name: 'floatImageBlock',
  
  group: 'block',
  
  // NOT atom - this is a CONTAINER that holds image + content
  content: 'block+',
  
  draggable: true,
  
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
        default: 400,
        parseHTML: element => {
          const w = element.getAttribute('data-width')
          return w ? parseInt(w, 10) : 400
        }
      },
      height: {
        default: 'auto',
        parseHTML: element => element.getAttribute('data-height') || 'auto'
      },
      float: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-float') || 'left'
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
        tag: 'div[data-type="float-image-block"]'
      }
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'float-image-block',
        'data-src': HTMLAttributes.src,
        'data-alt': HTMLAttributes.alt,
        'data-width': String(HTMLAttributes.width),
        'data-height': HTMLAttributes.height,
        'data-float': HTMLAttributes.float,
        'data-caption': HTMLAttributes.caption
      })
    ]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(FloatImageBlockNodeView)
  }
})

