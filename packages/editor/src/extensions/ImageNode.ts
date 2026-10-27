import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'

/**
 * Image node with persistent original path.
 *
 * - `src` is what the browser actually loads (can be a webview URI).
 * - `dataSrc` is the canonical path we want to roundtrip into the text model.
 *
 * We render `data-src` so the extension host serializer can reliably persist it.
 */
export const ImageNode = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      dataSrc: {
        default: null,
        parseHTML: (element) => (element as HTMLElement).getAttribute('data-src')
      },
      width: {
        // percentage [10..100]
        default: 100,
        parseHTML: (element) => {
          const v = (element as HTMLElement).getAttribute('data-width') || ''
          const n = parseInt(v, 10)
          return Number.isFinite(n) ? n : 100
        }
      },
      align: {
        default: 'left',
        parseHTML: (element) => (element as HTMLElement).getAttribute('data-align') || 'left'
      }
    }
  },

  renderHTML({ HTMLAttributes }) {
    const dataSrc = (HTMLAttributes as any).dataSrc
    const width = (HTMLAttributes as any).width
    const align = (HTMLAttributes as any).align || 'left'

    const widthNum = typeof width === 'number' ? width : parseInt(String(width || ''), 10)
    const w = Number.isFinite(widthNum) ? Math.min(100, Math.max(10, widthNum)) : 100

    const styleParts: string[] = []
    // keep max-width via CSS, but set width explicitly for resizing
    styleParts.push(`width: ${w}%;`)
    styleParts.push('height: auto;')
    styleParts.push('display: block;')
    if (align === 'center') styleParts.push('margin-left: auto; margin-right: auto;')
    else if (align === 'right') styleParts.push('margin-left: auto; margin-right: 0;')
    else styleParts.push('margin-left: 0; margin-right: auto;')

    return [
      'img',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          'data-align': align,
          'data-width': String(w),
          style: styleParts.join(' ')
        },
        dataSrc ? { 'data-src': dataSrc } : {}
      )
    ]
  }
})


