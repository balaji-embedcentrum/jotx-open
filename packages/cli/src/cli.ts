#!/usr/bin/env node
/**
 * jotx CLI - Demonstrates platform independence
 * Uses @jotx-labs/core and @jotx-labs/adapters
 */

import { Command } from 'commander'
import * as fs from 'fs/promises'
import * as path from 'path'
import { parseAndValidate, jotToMarkdown, markdownToJot, ValidationError, convertSyntax, type SyntaxStyle } from '@jotx-labs/core'
import { registerStandardBlocks } from '@jotx-labs/standard-lib'
import { HTMLRenderer } from '@jotx-labs/adapters'

registerStandardBlocks()

const renderer = new HTMLRenderer()

const program = new Command()

program
  .name('jotx')
  .description('jotx CLI - Parse, validate, and convert jotx files')
  .version('3.1.0')

// Parse command
program
  .command('parse <file>')
  .description('Parse a .jot file and show AST')
  .action(async (file: string) => {
    try {
      const text = await fs.readFile(file, 'utf-8')
      const result = parseAndValidate(text)

      if (result.isValid) {
        console.log('✅ Parse successful!')
        console.log(JSON.stringify(result.ast, null, 2))
      } else {
        console.error('❌ Parse failed:')
        result.errors.forEach((err: ValidationError) => {
          console.error(`  - ${err.message}`)
        })
        process.exit(1)
      }
    } catch (error) {
      console.error('❌ Error:', error)
      process.exit(1)
    }
  })

// Validate command
program
  .command('validate <file>')
  .description('Validate a .jot file')
  .action(async (file: string) => {
    try {
      const text = await fs.readFile(file, 'utf-8')
      const result = parseAndValidate(text)

      if (result.isValid) {
        console.log(`✅ ${file} is valid!`)
        console.log(`   Document: ${result.ast.document.id}`)
        console.log(`   Type: ${result.ast.document.type}`)
        console.log(`   Blocks: ${result.ast.document.blocks.length}`)
      } else {
        console.error(`❌ ${file} has errors:`)
        result.errors.forEach((err: ValidationError) => {
          console.error(`  - ${err.message}`)
        })
        process.exit(1)
      }
    } catch (error) {
      console.error('❌ Error:', error)
      process.exit(1)
    }
  })

// Convert command
program
  .command('convert <file>')
  .description('Convert .jot file to HTML')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .action(async (file: string, options: { output?: string }) => {
    try {
      const text = await fs.readFile(file, 'utf-8')
      const result = parseAndValidate(text)

      if (!result.isValid) {
        console.error('❌ File has errors:')
        result.errors.forEach((err: ValidationError) => {
          console.error(`  - ${err.message}`)
        })
        process.exit(1)
      }

      // Render to HTML
      const html = renderer.render({
        id: result.ast.document.id,
        type: result.ast.document.type,
        metadata: result.ast.document.metadata,
        blocks: result.ast.document.blocks as any
      } as any)

      // Wrap in full HTML document
      const title = (result.ast.document.metadata as any)?.title || 'jotx Document'
      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 2em; margin-bottom: 0.5em; }
    h2 { font-size: 1.5em; margin-top: 1.5em; }
    h3 { font-size: 1.2em; margin-top: 1.2em; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
    blockquote { border-left: 4px solid #ddd; padding-left: 16px; margin-left: 0; color: #666; }
  </style>
</head>
<body>
${html}
</body>
</html>`

      if (options.output) {
        await fs.writeFile(options.output, fullHtml, 'utf-8')
        console.log(`✅ Converted to ${options.output}`)
      } else {
        console.log(fullHtml)
      }
    } catch (error) {
      console.error('❌ Error:', error)
      process.exit(1)
    }
  })

// Info command
program
  .command('info <file>')
  .description('Show document information')
  .action(async (file: string) => {
    try {
      const text = await fs.readFile(file, 'utf-8')
      const result = parseAndValidate(text)

      if (!result.isValid) {
        console.error('❌ File has errors')
        process.exit(1)
      }

      const doc = result.ast.document

      console.log('📄 Document Information')
      console.log('─'.repeat(50))
      console.log(`ID:       ${doc.id}`)
      console.log(`Type:     ${doc.type}`)
      console.log(`Title:    ${(doc.metadata as any)?.title || '(none)'}`)
      console.log(`Blocks:   ${doc.blocks.length}`)
      console.log()
      console.log('Block Types:')

      const blockCounts: Record<string, number> = {}
      doc.blocks.forEach((block: any) => {
        blockCounts[block.type] = (blockCounts[block.type] || 0) + 1
      })

      Object.entries(blockCounts).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`)
      })
    } catch (error) {
      console.error('❌ Error:', error)
      process.exit(1)
    }
  })

// Migrate command: rewrite files in classic or compact syntax
async function collectJotFiles(inputs: string[]): Promise<string[]> {
  const out: string[] = []
  const walk = async (p: string) => {
    const stat = await fs.stat(p)
    if (stat.isDirectory()) {
      if (path.basename(p) === 'node_modules' || path.basename(p).startsWith('.')) return
      for (const entry of await fs.readdir(p)) await walk(path.join(p, entry))
    } else if (/\.(jot|jotx|meet)$/.test(p)) {
      out.push(p)
    }
  }
  for (const input of inputs) await walk(input)
  return out
}

program
  .command('migrate <paths...>')
  .description('Rewrite .jot files in compact or classic syntax (folders are searched recursively)')
  .requiredOption('--to <style>', 'target syntax: compact or classic')
  .option('--check', 'write nothing; exit with code 1 if any file is not in the target syntax')
  .option('--dry-run', 'write nothing; list the files that would change')
  .action(async (paths: string[], opts: { to: string; check?: boolean; dryRun?: boolean }) => {
    if (opts.to !== 'compact' && opts.to !== 'classic') {
      console.error('--to must be "compact" or "classic"')
      process.exit(2)
    }
    const style = opts.to as SyntaxStyle
    const files = await collectJotFiles(paths)
    let changed = 0, failed = 0, before = 0, after = 0
    for (const file of files) {
      const text = await fs.readFile(file, 'utf-8')
      const result = convertSyntax(text, style)
      if (!result.ok) { failed++; console.error(`✗ ${file}: ${result.error}`); continue }
      if (!result.changed) continue
      changed++; before += text.length; after += result.text.length
      if (opts.check || opts.dryRun) console.log(`• ${file}`)
      else { await fs.writeFile(file, result.text, 'utf-8'); console.log(`✓ ${file}`) }
    }
    const pct = before ? Math.round((1 - after / before) * 100) : 0
    const verb = opts.check || opts.dryRun ? 'would change' : 'converted'
    console.log(`${changed} of ${files.length} files ${verb} to ${style} syntax${pct > 0 ? ` (${pct}% smaller)` : ''}${failed ? `; ${failed} could not be converted safely` : ''}.`)
    if (opts.check && (changed || failed)) process.exit(1)
    if (failed) process.exit(1)
  })

program.parse()
