/**
 * Sync version across all packages
 * 
 * Reads version from version.ts and updates:
 * - Root package.json
 * - packages/core/package.json
 * - packages/adapters/package.json
 * - packages/language/package.json
 * - packages/vscode-extension/package.json
 * - packages/cli/package.json
 * - packages/embed/package.json
 * - internal @jotx-labs/* dependency ranges
 * - packages/core/src/version.ts
 * 
 * Usage:
 *   node scripts/sync-versions.js
 */

const fs = require('fs')
const path = require('path')

// Read version from version.ts
const versionFile = fs.readFileSync(path.join(__dirname, '../version.ts'), 'utf-8')
const versionMatch = versionFile.match(/JOTX_VERSION = ['"](.+)['"]/)

if (!versionMatch) {
  console.error('❌ Could not find JOTX_VERSION in version.ts')
  process.exit(1)
}

const VERSION = versionMatch[1]
console.log(`📦 Syncing version: ${VERSION}`)

// Packages to update
const packages = [
  'package.json',
  'packages/registry/package.json',
  'packages/core/package.json',
  'packages/standard-lib/package.json',
  'packages/adapters/package.json',
  'packages/react-renderer/package.json',
  'packages/editor/package.json',
  'packages/language/package.json',
  'packages/vscode-extension/package.json',
  'packages/cli/package.json',
  'packages/embed/package.json'
]

let updated = 0
let skipped = 0

packages.forEach(pkgPath => {
  const fullPath = path.join(__dirname, '..', pkgPath)

  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  Skipped: ${pkgPath} (not found)`)
    skipped++
    return
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
    const oldVersion = pkg.version

    if (oldVersion === VERSION) {
      console.log(`✓  ${pkgPath}: ${VERSION} (already up to date)`)
      skipped++
      return
    }

    pkg.version = VERSION
    // Keep internal @jotx-labs/* ranges in step (local file: links are left alone)
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
      for (const [name, range] of Object.entries(pkg[field] || {})) {
        if (name.startsWith('@jotx-labs/') && !String(range).startsWith('file:')) {
          pkg[field][name] = `^${VERSION}`
        }
      }
    }
    fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
    console.log(`✅ ${pkgPath}: ${oldVersion} → ${VERSION}`)
    updated++
  } catch (error) {
    console.error(`❌ Failed to update ${pkgPath}:`, error.message)
  }
})

// Runtime version constant exported by @jotx-labs/core
fs.writeFileSync(
  path.join(__dirname, '../packages/core/src/version.ts'),
  `/**\n * Version information for jotx\n * This file is auto-generated - do not edit manually\n * Run \`npm run sync-versions\` at the root to sync versions\n */\n\nexport const VERSION = '${VERSION}';\n`,
  'utf-8'
)
console.log(`✅ packages/core/src/version.ts → ${VERSION}`)

console.log('')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`✅ Updated: ${updated} packages`)
console.log(`⏭️  Skipped: ${skipped} packages`)
console.log(`📦 Version: ${VERSION}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('')
console.log('Next steps:')
console.log('  1. Build packages: npm run build')
console.log('  2. Test extension: Press F5 in VS Code')
console.log('  3. Create VSIX: npm run package')
console.log('')
