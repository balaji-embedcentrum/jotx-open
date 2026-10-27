/**
 * Authoring helpers for .jot files in the VS Code text editor:
 * - completions for block keywords (with property snippets), property names and enum values
 * - hovers that document a block and its properties
 *
 * Everything is driven by the block registry, so new blocks and widgets are
 * picked up automatically once they are registered.
 */

import { registry } from '@jotx-labs/registry'

type BlockDefinition = ReturnType<typeof registry.getAll>[number]

/** Properties whose content is naturally multi-line (list data, code, prose). */
function isMultiline(key: string, description = ''): boolean {
  return /^lines:|per line|indented lines|text$/i.test(description) ||
    ['text', 'src', 'json', 'board', 'before', 'after', 'request', 'response', 'context', 'decision', 'consequences'].includes(key)
}

function keywordOf(def: BlockDefinition): string {
  return def.syntax?.keyword || def.type
}

function describe(def: BlockDefinition): string {
  const props = Object.entries(def.schema?.properties || {})
  const lines = [`**${def.ui?.label || def.type}** — \`def ${keywordOf(def)}\``]
  if (def.ui?.description) lines.push('', def.ui.description)
  if (props.length) {
    lines.push('', '| Property | Type | |', '|---|---|---|')
    for (const [key, p] of props) {
      const type = p.type === 'enum' && p.options ? p.options.join(' \\| ') : p.type
      lines.push(`| \`${key}\` | ${type} | ${p.required ? '**required** ' : ''}${p.description || ''} |`)
    }
  }
  if (def.syntax?.hasChildren) lines.push('', '_Contains nested blocks._')
  return lines.join('\n')
}

// Blocks that keep an id in compact syntax (link targets and knowledge-graph nodes)
const ID_TYPES = new Set(['table', 'mermaid', 'chart', 'math', 'jotxlink', 'link', 'button', 'card'])

/** Snippet body for `def <keyword> ...` including property stubs, in the user's syntax style. */
function blockSnippet(def: BlockDefinition, indent: string, compact: boolean): string {
  const kw = keywordOf(def)
  const primary = compact ? def.syntax?.primary : undefined
  let tab = 1
  let head = kw
  if (!compact || ID_TYPES.has(def.type)) head += ` \${${tab++}:${kw}_1}`
  if (primary) head += ` "\${${tab++}}"`
  const out = [head]
  const props = Object.entries(def.schema?.properties || {})
  // Widgets list every property; regular blocks only the required ones
  const isWidget = !!def.ui?.description
  for (const [key, p] of props) {
    if (key === primary) continue
    if (!isWidget && !p.required) continue
    const pad = `${indent}  `
    if (p.type === 'enum' && p.options?.length) {
      out.push(`${pad}${key} \${${tab++}|${p.options.join(',')}|}`)
    } else if (p.type === 'boolean') {
      out.push(`${pad}${key} \${${tab++}|false,true|}`)
    } else if (p.type === 'number') {
      out.push(`${pad}${key} \${${tab++}:0}`)
    } else if (isMultiline(key, p.description)) {
      out.push(`${pad}${key} """\${${tab++}}"""`)
    } else {
      out.push(`${pad}${key} "\${${tab++}}"`)
    }
  }
  return out.join('\n')
}

/** Find the block that owns the given line (nearest `def` with smaller indentation). */
function enclosingBlock(document: any, line: number, indent: number): BlockDefinition | undefined {
  for (let l = line - 1; l >= 0; l--) {
    const text: string = document.lineAt(l).text
    const m = text.match(/^(\s*)def\s+([a-z]+)/)
    if (m && m[1].length < indent) {
      return registry.get(m[2]) || registry.getByKeyword(m[2])
    }
  }
  return undefined
}

export function registerAuthoring(vscode: any, context: any) {
  const selector = [{ language: 'jotx-note' }, { pattern: '**/*.{jot,meet,jotx}' }]

  const completions = vscode.languages.registerCompletionItemProvider(selector, {
    provideCompletionItems(document: any, position: any) {
      const prefix: string = document.lineAt(position.line).text.slice(0, position.character)
      const indent = prefix.match(/^\s*/)?.[0] ?? ''

      // 1. def <keyword>
      if (/^\s*def\s+[a-z]*$/.test(prefix)) {
        const compact = vscode.workspace.getConfiguration('jotx').get('syntax', 'preserve') !== 'classic'
        // Retired blocks stay readable but are not offered
        return registry.getAll().filter(d => (d.syntax?.keyword || d.type) && !['properties', 'property'].includes(d.type)).map(def => {
          const item = new vscode.CompletionItem(keywordOf(def), vscode.CompletionItemKind.Class)
          item.detail = def.ui?.label || def.type
          item.documentation = new vscode.MarkdownString(describe(def))
          item.insertText = new vscode.SnippetString(blockSnippet(def, indent, compact))
          item.sortText = (def.ui?.description ? '1' : '0') + keywordOf(def)
          return item
        })
      }

      // 2. <enumProperty> <value>
      const valueMatch = prefix.match(/^(\s*)([a-z]+)\s+[a-z]*$/)
      if (valueMatch && valueMatch[2] !== 'def') {
        const def = enclosingBlock(document, position.line, valueMatch[1].length)
        const prop = def?.schema?.properties?.[valueMatch[2]]
        if (prop?.type === 'enum' && prop.options) {
          return prop.options.map((o: string) => new vscode.CompletionItem(o, vscode.CompletionItemKind.EnumMember))
        }
        return undefined
      }

      // 3. property names (and nested def) inside a block
      if (/^\s*[a-z]*$/.test(prefix)) {
        const def = enclosingBlock(document, position.line, indent.length)
        if (!def) return undefined
        const items = Object.entries(def.schema?.properties || {}).map(([key, p]) => {
          const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property)
          item.detail = p.type === 'enum' && p.options ? p.options.join(' | ') : p.type
          item.documentation = p.description
          if (p.type === 'enum' && p.options?.length) {
            item.insertText = new vscode.SnippetString(`${key} \${1|${p.options.join(',')}|}`)
          } else if (p.type === 'boolean' || p.type === 'number') {
            item.insertText = new vscode.SnippetString(`${key} \${1}`)
          } else if (isMultiline(key, p.description)) {
            item.insertText = new vscode.SnippetString(`${key} """\${1}"""`)
          } else {
            item.insertText = new vscode.SnippetString(`${key} "\${1}"`)
          }
          return item
        })
        if (def.syntax?.hasChildren) {
          const nested = new vscode.CompletionItem('def', vscode.CompletionItemKind.Keyword)
          nested.detail = 'Nested block'
          nested.insertText = new vscode.SnippetString('def ')
          nested.command = { command: 'editor.action.triggerSuggest', title: 'Suggest blocks' }
          items.push(nested)
        }
        return items
      }
      return undefined
    }
  }, ' ')

  const hovers = vscode.languages.registerHoverProvider(selector, {
    provideHover(document: any, position: any) {
      const text: string = document.lineAt(position.line).text
      const m = text.match(/^(\s*)def\s+([a-z]+)/)
      if (!m) return undefined
      const start = m[1].length + 4
      if (position.character < start || position.character > start + m[2].length) return undefined
      const def = registry.get(m[2]) || registry.getByKeyword(m[2])
      if (!def) return undefined
      return new vscode.Hover(new vscode.MarkdownString(describe(def)))
    }
  })

  context.subscriptions.push(completions, hovers)
}
