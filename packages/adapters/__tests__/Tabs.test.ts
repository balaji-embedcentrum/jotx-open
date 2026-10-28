/**
 * Tabs: consecutive tab blocks become one tabs node in the editor, and plain siblings again on save.
 */

import { TiptapAdapter } from '../src/editor/TiptapAdapter'
import { BlockNode } from '@jotx-labs/core'

const paragraph = (id: string, text: string): BlockNode => ({ id, type: 'paragraph', properties: { text }, children: undefined })
const tab = (id: string, title: string, children: BlockNode[], icon?: string): BlockNode => ({
  id,
  type: 'tab',
  properties: icon ? { title, icon } : { title },
  children
})

describe('Tabs', () => {
  const adapter = new TiptapAdapter()

  const blocks: BlockNode[] = [
    paragraph('p1', 'Above the tabs'),
    tab('t1', 'Overview', [paragraph('p2', 'First page')], '📋'),
    tab('t2', 'Install', [
      tab('t3', 'macOS', [paragraph('p3', 'brew install jotx')]),
      tab('t4', 'Linux', [paragraph('p4', 'Use npm')])
    ]),
    paragraph('p5', 'Between bars'),
    tab('t5', 'Second bar', [paragraph('p6', 'Alone')])
  ]

  it('groups consecutive tabs into one tab bar, and nested tabs into their own', () => {
    const nodes = adapter.blocksToTiptap(blocks)
    expect(nodes.map(n => n.type)).toEqual(['paragraph', 'tabs', 'paragraph', 'tabs'])
    expect(nodes[1].content!.map(t => t.attrs!.title)).toEqual(['Overview', 'Install'])
    expect(nodes[1].content![0].attrs!.icon).toBe('📋')
    expect(nodes[1].content![1].content![0].type).toBe('tabs')
    expect(nodes[1].content![1].content![0].content!.map(t => t.attrs!.title)).toEqual(['macOS', 'Linux'])
    expect(nodes[3].content!.length).toBe(1)
    expect(nodes[1].attrs).toEqual({})
  })

  it('saves tab bars back as plain sibling tabs, unchanged', () => {
    const doc = { type: 'doc' as const, content: adapter.blocksToTiptap(blocks) }
    expect(adapter.tiptapToBlocks(doc)).toEqual(blocks)
  })

  it('gives a tab converted on its own a tab bar', () => {
    const node = adapter.blockToTiptap(tab('t6', 'Solo', []))
    expect(node.type).toBe('tabs')
    expect(node.content![0].type).toBe('tab')
    // An empty tab still holds a paragraph to type in
    expect(node.content![0].content![0].type).toBe('paragraph')
  })
})
