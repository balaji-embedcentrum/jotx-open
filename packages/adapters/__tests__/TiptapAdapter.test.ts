/**
 * jotx 2.0 TiptapAdapter tests
 */

import { TiptapAdapter } from '../src/editor/TiptapAdapter'
import { BlockNode } from '@jotx-labs/core'

describe('TiptapAdapter - jotx 2.0', () => {
  let adapter: TiptapAdapter

  beforeEach(() => {
    adapter = new TiptapAdapter()
  })

  describe('blockToTiptap - Reading from jotx 2.0', () => {
    it('converts heading1 with properties.text', () => {
      const block: BlockNode = {
        id: 'block_1',
        type: 'heading',
        properties: { text: 'Hello World', level: 1 },
        children: undefined
      }

      const result = adapter.blockToTiptap(block)

      expect(result).toEqual({
        type: 'heading',
        attrs: { level: 1, blockId: 'block_1' },
        content: [{ type: 'text', text: 'Hello World' }]
      })
    })

    it('converts paragraph with properties.text', () => {
      const block: BlockNode = {
        id: 'block_2',
        type: 'paragraph',
        properties: { text: 'This is a paragraph.' },
        children: undefined
      }

      const result = adapter.blockToTiptap(block)

      expect(result).toEqual({
        type: 'paragraph',
        attrs: { blockId: 'block_2' },
        content: [{ type: 'text', text: 'This is a paragraph.' }]
      })
    })

    it('converts code block with language and text', () => {
      const block: BlockNode = {
        id: 'block_3',
        type: 'code',
        properties: {
          language: 'typescript',
          text: 'const x = 1;'
        },
        children: undefined
      }

      const result = adapter.blockToTiptap(block)

      expect(result).toEqual({
        type: 'codeBlock',
        attrs: { language: 'typescript', blockId: 'block_3' },
        content: [{ type: 'text', text: 'const x = 1;' }]
      })
    })

    it('converts list with children array', () => {
      const block: BlockNode = {
        id: 'block_4',
        type: 'list',
        properties: { listtype: 'bulleted' },
        children: [
          {
            id: 'item_1',
            type: 'listitem',
            properties: { text: 'First item' },
            children: undefined
          },
          {
            id: 'item_2',
            type: 'listitem',
            properties: { text: 'Second item' },
            children: undefined
          }
        ]
      }

      const result = adapter.blockToTiptap(block)

      expect(result.type).toBe('bulletList')
      expect(result.content).toHaveLength(2)
      expect(result.content?.[0].type).toBe('listItem')
    })

    it('converts checklist with children array', () => {
      const block: BlockNode = {
        id: 'block_5',
        type: 'checklist',
        properties: {},
        children: [
          {
            id: 'task_1',
            type: 'taskitem',
            properties: {
              text: 'Task 1',
              checked: 'true'
            },
            children: undefined
          },
          {
            id: 'task_2',
            type: 'taskitem',
            properties: {
              text: 'Task 2',
              checked: 'false'
            },
            children: undefined
          }
        ]
      }

      const result = adapter.blockToTiptap(block)

      expect(result.type).toBe('taskList')
      expect(result.content).toHaveLength(2)
      expect(result.content?.[0].attrs?.checked).toBe(true)
      expect(result.content?.[1].attrs?.checked).toBe(false)
    })
  })

  describe('tiptapToBlock - Writing to jotx 2.0', () => {
    it('converts Tiptap heading to BlockNode with properties.text', () => {
      const node = {
        type: 'heading',
        attrs: { level: 1, blockId: 'block_1' },
        content: [{ type: 'text', text: 'Hello World' }]
      }

      const result = adapter.tiptapToBlock(node, 0)

      expect(result).toEqual({
        id: 'block_1',
        type: 'heading',
        properties: { text: 'Hello World', level: 1 },
        children: undefined
      })
    })

    it('converts Tiptap paragraph to BlockNode with properties.text', () => {
      const node = {
        type: 'paragraph',
        attrs: { blockId: 'block_1' },
        content: [{ type: 'text', text: 'Paragraph text' }]
      }

      const result = adapter.tiptapToBlock(node, 0)

      expect(result).toEqual({
        id: 'block_1',
        type: 'paragraph',
        properties: { text: 'Paragraph text' },
        children: undefined
      })
    })

    it('converts Tiptap bulletList to BlockNode with children', () => {
      const node = {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Item 1' }]
              }
            ]
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Item 2' }]
              }
            ]
          }
        ]
      }

      const result = adapter.tiptapToBlock(node, 0)

      expect(result.type).toBe('list')
      expect(result.properties?.listtype).toBe('bulleted')
      expect(result.children).toHaveLength(2)
      expect(result.children?.[0].properties?.text).toBe('Item 1')
      expect(result.children?.[1].properties?.text).toBe('Item 2')
    })

    it('converts Tiptap taskList to BlockNode with children', () => {
      const node = {
        type: 'taskList',
        content: [
          {
            type: 'taskItem',
            attrs: { checked: true },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Task 1' }]
              }
            ]
          },
          {
            type: 'taskItem',
            attrs: { checked: false },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Task 2' }]
              }
            ]
          }
        ]
      }

      const result = adapter.tiptapToBlock(node, 0)

      expect(result.type).toBe('checklist')
      expect(result.children).toHaveLength(2)
      expect(result.children?.[0].properties?.checked).toBe(true)
      expect(result.children?.[0].properties?.text).toBe('Task 1')
      expect(result.children?.[1].properties?.checked).toBe(false)
      expect(result.children?.[1].properties?.text).toBe('Task 2')
    })
  })

  describe('Round-trip conversion', () => {
    it('preserves text content in round-trip', () => {
      const original: BlockNode = {
        id: 'block_1',
        type: 'heading',
        properties: { text: 'Test Heading', level: 1 },
        children: undefined
      }

      const tiptap = adapter.blockToTiptap(original)
      const restored = adapter.tiptapToBlock(tiptap, 0)

      expect(restored.properties?.text).toBe('Test Heading')
    })

    it('preserves list structure in round-trip', () => {
      const original: BlockNode = {
        id: 'block_1',
        type: 'list',
        properties: { listtype: 'bulleted' },
        children: [
          {
            id: 'item_1',
            type: 'listitem',
            properties: { text: 'Item 1' },
            children: undefined
          }
        ]
      }

      const tiptap = adapter.blockToTiptap(original)
      const restored = adapter.tiptapToBlock(tiptap, 0)

      expect(restored.type).toBe('list')
      expect(restored.properties?.listtype).toBe('bulleted')
      expect(restored.children).toHaveLength(1)
      expect(restored.children?.[0].properties?.text).toBe('Item 1')
    })

    it('preserves NESTED list structure in round-trip', () => {
      const original: BlockNode = {
        id: 'block_1',
        type: 'list',
        properties: { listtype: 'bulleted' }, // Note: internal ast uses 'listtype' or 'type' depending on version, test uses 'type' above but TiptapAdapter uses 'listtype' in output
        children: [
          {
            id: 'item_1',
            type: 'listitem',
            properties: { text: 'Item 1' },
            children: [
              {
                id: 'block_nested',
                type: 'list',
                properties: { listtype: 'numbered' },
                children: [
                  {
                    id: 'item_2',
                    type: 'listitem',
                    properties: { text: 'Nested Item' },
                    children: undefined
                  }
                ]
              }
            ]
          }
        ]
      }

      const tiptap = adapter.blockToTiptap(original)
      const restored = adapter.tiptapToBlock(tiptap, 0)

      expect(restored.type).toBe('list')
      // Check first item
      const item1 = restored.children?.[0]
      expect(item1?.properties?.text).toBe('Item 1')
      expect(item1?.children).toBeDefined()
      expect(item1?.children).toHaveLength(1)

      // Check nested list
      const nestedList = item1?.children?.[0]
      expect(nestedList?.type).toBe('list')
      expect(nestedList?.properties?.listtype).toBe('numbered')

      // Check nested item
      const nestedItem = nestedList?.children?.[0]
      expect(nestedItem?.properties?.text).toBe('Nested Item')
    })

    it('correctly parses Tiptap nested lists without concatenation', () => {
      const tiptapNode: any = {
        type: 'bulletList',
        attrs: { blockId: 'list_1' },
        content: [
          {
            type: 'listItem',
            attrs: { blockId: 'item_1' },
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Parent' }] },
              {
                type: 'orderedList',
                attrs: { blockId: 'list_2' },
                content: [
                  {
                    type: 'listItem',
                    attrs: { blockId: 'item_2' },
                    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Child' }] }]
                  }
                ]
              }
            ]
          }
        ]
      }

      const result = adapter.tiptapToBlock(tiptapNode)

      const item1 = result.children?.[0]
      expect(item1?.properties?.text).toBe('Parent')
      expect(item1?.children).toBeDefined()
      expect(item1?.children).toHaveLength(1)
      expect(item1?.children?.[0].type).toBe('list')
      expect(item1?.children?.[0].children?.[0].properties?.text).toBe('Child')
    })
  })

  describe('blocksToTiptap and tiptapToBlocks', () => {
    it('converts array of BlockNodes to Tiptap document', () => {
      const blocks: BlockNode[] = [
        {
          id: 'block_1',
          type: 'heading',
          properties: { text: 'Title', level: 1 },
          children: undefined
        },
        {
          id: 'block_2',
          type: 'paragraph',
          properties: { text: 'Content' },
          children: undefined
        }
      ]

      const doc = {
        type: 'doc',
        content: blocks.map(b => adapter.blockToTiptap(b))
      }

      expect(doc.type).toBe('doc')
      expect(doc.content).toHaveLength(2)
      expect(doc.content[0].type).toBe('heading')
      expect(doc.content[1].type).toBe('paragraph')
    })

    it('converts Tiptap document to array of BlockNodes', () => {
      const doc = {
        type: 'doc' as const,
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Title' }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Content' }]
          }
        ]
      }

      const blocks = adapter.tiptapToBlocks(doc)

      expect(blocks).toHaveLength(2)
      expect(blocks[0].type).toBe('heading')
      expect(blocks[0].properties?.text).toBe('Title')
      expect(blocks[1].type).toBe('paragraph')
      expect(blocks[1].properties?.text).toBe('Content')
    })
  })

  describe('widgets and layout', () => {
    it('maps widget properties 1:1 to attributes and back, dropping empty values', () => {
      const block = { id: 'k1', type: 'kanban' as any, properties: { title: 'Sprint', board: '[Todo]\n- Ship' } }
      const node = adapter.blockToTiptap(block)
      expect(node).toEqual({ type: 'kanban', attrs: { blockId: 'k1', title: 'Sprint', board: '[Todo]\n- Ship' } })

      const back = adapter.tiptapToBlock({ ...node, attrs: { ...node.attrs, title: '' } })
      expect(back).toEqual({ id: 'k1', type: 'kanban', properties: { board: '[Todo]\n- Ship' }, children: undefined })
    })

    it('round-trips columns with a default width and at least one block per column', () => {
      const block = {
        id: 'cols', type: 'columns' as any, properties: {},
        children: [
          { id: 'a', type: 'column' as any, properties: {}, children: [] },
          { id: 'b', type: 'column' as any, properties: { width: '2' }, children: [{ id: 'p', type: 'paragraph' as any, properties: { text: 'Hi' } }] }
        ]
      }
      const node = adapter.blockToTiptap(block)
      expect(node.content![0].content).toEqual([{ type: 'paragraph', content: [] }])
      expect(node.content![1].attrs).toEqual({ width: '2', blockId: 'b' })

      const back = adapter.tiptapToBlock(node)
      expect(back.children!.map(c => [c.id, c.properties])).toEqual([['a', {}], ['b', { width: '2' }]])
    })
  })
})

