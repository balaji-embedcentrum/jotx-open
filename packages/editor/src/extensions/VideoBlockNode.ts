/**
 * Video Block Node - YouTube or local video player
 * Supports YouTube embeds and HTML5 video with full controls
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { VideoBlockNodeView } from '../components/VideoBlockNodeView'

export const VideoBlockNode = Node.create({
  name: 'videoBlock',
  
  group: 'block',
  
  atom: true,
  
  draggable: true,
  
  addAttributes() {
    return {
      type: {
        default: 'youtube',
        parseHTML: element => element.getAttribute('data-type') || 'youtube'
      },
      url: {
        default: '',
        parseHTML: element => element.getAttribute('data-url') || ''
      },
      src: {
        default: '',
        parseHTML: element => element.getAttribute('data-src') || ''
      },
      title: {
        default: '',
        parseHTML: element => element.getAttribute('data-title') || ''
      },
      width: {
        default: 800,
        parseHTML: element => {
          const w = element.getAttribute('data-width')
          return w ? parseInt(w, 10) : 800
        }
      },
      height: {
        default: 450,
        parseHTML: element => {
          const h = element.getAttribute('data-height')
          return h ? parseInt(h, 10) : 450
        }
      },
      controls: {
        default: 'true',
        parseHTML: element => element.getAttribute('data-controls') || 'true'
      },
      autoplay: {
        default: 'false',
        parseHTML: element => element.getAttribute('data-autoplay') || 'false'
      },
      muted: {
        default: 'false',
        parseHTML: element => element.getAttribute('data-muted') || 'false'
      },
      loop: {
        default: 'false',
        parseHTML: element => element.getAttribute('data-loop') || 'false'
      }
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="video-block"]'
      }
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'video-block',
        'data-video-type': HTMLAttributes.type,
        'data-url': HTMLAttributes.url,
        'data-src': HTMLAttributes.src,
        'data-title': HTMLAttributes.title,
        'data-width': String(HTMLAttributes.width),
        'data-height': String(HTMLAttributes.height),
        'data-controls': HTMLAttributes.controls,
        'data-autoplay': HTMLAttributes.autoplay,
        'data-muted': HTMLAttributes.muted,
        'data-loop': HTMLAttributes.loop
      })
    ]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(VideoBlockNodeView)
  }
})

