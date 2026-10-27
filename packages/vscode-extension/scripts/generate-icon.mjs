import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const svgPath = path.join(root, 'media', 'logo-jotx.svg')
const outPath = path.join(root, 'media', 'logo-jotx.png')

const svg = await readFile(svgPath)

// VS Code extension icon wants 128x128 PNG.
await sharp(svg, { density: 300 })
  .resize(128, 128, { fit: 'contain' })
  .png({ compressionLevel: 9 })
  .toFile(outPath)

console.log(`✅ Generated: ${outPath}`)


