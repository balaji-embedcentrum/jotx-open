import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ChartNodeView } from '../components/ChartNodeView'

export const ChartNode = Node.create({
  name: 'chart',
  group: 'block',
  atom: true,
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-title') || ''
      },
      chartType: {
        default: 'bar',
        parseHTML: (element) => element.getAttribute('data-chart-type') || 'bar'
      },
      json: {
        default: '',
        parseHTML: (element) => {
          const script = element.querySelector?.('script[type="application/json"]') as HTMLScriptElement | null
          const raw = script?.textContent || ''
          // Auto-repair older saves where JSON was HTML-escaped into entities.
          return raw
            .replace(/&quot;/g, '"')
            .replace(/&#0?39;/g, "'")
            .replace(/&gt;/g, '>')
            .replace(/&lt;/g, '<')
            .replace(/&amp;/g, '&')
        }
      },
      showSource: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-show-source') === 'true'
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="chart"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'chart',
        'data-chart-type': (node.attrs.chartType || 'bar').toString(),
        'data-show-source': (node.attrs.showSource || false).toString()
      }),
      ['script', { type: 'application/json' }, (node.attrs.json || '').toString()]
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView)
  }
})


