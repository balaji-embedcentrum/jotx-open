/**
 * Build the GitHub Pages site into _site/
 *
 *   site/            pages, home.jot and assets
 *   embed/           packages/embed/dist (jotx.min.js and its lazy chunks)
 *   examples/        the help files, examples and templates that ship with the extension
 *
 * Usage (after npm run build:embed):
 *   node scripts/build-site.js
 */

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const out = path.join(root, '_site')
const embedDist = path.join(root, 'packages/embed/dist')

if (!fs.existsSync(path.join(embedDist, 'jotx.min.js'))) {
  console.error('❌ packages/embed/dist is missing. Run npm run build:embed first.')
  process.exit(1)
}

fs.rmSync(out, { recursive: true, force: true })
fs.cpSync(path.join(root, 'site'), out, { recursive: true })
fs.cpSync(embedDist, path.join(out, 'embed'), { recursive: true })
fs.copyFileSync(path.join(root, 'branding/logo-jotx.svg'), path.join(out, 'assets/logo-jotx.svg'))

const help = path.join(root, 'jotx-help')
const examples = path.join(out, 'examples')
fs.mkdirSync(examples, { recursive: true })
for (const file of ['JOTX_FOR_HUMANS.jot', 'JOTX_FOR_AI.jot']) {
  fs.copyFileSync(path.join(help, file), path.join(examples, file))
}
fs.cpSync(path.join(help, 'examples'), examples, { recursive: true })
fs.cpSync(path.join(help, 'templates'), path.join(examples, 'templates'), { recursive: true })

// Serve files as they are (no Jekyll processing of underscores or front matter)
fs.writeFileSync(path.join(out, '.nojekyll'), '')

const count = dir => fs.readdirSync(dir, { recursive: true }).filter(f => fs.statSync(path.join(dir, f)).isFile()).length
console.log(`✅ _site built: ${count(out)} files (${count(examples)} documents)`)
