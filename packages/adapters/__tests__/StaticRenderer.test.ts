/**
 * StaticRenderer: every block type renders, nothing from the document can run as code,
 * and links point at published pages.
 */

import { StaticRenderer, missingStaticTypes } from '../src/renderer/StaticRenderer'
import { BlockNode } from '@jotx-labs/core'

const block = (type: string, properties: Record<string, any> = {}, children?: BlockNode[]): BlockNode => ({ id: type, type: type as any, properties, children })

describe('StaticRenderer', () => {
  it('handles every block type core knows', () => {
    expect(missingStaticTypes()).toEqual([])
  })

  it('escapes text and drops unsafe links', () => {
    const r = new StaticRenderer()
    const html = r.render([
      block('paragraph', { text: '<img src=x onerror=alert(1)> [click](javascript:alert(2)) **bold**' }),
      block('link', { url: 'javascript:alert(3)', text: 'bad' }),
      block('card', { title: 'Card', link: 'data:text/html,<script>alert(4)</script>' }),
      block('palette', { colors: 'Bad | red;background:url(x)' })
    ])
    // Escaped text may mention these; what matters is that no tag or attribute carries them
    expect(html).not.toMatch(/<img|<script|href="(javascript|data):|<[^>]*\son\w+=|style="[^"]*url\(/)
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('<strong>bold</strong>')
  })

  it('rewrites links and media through the site resolvers', () => {
    const r = new StaticRenderer({
      resolveLink: href => href.replace(/\.jot$/, '/'),
      resolveMedia: src => `/notes/${src}`
    })
    const html = r.render([
      block('paragraph', { text: 'See [the guide](guide.jot)' }),
      block('image', { src: 'attachments/a.png', alt: 'A' })
    ])
    expect(html).toContain('href="guide/"')
    expect(html).toContain('src="/notes/attachments/a.png"')
  })

  it('renders consecutive tabs as one tab bar with every panel in the page', () => {
    const html = new StaticRenderer().render([
      block('tab', { title: 'Overview' }, [block('paragraph', { text: 'One' })]),
      block('tab', { title: 'Tasks', icon: '✅' }, [block('paragraph', { text: 'Two' })])
    ])
    expect(html.match(/data-jx-tabs/g)).toHaveLength(1)
    expect(html).toContain('data-tab="overview"')
    expect(html).toContain('data-tab="tasks"')
    expect(html).toContain('<p>One</p>')
    expect(html).toContain('<p>Two</p>')
  })

  it('gives headings anchors that a table of contents links to', () => {
    const html = new StaticRenderer().render([
      block('toc', { title: 'Contents' }),
      block('heading', { text: 'Getting **started**', level: 2 }),
      block('heading', { text: 'Getting started', level: 2 })
    ])
    expect(html).toContain('<h2 id="getting-started">')
    expect(html).toContain('<h2 id="getting-started-2">')
    expect(html).toContain('href="#getting-started"')
  })
})
