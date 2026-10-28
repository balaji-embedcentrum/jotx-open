/**
 * Reading a site: site.jot for settings and the menu, every other .jot file as a page.
 *
 *   my-site/
 *     site.jot          title, url, description, logo, accent; a menu block; other blocks form the footer
 *     index.jot         the home page, at /
 *     guides/start.jot  a page at /guides/start/
 *
 * Folders and files starting with "." or "_" are skipped, as are pages with `draft true`.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { parseAndValidate, type BlockNode } from '@jotx-labs/core'

export interface SiteConfig {
  title: string
  url: string
  description: string
  logo: string
  accent: string
  language: string
  /** Where the jotx script for live diagrams and widgets comes from */
  script: string
  menu: string
  footer: BlockNode[]
}

export interface Page {
  /** Source path relative to the site folder, with forward slashes */
  file: string
  /** Address relative to the site base: '' for the home page, 'guides/start/' for a page */
  url: string
  id: string
  title: string
  description: string
  date: string
  tags: string[]
  order: number
  listing: string
  blocks: BlockNode[]
  source: string
}

export interface Site {
  root: string
  config: SiteConfig
  pages: Page[]
  /** Images, attachments and other files to copy, relative to the site folder */
  assets: string[]
  errors: string[]
}

const PAGE_EXT = /\.(jot|jotx|meet)$/i
const ASSET_EXT = /\.(png|jpe?g|gif|svg|webp|avif|ico|bmp|mp4|webm|mov|mp3|ogg|wav|pdf|zip|txt|csv|json|css|js|woff2?|ttf|otf)$/i
const SKIP_DIRS = new Set(['node_modules', '_site', 'dist', 'out'])

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v)).trim()

export function pageUrl(file: string): string {
  const noExt = file.replace(PAGE_EXT, '')
  if (noExt === 'index') return ''
  if (noExt.endsWith('/index')) return noExt.slice(0, -'index'.length)
  return `${noExt}/`
}

/** First heading's text and first paragraph's text, for pages without a title or description. */
function firstText(blocks: BlockNode[], type: string): string {
  for (const b of blocks) {
    if (b.type === type && b.properties?.text) return String(b.properties.text)
    if (b.children) {
      const found = firstText(b.children, type)
      if (found) return found
    }
  }
  return ''
}

const plain = (text: string) => text.replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/(\*\*|\*|~~|==)(.+?)\1/g, '$2').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

function summary(text: string, max = 180): string {
  const t = plain(text)
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : max).replace(/[,;:.\s]+$/, '')}…`
}

async function walk(root: string, dir: string, out: string[]) {
  for (const entry of await fs.readdir(path.join(root, dir), { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue
    const rel = dir ? `${dir}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(root, rel, out)
    } else if (entry.isFile()) out.push(rel)
  }
}

export async function loadSite(target: string, options: { drafts?: boolean } = {}): Promise<Site> {
  const errors: string[] = []
  const files: string[] = []
  // A single .jot file is a whole site: it becomes the home page
  const single = (await fs.stat(target)).isFile() ? path.basename(target) : null
  const root = single ? path.dirname(target) : target
  await walk(root, '', files)

  const config: SiteConfig = {
    title: path.basename(path.resolve(root)), url: '', description: '', logo: '', accent: '', language: 'en',
    script: '', menu: '', footer: []
  }

  if (files.includes('site.jot')) {
    const text = await fs.readFile(path.join(root, 'site.jot'), 'utf-8')
    const result = parseAndValidate(text)
    if (!result.isValid) {
      errors.push(...result.errors.filter(e => e.severity === 'error').map(e => `site.jot${e.line ? `:${e.line}` : ''}: ${e.message}`))
    } else {
      const meta = result.ast.document.metadata as Record<string, unknown>
      config.title = str(meta.title) || config.title
      config.url = str(meta.url)
      config.description = str(meta.description)
      config.logo = str(meta.logo)
      config.accent = str(meta.accent)
      config.language = str(meta.language) || 'en'
      config.script = str(meta.script)
      const blocks = result.ast.document.blocks
      const menu = blocks.find(b => b.type === 'menu')
      config.menu = menu ? str(menu.properties?.items) : ''
      config.footer = blocks.filter(b => b !== menu)
    }
  }

  const pages: Page[] = []
  const pageFiles = single ? [single] : files.filter(f => PAGE_EXT.test(f) && f !== 'site.jot').sort()
  for (const file of pageFiles) {
    const source = await fs.readFile(path.join(root, file), 'utf-8')
    const result = parseAndValidate(source)
    if (!result.isValid) {
      errors.push(...result.errors.filter(e => e.severity === 'error').map(e => `${file}${e.line ? `:${e.line}` : ''}: ${e.message}`))
      continue
    }
    const doc = result.ast.document
    const meta = doc.metadata as Record<string, unknown>
    if (str(meta.draft) === 'true' && !options.drafts) continue
    const blocks = doc.blocks
    const fallbackTitle = path.basename(file).replace(PAGE_EXT, '').replace(/[-_]+/g, ' ')
    // A one-file site without site.jot takes its settings from the note's own header
    if (single && !files.includes('site.jot')) {
      config.title = plain(str(meta.title)) || config.title
      for (const key of ['url', 'description', 'logo', 'accent', 'language', 'script'] as const) config[key] = str(meta[key]) || config[key]
    }
    pages.push({
      file,
      url: single ? '' : pageUrl(file),
      id: doc.id,
      title: plain(str(meta.title) || firstText(blocks, 'heading')) || fallbackTitle,
      description: str(meta.description) || summary(firstText(blocks, 'paragraph')),
      date: str(meta.date),
      tags: str(meta.tags).split(',').map(t => t.trim()).filter(Boolean),
      order: Number(str(meta.order)) || 0,
      listing: str(meta.listing),
      blocks,
      source
    })
  }

  return { root, config, pages, assets: files.filter(f => ASSET_EXT.test(f)), errors }
}
