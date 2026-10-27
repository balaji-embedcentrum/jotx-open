/**
 * Content comparison used to verify syntax conversions: two documents are the
 * same if they have the same blocks, in the same order, with the same values.
 * Block ids, empty values, value types ("1" vs 1) and values the reader assumes
 * by default are ignored, since compact syntax legitimately drops them.
 */

import { BlockNode, DocumentNode } from '../types/ast'
import { COMPACT_DEFAULTS } from './serializer'

function normalize(blocks: BlockNode[]): unknown[] {
  return blocks.map(b => {
    const defaults = COMPACT_DEFAULTS[b.type] || {}
    const props: Record<string, string> = {}
    for (const key of Object.keys(b.properties || {}).sort()) {
      const v = b.properties[key]
      if (v === undefined || v === null || v === '') continue
      if (defaults[key] === String(v)) continue
      props[key] = key === 'json' ? canonicalJson(v) : String(v)
    }
    // A cell holding only an empty paragraph displays the same as an empty cell
    let children = b.children || []
    if (b.type === 'cell') children = children.filter(c => !(c.type === 'paragraph' && !c.properties?.text && !(c.children || []).length))
    return { type: b.type, props, children: normalize(children) }
  })
}

function canonicalJson(v: unknown): string {
  try { return JSON.stringify(JSON.parse(String(v))) } catch { return String(v) }
}

export function sameContent(a: DocumentNode, b: DocumentNode): boolean {
  return a.type === b.type &&
    a.id === b.id &&
    JSON.stringify(a.metadata) === JSON.stringify(b.metadata) &&
    JSON.stringify(normalize(a.blocks)) === JSON.stringify(normalize(b.blocks))
}
