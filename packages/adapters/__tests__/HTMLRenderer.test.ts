/**
 * jotx 2.0 HTMLRenderer tests
 */

import { HTMLRenderer } from '../src/renderer/HTMLRenderer'
import { BlockNode } from '@jotx-labs/core'

describe('HTMLRenderer - jotx 2.0', () => {
  let renderer: HTMLRenderer

  beforeEach(() => {
    renderer = new HTMLRenderer()
  })

  describe('Text Blocks', () => {
    it('renders a level-1 heading', () => {
      const block: BlockNode = {
        id: 'block_1',
        type: 'heading',
        properties: { text: 'Hello World' },
        children: undefined
      }

      const html = renderer.renderBlock(block)
      expect(html).toBe('<h1>Hello World</h1>')
    })

    it('renders paragraph', () => {
      const block: BlockNode = {
        id: 'block_2',
        type: 'paragraph',
        properties: { text: 'This is a test.' },
        children: undefined
      }

      const html = renderer.renderBlock(block)
      expect(html).toBe('<p>This is a test.</p>')
    })

    it('renders quote', () => {
      const block: BlockNode = {
        id: 'block_3',
        type: 'quote',
        properties: { text: 'Quote text' },
        children: undefined
      }

      const html = renderer.renderBlock(block)
      expect(html).toBe('<blockquote><p>Quote text</p></blockquote>')
    })
  })

  describe('Code & Media Blocks', () => {
    it('renders code block with language', () => {
      const block: BlockNode = {
        id: 'block_4',
        type: 'code',
        properties: {
          language: 'typescript',
          text: 'const x = 1;'
        },
        children: undefined
      }

      const html = renderer.renderBlock(block)
      expect(html).toBe('<pre><code class="language-typescript">const x = 1;</code></pre>')
    })

    it('renders image', () => {
      const block: BlockNode = {
        id: 'block_5',
        type: 'image',
        properties: {
          src: 'test.jpg',
          alt: 'Test Image',
          width: 50,
          align: 'center'
        },
        children: undefined
      }

      const html = renderer.renderBlock(block)
      expect(html).toContain('src="test.jpg"')
      expect(html).toContain('alt="Test Image"')
      expect(html).toContain('width: 50%')
    })
  })

  describe('List Blocks', () => {
    it('renders bulleted list', () => {
      const block: BlockNode = {
        id: 'block_6',
        type: 'list',
        properties: { type: 'bulleted' },
        children: [
          {
            id: 'item_1',
            type: 'item' as any,
            properties: { text: 'First item' },
            children: undefined
          },
          {
            id: 'item_2',
            type: 'item' as any,
            properties: { text: 'Second item' },
            children: undefined
          }
        ]
      }

      const html = renderer.renderBlock(block)
      expect(html).toContain('<ul>')
      expect(html).toContain('<li>First item</li>')
      expect(html).toContain('<li>Second item</li>')
      expect(html).toContain('</ul>')
    })

    it('renders checklist', () => {
      const block: BlockNode = {
        id: 'block_7',
        type: 'checklist',
        properties: {},
        children: [
          {
            id: 'task_1',
            type: 'item' as any,
            properties: {
              text: 'Task 1',
              checked: 'true'
            },
            children: undefined
          },
          {
            id: 'task_2',
            type: 'item' as any,
            properties: {
              text: 'Task 2',
              checked: 'false'
            },
            children: undefined
          }
        ]
      }

      const html = renderer.renderBlock(block)
      expect(html).toContain('class="checklist"')
      expect(html).toContain('<input type="checkbox" checked disabled>')
      expect(html).toContain('<input type="checkbox"  disabled>')
      expect(html).toContain('Task 1')
      expect(html).toContain('Task 2')
    })
  })

  describe('Render multiple blocks', () => {
    it('renders array of blocks', () => {
      const blocks: BlockNode[] = [
        {
          id: 'block_1',
          type: 'heading',
          properties: { text: 'Title' },
          children: undefined
        },
        {
          id: 'block_2',
          type: 'paragraph',
          properties: { text: 'Content' },
          children: undefined
        }
      ]

      const html = renderer.render(blocks)
      expect(html).toContain('<h1>Title</h1>')
      expect(html).toContain('<p>Content</p>')
    })

    it('returns default message for empty blocks', () => {
      const html = renderer.render([])
      expect(html).toBe('<p>No content</p>')
    })
  })

  describe('HTML Escaping', () => {
    it('escapes HTML special characters', () => {
      const block: BlockNode = {
        id: 'block_8',
        type: 'paragraph',
        properties: { text: '<script>alert("xss")</script>' },
        children: undefined
      }

      const html = renderer.renderBlock(block)
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })
  })
})

