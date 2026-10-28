/**
 * Opening a note in the editor and saving it must keep everything the note shows.
 * These are the classic-syntax shapes older notes use, which earlier versions lost on save.
 */

import { TiptapAdapter } from '../src/editor/TiptapAdapter'
import { StaticRenderer } from '../src/renderer/StaticRenderer'
import { BlockNode } from '@jotx-labs/core'

const b = (type: string, properties: Record<string, any> = {}, children?: BlockNode[]): BlockNode => ({ id: `${type}_${Math.random().toString(36).slice(2, 8)}`, type: type as any, properties, children })

function roundTrip(blocks: BlockNode[]): BlockNode[] {
  const adapter = new TiptapAdapter()
  return adapter.tiptapToBlocks({ type: 'doc', content: adapter.blocksToTiptap(blocks) })
}

const shown = (blocks: BlockNode[]) => new StaticRenderer().render(blocks)

describe('Load and save keep what a note shows', () => {
  it('keeps table titles, header cells, text cells and spans', () => {
    const table = b('table', { title: 'Risks' }, [
      b('row', {}, [b('header', { text: 'Sprint' }), b('header', { text: 'Owner, team' })]),
      b('row', {}, [b('cell', { text: 'Data loss' }), b('cell', { colspan: '2' }, [b('paragraph', { text: 'Marco' })])])
    ])
    const after = roundTrip([table])
    expect(shown(after)).toBe(shown([table]))
    expect(after[0].properties.title).toBe('Risks')
    expect(after[0].children![0].children![0].type).toBe('header')
    expect(after[0].children![1].children![1].properties.colspan).toBe('2')
  })

  it('keeps column names exactly as written', () => {
    const table = b('table', { columns: 'iPhone, eBay' }, [b('row', {}, [b('cell', { text: 'a' }), b('cell', { text: 'b' })])])
    expect(roundTrip([table])[0].properties.columns).toBe('iPhone, eBay')
  })

  it('keeps ticks and priorities of checklist items written as listitem', () => {
    const list = b('checklist', {}, [b('listitem', { text: 'Ship', checked: 'true', priority: 'high' }), b('listitem', { text: 'Docs', checked: false })])
    const after = roundTrip([list])
    expect(shown(after)).toBe(shown([list]))
    expect(after[0].children!.map(c => [c.properties.checked, c.properties.priority])).toEqual([[true, 'high'], [false, undefined]])
  })

  it('keeps true/false settings whether written as booleans or text', () => {
    const after = roundTrip([
      b('mermaid', { title: 'Flow', src: 'flowchart LR\n  A --> B', showsource: true }),
      b('toggle', { title: 'More', collapsed: false }, [b('paragraph', { text: 'Hidden' })])
    ])
    expect(after[0].properties.showsource).toBe(true)
    expect(after[1].properties.collapsed).toBe(false)
  })

  it('never saves the local folder behind an image VS Code is showing', () => {
    const adapter = new TiptapAdapter()
    const shownInVsCode = 'https://file%2B.vscode-resource.vscode-cdn.net/Users/someone/notes/attachments/logo%20v2.svg'
    const saved = adapter.tiptapToBlocks({ type: 'doc', content: [{ type: 'imageBlock', attrs: { src: shownInVsCode, alt: 'Logo' } }] })
    expect(saved[0].properties.src).toBe('attachments/logo v2.svg')
  })

  it('keeps blocks the editor cannot edit (link cards, blocks from a newer jotx) exactly as written', () => {
    const blocks = [
      b('linkcard', { url: 'https://jotx.dev', title: 'jotx', description: 'Notes', sitename: 'jotx.dev' }),
      b('custom', { customtype: 'poll', question: 'Ship it?', options: 'Yes\nNo' }, [b('paragraph', { text: 'Inside' })])
    ]
    expect(roundTrip(blocks)).toEqual(blocks)
  })

  it('keeps a toggle closed and a section open when the file does not say', () => {
    const after = roundTrip([b('toggle', { title: 'More' }, [b('paragraph', { text: 'x' })]), b('section', { title: 'Part' }, [b('paragraph', { text: 'y' })])])
    expect(after[0].properties).toEqual({ title: 'More' })
    expect(after[1].properties).toEqual({ title: 'Part' })
  })

  it('does not write default values into the file', () => {
    const after = roundTrip([b('image', { src: 'a.png', alt: 'A' }), b('video', { src: 'https://youtu.be/abcdefg' })])
    expect(after[0].properties.height).toBeUndefined()
    expect(after[1].properties).not.toHaveProperty('controls')
    expect(after[1].properties).not.toHaveProperty('autoplay')
  })
})
