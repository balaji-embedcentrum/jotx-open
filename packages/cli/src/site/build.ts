/**
 * `jotx site build`: a folder of .jot files becomes a static website.
 *
 * Every page is complete HTML, so it reads well without a script and search engines see
 * all of it. Pages with diagrams, charts, maths or widgets also load the jotx script, which
 * replaces the static version with the live view once it has drawn.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { VERSION, type BlockNode } from '@jotx-labs/core'
import { StaticRenderer, SCRIPTED_BLOCKS, slugify, siteNavStart } from '@jotx-labs/adapters'
import { loadSite, type Page, type Site } from './load'

export interface BuildOptions {
  out: string
  /** Address the site is served from, e.g. '/' or '/docs/'; defaults to the path of `url` in site.jot */
  base?: string
  drafts?: boolean
  search?: boolean
  /** Extra tags for every page's <head>, such as the live-reload script of `jotx site serve` */
  headExtra?: string
  /** Where the jotx script comes from, overriding `script` in site.jot */
  script?: string
}

export interface BuildResult {
  pages: number
  out: string
  warnings: string[]
  searchIndexed: boolean
}

const ASSETS_DIR = path.resolve(__dirname, '../../assets')

const esc = (value: unknown) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/')

const isExternal = (url: string) => /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')

function normalizeBase(base: string): string {
  let b = base.trim() || '/'
  if (!b.startsWith('/')) b = `/${b}`
  if (!b.endsWith('/')) b = `${b}/`
  return b
}

function needsScript(blocks: BlockNode[]): boolean {
  return blocks.some(b => SCRIPTED_BLOCKS.has(b.type) || (b.children ? needsScript(b.children) : false))
}

function formatDate(value: string): string {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return esc(value)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`
}

/** Pages listed newest first when they have dates, otherwise by order and title. */
function sortPages(pages: Page[]): Page[] {
  return [...pages].sort((a, b) =>
    (b.date || '').localeCompare(a.date || '') || a.order - b.order || a.title.localeCompare(b.title))
}

export async function buildSite(root: string, options: BuildOptions): Promise<BuildResult> {
  const site = await loadSite(root, { drafts: options.drafts })
  if (site.errors.length) {
    throw new Error(`The site has errors:\n${site.errors.map(e => `  ${e}`).join('\n')}`)
  }

  const out = path.resolve(options.out)
  const rootAbs = path.resolve(site.root)
  if (rootAbs === out || rootAbs.startsWith(out + path.sep)) throw new Error('The output folder cannot contain the site folder.')

  const siteUrl = site.config.url.replace(/\/+$/, '')
  let urlBase = '/'
  try { if (siteUrl) urlBase = new URL(`${siteUrl}/`).pathname } catch { /* not a full URL */ }
  const base = normalizeBase(options.base ?? urlBase)
  const absolute = (rel: string) => (siteUrl ? `${siteUrl.replace(new RegExp(`${base.replace(/\/$/, '')}$`), '')}${base}${rel}` : '')

  const warnings: string[] = []

  // Folders and the pages directly inside them; a folder's index.jot is the folder's own page
  const folders = new Map<string, Page[]>([['', []]])
  const addFolder = (dir: string) => {
    for (let d = dir; d && !folders.has(d); d = path.posix.dirname(d) === '.' ? '' : path.posix.dirname(d)) folders.set(d, [])
  }
  for (const p of site.pages) {
    const dir = path.posix.dirname(p.file) === '.' ? '' : path.posix.dirname(p.file)
    addFolder(dir)
    if (!/(^|\/)index\.(jot|jotx|meet)$/i.test(p.file)) folders.get(dir)!.push(p)
  }

  const byFile = new Map(site.pages.map(p => [p.file, p]))
  const byId = new Map(site.pages.map(p => [p.id, p]))
  const byStem = new Map(site.pages.map(p => [path.posix.basename(p.file).replace(/\.(jot|jotx|meet)$/i, ''), p]))

  // Links are written relative to the source file; published pages live one folder deeper
  const resolver = (fromFile: string) => {
    const dir = path.posix.dirname(fromFile)
    const target = (href: string) => {
      const [pathPart, hash = ''] = href.split('#')
      const rel = pathPart.startsWith('/') ? pathPart.slice(1) : path.posix.normalize(path.posix.join(dir === '.' ? '' : dir, pathPart))
      return { rel: rel === '.' ? '' : rel, hash: hash ? `#${hash}` : '' }
    }
    return {
      resolveLink: (href: string) => {
        if (!href || href.startsWith('#') || isExternal(href)) return href
        const { rel, hash } = target(href)
        if (/\.(jot|jotx|meet)$/i.test(rel)) {
          const page = byFile.get(rel)
          if (page) return `${base}${encodePath(page.url)}${hash}`
          // folder/index.jot of a folder without one: the generated folder page
          const folder = rel.replace(/(^|\/)index\.(jot|jotx|meet)$/i, '').replace(/\/$/, '')
          if (folder !== rel && folders.has(folder)) return `${base}${encodePath(folder ? `${folder}/` : '')}${hash}`
          warnings.push(`${fromFile}: link to ${href}, which is not a page in the site`)
          return `${base}${encodePath(rel)}${hash}`
        }
        return `${base}${encodePath(rel)}${hash}`
      },
      resolveMedia: (src: string) => (!src || isExternal(src) ? src : `${base}${encodePath(target(src).rel)}`),
      resolveRef: (_type: string, ref: string) => {
        const page = byId.get(ref) || byStem.get(ref) || byFile.get(ref)
        return page ? { href: `${base}${encodePath(page.url)}`, label: page.title } : null
      }
    }
  }

  const script = options.script || site.config.script || `https://cdn.jsdelivr.net/npm/@jotx-labs/embed@${VERSION}/dist/jotx.min.js`
  const scriptSrc = isExternal(script) ? script : `${base}${encodePath(script)}`
  const accent = /^#[0-9a-f]{3,8}$/i.test(site.config.accent) ? site.config.accent : ''
  const logo = site.config.logo ? (isExternal(site.config.logo) ? site.config.logo : `${base}${encodePath(site.config.logo)}`) : ''
  const hasTags = site.pages.some(p => p.tags.length)
  const search = options.search !== false

  // Menu: the one in site.jot, or the top-level pages and folders
  const folderName = (dir: string) => site.pages.find(p => p.url === `${dir}/`)?.title
    || path.posix.basename(dir).replace(/[-_]+/g, ' ').replace(/^./, c => c.toUpperCase())
  let menuItems = site.config.menu
  if (!menuItems) {
    const pages = (folders.get('') || []).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)).map(p => `${p.title} | ${p.file}`)
    const dirs = [...folders.keys()].filter(d => d && !d.includes('/')).sort().map(d => `${folderName(d)} | ${d}/index.jot`)
    menuItems = ['Home | index.jot', ...dirs, ...pages].join('\n')
  }
  const siteRenderer = new StaticRenderer(resolver('site.jot'))
  const menuHtml = siteRenderer.renderBlock({ id: 'menu', type: 'menu' as any, properties: { items: menuItems } })
  const footerHtml = site.config.footer.length ? siteRenderer.render(site.config.footer) : ''

  const layout = (page: { title: string; description: string; url: string; body: string; scripted?: boolean; jotFile?: string; noindex?: boolean; navPage?: boolean }) => {
    const fullTitle = page.url === '' || page.title === site.config.title ? site.config.title : `${page.title} · ${site.config.title}`
    const canonical = absolute(encodePath(page.url))
    const current = `${base}${encodePath(page.url)}`
    const nav = menuHtml.replace(new RegExp(`href="${current.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'), `href="${current}" aria-current="page"`)
    const main = page.scripted && page.jotFile
      ? `<jotx-doc src="${esc(base + encodePath(page.jotFile))}"><div class="jotx-static">${page.body}</div></jotx-doc>`
      : page.body
    return `<!doctype html>
<html lang="${esc(site.config.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
${page.description ? `<meta name="description" content="${esc(page.description)}">\n` : ''}${canonical ? `<link rel="canonical" href="${esc(canonical)}">\n` : ''}<meta property="og:title" content="${esc(page.title)}">
<meta property="og:site_name" content="${esc(site.config.title)}">
<meta property="og:type" content="${page.url ? 'article' : 'website'}">
${page.description ? `<meta property="og:description" content="${esc(page.description)}">\n` : ''}${canonical ? `<meta property="og:url" content="${esc(canonical)}">\n` : ''}${logo ? `<link rel="icon" href="${esc(logo)}">\n` : ''}${page.noindex ? '<meta name="robots" content="noindex">\n' : ''}<meta name="generator" content="jotx ${esc(VERSION)}">
<link rel="alternate" type="application/rss+xml" title="${esc(site.config.title)}" href="${base}feed.xml">
<link rel="stylesheet" href="${base}assets/jotx-site.css">
${accent ? `<style>:root{--site-accent:${accent}}@media (prefers-color-scheme:dark){:root{--site-accent-dark:color-mix(in srgb,${accent} 55%,#fff)}}</style>\n` : ''}${options.headExtra || ''}</head>
<body>
<a class="jx-skip" href="#main">Skip to content</a>
${page.navPage ? '' : `<header class="jx-site-header">
<div class="jx-site-wrap">
<a class="jx-site-brand" href="${base}">${logo ? `<img src="${esc(logo)}" alt="">` : ''}${esc(site.config.title)}</a>
<button type="button" class="jx-site-navtoggle" aria-expanded="false">Menu</button>
<div class="jx-site-nav">${nav}</div>
${search ? '<button type="button" class="jx-site-search" data-jx-search aria-label="Search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span>Search</span><kbd>/</kbd></button>' : ''}
</div>
</header>
`}<main id="main" class="jx-site-main${page.navPage ? ' is-navpage' : ''}">
<div class="jx-site-wrap">
<article class="jx-page"${page.noindex ? '' : ' data-pagefind-body'}>
${main}
</article>
</div>
</main>
<footer class="jx-site-footer">
<div class="jx-site-wrap">
${footerHtml}
<p class="jx-site-credit">Made with <a href="https://balaji-embedcentrum.github.io/jotx-open/">jotx</a></p>
</div>
</footer>
${search ? '<div class="jx-search" role="dialog" aria-modal="true" aria-label="Search"><div class="jx-search__panel"><div id="jx-search-ui"></div><p class="jx-search__empty">Loading search…</p></div></div>\n' : ''}<script src="${base}assets/jotx-site.js" data-base="${esc(base)}" defer></script>
${page.scripted ? `<script src="${esc(scriptSrc)}" defer></script>\n` : ''}</body>
</html>
`
  }

  // Pages as cards (newest first), sub-folders as links above them
  const listing = (pages: Page[], folders: { name: string; url: string; count: number }[] = []) => {
    if (!pages.length && !folders.length) return ''
    const folderItems = folders.length ? `<ul class="jx-listing">${folders.map(f => `<li class="is-folder"><a href="${base}${encodePath(f.url)}"><strong>${esc(f.name)}</strong><span>${f.count} ${f.count === 1 ? 'page' : 'pages'}</span></a></li>`).join('')}</ul>` : ''
    return folderItems + cards(sortPages(pages))
  }

  const cards = (pages: Page[]) => pages.length ? `<ul class="jx-cards">${pages.map(p => `<li><a class="jx-card" href="${base}${encodePath(p.url)}">${p.date ? `<time datetime="${esc(p.date)}">${formatDate(p.date)}</time>` : ''}<strong>${esc(p.title)}</strong>${p.description ? `<span>${esc(p.description)}</span>` : ''}${p.tags.length ? `<em>${p.tags.map(t => `<i>${esc(t)}</i>`).join('')}</em>` : ''}</a></li>`).join('')}</ul>` : ''

  // ---- Write ----
  await fs.rm(out, { recursive: true, force: true })
  await fs.mkdir(out, { recursive: true })
  const write = async (rel: string, content: string | Buffer) => {
    const file = path.join(out, rel)
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, content)
  }

  await write('assets/jotx-site.css', await fs.readFile(path.join(ASSETS_DIR, 'jotx-site.css')))
  await write('assets/jotx-site.js', await fs.readFile(path.join(ASSETS_DIR, 'jotx-site.js')))
  await write('.nojekyll', '')
  for (const asset of site.assets) await write(asset, await fs.readFile(path.join(site.root, asset)))

  const subfolders = (dir: string) => [...folders.keys()]
    .filter(f => f && (path.posix.dirname(f) === '.' ? '' : path.posix.dirname(f)) === dir)
    .map(f => ({ name: folderName(f), url: `${f}/`, count: (folders.get(f) || []).length }))

  // The newest dated pages anywhere in the site, for the home page
  const latest = sortPages(site.pages.filter(p => p.date && p.url !== '')).slice(0, 6)

  for (const page of site.pages) {
    // A page that starts with tabs is a one-file site: its tabs replace the site header
    const navPage = siteNavStart(page.blocks) >= 0
    const renderer = new StaticRenderer({ ...resolver(page.file), brand: navPage ? page.title : undefined, search })
    let body = renderer.render(page.blocks)
    const isIndex = /(^|\/)index\.(jot|jotx|meet)$/i.test(page.file)
    const dir = page.url.replace(/\/$/, '')
    if (page.url === '' && page.listing !== 'false' && latest.length) {
      body += `<h2 class="jx-latest">Latest</h2>${cards(latest)}`
    } else if (isIndex && page.url !== '' && page.listing !== 'false') {
      body += listing(folders.get(dir) || [], subfolders(dir))
    }
    if (page.date || page.tags.length) {
      body += `<footer class="jx-page-meta">${page.date ? `<time datetime="${esc(page.date)}">${formatDate(page.date)}</time>` : ''}${page.tags.map(t => `<a href="${base}tags/${encodeURIComponent(slugify(t))}/">${esc(t)}</a>`).join('')}</footer>`
    }
    await write(`${page.url}index.html`, layout({
      title: page.title, description: page.description, url: page.url, body,
      scripted: needsScript(page.blocks), jotFile: page.file, navPage
    }))
    // The source travels with the page: the jotx script reads it, and other sites can embed it
    await write(page.file, page.source)
  }

  // Folders without an index.jot get a page that lists what is inside
  for (const [dir, pages] of folders) {
    if (!dir || site.pages.some(p => p.url === `${dir}/`)) continue
    const name = folderName(dir)
    await write(`${dir}/index.html`, layout({ title: name, description: '', url: `${dir}/`, body: `<h1>${esc(name)}</h1>${listing(pages, subfolders(dir))}` }))
  }
  if (!site.pages.some(p => p.url === '')) {
    await write('index.html', layout({ title: site.config.title, description: site.config.description, url: '', body: `<h1>${esc(site.config.title)}</h1>${site.config.description ? `<p>${esc(site.config.description)}</p>` : ''}${listing(folders.get('') || [], subfolders(''))}` }))
  }

  // Tags
  if (hasTags) {
    const tags = new Map<string, { name: string; pages: Page[] }>()
    for (const p of site.pages) for (const t of p.tags) {
      const key = slugify(t)
      if (!tags.has(key)) tags.set(key, { name: t, pages: [] })
      tags.get(key)!.pages.push(p)
    }
    for (const [key, tag] of tags) {
      await write(`tags/${key}/index.html`, layout({ title: `Tagged ${tag.name}`, description: '', url: `tags/${key}/`, body: `<h1>${esc(tag.name)}</h1>${listing(tag.pages)}`, noindex: true }))
    }
    const all = [...tags.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name))
    await write('tags/index.html', layout({ title: 'Tags', description: '', url: 'tags/', noindex: true, body: `<h1>Tags</h1><ul class="jx-listing">${all.map(([k, t]) => `<li><a href="${base}tags/${encodeURIComponent(k)}/"><strong>${esc(t.name)}</strong><span>${t.pages.length} ${t.pages.length === 1 ? 'page' : 'pages'}</span></a></li>`).join('')}</ul>` }))
  }

  await write('404.html', layout({ title: 'Page not found', description: '', url: '404.html', noindex: true, body: `<h1>Page not found</h1><p>This page does not exist, or it has moved.</p><p class="jx-s-buttonrow"><a class="jx-s-button jx-s-button--primary" href="${base}">Go to the home page</a>${search ? ' <a class="jx-s-button jx-s-button--outline" href="#" data-jx-search>Search the site</a>' : ''}</p>` }))

  // Feed and sitemap need the site's address
  if (siteUrl) {
    const dated = sortPages(site.pages.filter(p => p.date)).slice(0, 30)
    const items = dated.map(p => {
      const link = absolute(encodePath(p.url))
      const d = new Date(p.date)
      return `<item><title>${esc(p.title)}</title><link>${esc(link)}</link><guid>${esc(link)}</guid>${isNaN(d.getTime()) ? '' : `<pubDate>${d.toUTCString()}</pubDate>`}${p.description ? `<description>${esc(p.description)}</description>` : ''}</item>`
    }).join('\n')
    await write('feed.xml', `<?xml version="1.0" encoding="utf-8"?>\n<rss version="2.0"><channel><title>${esc(site.config.title)}</title><link>${esc(absolute(''))}</link><description>${esc(site.config.description || site.config.title)}</description>\n${items}\n</channel></rss>\n`)
    const urls = site.pages.map(p => `<url><loc>${esc(absolute(encodePath(p.url)))}</loc>${p.date ? `<lastmod>${esc(p.date.slice(0, 10))}</lastmod>` : ''}</url>`).join('\n')
    await write('sitemap.xml', `<?xml version="1.0" encoding="utf-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
    await write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${absolute('sitemap.xml')}\n`)
  } else {
    warnings.push('No url is set (in site.jot, or in the header of a one-file site), so the RSS feed and sitemap were skipped')
  }

  let searchIndexed = false
  if (search) {
    try {
      // Pagefind is an ES module; a real dynamic import keeps the CLI's CommonJS build working
      const pagefind = await (new Function('m', 'return import(m)'))('pagefind')
      const { index } = await pagefind.createIndex({})
      await index.addDirectory({ path: out })
      await index.writeFiles({ outputPath: path.join(out, 'pagefind') })
      await pagefind.close()
      searchIndexed = true
    } catch (e) {
      warnings.push(`Search was not built: ${e instanceof Error ? e.message : e}`)
    }
  }

  return { pages: site.pages.length, out, warnings: [...new Set(warnings)], searchIndexed }
}

export type { Site }
