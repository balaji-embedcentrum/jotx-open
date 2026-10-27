/**
 * jotx 2.0 Core - Pure functional parser and validator
 * @module @jotx-labs/core
 * 
 * Zero dependencies, works everywhere (Node, Browser, Mobile)
 * Pure functions only: parse, serialize, validate
 */

// TYPES - Data structures only
// ============================================================================
export * from './types/enums'
export * from './types/ast'
export * from './types/nodeManager'

// ============================================================================
// PARSER - Text → AST
// ============================================================================
import { Tokenizer } from './parser/tokenizer.new'
import { Parser } from './parser/v3/Parser'
import { Serializer } from './parser/serializer'
import { Validator, createValidator } from './parser/validator'

export { Tokenizer, Parser, Serializer, Validator, createValidator }

// ============================================================================
// CONVERTERS - Markdown ↔ Jotx
// ============================================================================
export { jotToMarkdown, markdownToJot } from './converters/MarkdownConverter'

// ============================================================================
// UTILITIES - ID Generation
// ============================================================================
export { generateBlockId, generateBlockIds, isValidBlockId, isShortUUID, isLegacySequentialId } from './utils/idGenerator'

// NodeManager exports
export { NodeManager, INDEXED_BLOCK_TYPES, type IndexedBlockType, type NodeEdge, type NodeManagerOptions } from './NodeManager'

/**
 * Parse jotx text into AST
 * Pure function: string in, AST out
 */
export { detectSyntaxStyle, COMPACT_ID_TYPES, type SyntaxStyle, type SerializeOptions } from './parser/serializer'
export { sameContent } from './parser/compare'
export { VERSION } from './version'
import { SyntaxStyle, SerializeOptions } from './parser/serializer'
import { sameContent } from './parser/compare'

export function parse(text: string) {
  const parser = new Parser()
  return parser.parse(text)
}

// ============================================================================
// SERIALIZER - AST → Text
// ============================================================================

/**
 * Serialize AST back to jotx text
 * Pure function: AST in, string out
 */
export function serialize(ast: any, options?: SerializeOptions) {
  const serializer = new Serializer()
  return serializer.serialize(ast, options)
}

/**
 * Rewrite a .jot file in the given syntax style.
 * The result is re-parsed and compared with the original; if the content would
 * change, the conversion is refused and the original text is returned untouched.
 */
export function convertSyntax(text: string, style: SyntaxStyle): { text: string; changed: boolean; ok: boolean; error?: string } {
  try {
    const before = parse(text).document
    const out = serialize({ document: before, errors: [] }, { style })
    const after = parse(out).document
    if (!sameContent(before, after)) {
      return { text, changed: false, ok: false, error: 'Converted file would not read back with the same content' }
    }
    return { text: out, changed: out !== text, ok: true }
  } catch (e) {
    return { text, changed: false, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ============================================================================
// VALIDATOR - AST → Errors
// ============================================================================

/**
 * Validate AST structure and properties
 * Pure function: AST in, errors out
 */
export function validate(ast: any) {
  const validator = createValidator()
  return validator.validate(ast)
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Parse and validate in one go
 * Returns AST + validation errors
 */
export function parseAndValidate(text: string) {
  const ast = parse(text)
  const errors = validate(ast.document)

  return {
    ast,
    // Warnings (deprecated blocks, style hints) do not make a file invalid
    isValid: !errors.some((e: any) => e.severity === 'error'),
    errors
  }
}

/**
 * Round-trip test: parse → serialize → compare
 * Useful for testing parser/serializer consistency
 */
export function roundTrip(text: string): string {
  const ast = parse(text)
  return serialize(ast)
}
export * from './platform'
// V2 blocks removed - use @jotx-labs/standard-lib instead
