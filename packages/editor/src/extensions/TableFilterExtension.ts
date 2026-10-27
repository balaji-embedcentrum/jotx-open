import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const tableFilterPluginKey = new PluginKey('jotxTableFilter')

function norm(s: string) {
  return (s || '').toLowerCase().trim()
}

function getCellText(cellNode: any): string {
  let out = ''
  cellNode.descendants((n: any) => {
    if (n.isText && typeof n.text === 'string') out += n.text
    out += ' '
    return true
  })
  return out.trim()
}

/**
 * TableFilterExtension
 * - Reads <table> attrs: data-jotx-filter, data-jotx-filter-col
 * - Hides rows that don't match by applying a node decoration on the row.
 *
 * This is a "view" feature: it does NOT delete rows, so content is preserved.
 */
export const TableFilterExtension = Extension.create({
  name: 'jotxTableFilter',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: tableFilterPluginKey,
        props: {
          decorations: (state) => {
            const decos: Decoration[] = []

            state.doc.descendants((node, pos) => {
              if (node.type?.name !== 'table') return true

              const filter = norm(String(node.attrs?.jotxFilter || ''))
              if (!filter) return true

              const filterColRaw = node.attrs?.jotxFilterCol
              const filterCol = filterColRaw == null || filterColRaw === '' ? null : Number(filterColRaw)

              // table -> tableRow*
              node.forEach((rowNode: any, rowOffset: number, rowIndex: number) => {
                // Keep header row always visible
                if (rowIndex === 0) return

                let hay = ''
                if (typeof filterCol === 'number' && Number.isFinite(filterCol) && filterCol >= 0) {
                  const cellNode = rowNode.childCount > filterCol ? rowNode.child(filterCol) : null
                  hay = cellNode ? getCellText(cellNode) : ''
                } else {
                  hay = getCellText(rowNode)
                }

                const matches = norm(hay).includes(filter)
                if (!matches) {
                  const rowPos = pos + 1 + rowOffset // +1 steps into the table node
                  decos.push(
                    Decoration.node(rowPos, rowPos + rowNode.nodeSize, {
                      style: 'display: none;'
                    })
                  )
                }
              })

              return true
            })

            return DecorationSet.create(state.doc, decos)
          }
        }
      })
    ]
  }
})


