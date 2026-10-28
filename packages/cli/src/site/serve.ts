/**
 * `jotx site serve`: build the site into a temporary folder, serve it, and rebuild and reload
 * the browser whenever a file in the site changes.
 */

import * as fs from 'fs'
import * as http from 'http'
import * as os from 'os'
import * as path from 'path'
import { buildSite } from './build'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.jot': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.wasm': 'application/wasm', '.pf_meta': 'application/octet-stream'
}

const RELOAD = `<script>new EventSource('/__jotx_reload').onmessage = () => location.reload()</script>\n`

export async function serveSite(root: string, options: { port: number; drafts?: boolean; search?: boolean; script?: string }) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'jotx-site-'))
  const clients = new Set<http.ServerResponse>()

  const build = async () => {
    const started = Date.now()
    try {
      const result = await buildSite(root, { out, base: '/', drafts: options.drafts, search: options.search, script: options.script, headExtra: RELOAD })
      for (const w of result.warnings) console.warn(`  ! ${w}`)
      console.log(`✓ Built ${result.pages} ${result.pages === 1 ? 'page' : 'pages'} in ${Date.now() - started} ms`)
      return true
    } catch (e) {
      console.error(`✗ ${e instanceof Error ? e.message : e}`)
      return false
    }
  }

  await build()

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost')
    if (url.pathname === '/__jotx_reload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
      res.write(': connected\n\n')
      clients.add(res)
      req.on('close', () => clients.delete(res))
      return
    }
    let file = path.join(out, decodeURIComponent(url.pathname))
    if (!file.startsWith(out)) { res.writeHead(403); res.end(); return }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] })
      res.end(fs.existsSync(path.join(out, '404.html')) ? fs.readFileSync(path.join(out, '404.html')) : 'Not found')
      return
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    fs.createReadStream(file).pipe(res)
  })

  server.listen(options.port, () => {
    console.log(`\n  Preview at http://localhost:${options.port}  (Ctrl+C to stop)\n`)
  })

  // Rebuild once a burst of saves has settled
  let timer: NodeJS.Timeout | null = null
  const watched = fs.statSync(root).isFile() ? path.dirname(root) : root
  fs.watch(watched, { recursive: true }, (_event, name) => {
    if (!name || /(^|[\\/])(\.|_site|node_modules)/.test(String(name))) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(async () => {
      if (await build()) for (const c of clients) c.write('data: reload\n\n')
    }, 150)
  })

  const stop = () => {
    server.close()
    fs.rmSync(out, { recursive: true, force: true })
    process.exit(0)
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}
