/**
 * Enum types for jotx block syntax
 * All predefined keywords (no quotes in syntax)
 */

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export type DocumentType = 'jotx'

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  'jotx'       // .jot files (V3 syntax)
] as const

export function isValidDocumentType(type: string): type is DocumentType {
  return DOCUMENT_TYPES.includes(type as DocumentType)
}

// Document Kinds (metadata type)
export type DocumentKind =
  | 'root'           // Knowledge graph root (only one per workspace)
  | 'page'
  | 'article'
  | 'documentation'
  | 'report'
  | 'specification'
  | 'dashboard'
  | 'roadmap'
  | 'brainstorm'
  | 'journal'
  | 'meeting'
  | 'tasklist'

export const DOCUMENT_KINDS: readonly DocumentKind[] = [
  'root',
  'page',
  'article',
  'documentation',
  'report',
  'specification',
  'dashboard',
  'roadmap',
  'brainstorm',
  'journal',
  'meeting',
  'tasklist'
] as const

export function isValidDocumentKind(kind: string): kind is DocumentKind {
  return DOCUMENT_KINDS.includes(kind as DocumentKind)
}

// ============================================================================
// WIDGET BLOCK TYPES
// ============================================================================

/**
 * Widgets are self-contained blocks whose state lives entirely in flat string
 * properties (no children). Adapters map their properties 1:1 to editor
 * attributes, so adding a widget never needs a bespoke conversion case.
 */
export const WIDGET_BLOCK_TYPES = [
  'kanban',
  'habit',
  'progress',
  'countdown',
  'timer',
  'matrix',
  'proscons',
  'decision',
  'rating',
  'toc',
  'steps',
  'timeline',
  'terminal',
  'api',
  'filetree',
  'diff',
  'palette',
  'badges',
  'shortcuts',
  'animation',
  'menu'
] as const

export type WidgetBlockType = typeof WIDGET_BLOCK_TYPES[number]

export function isWidgetBlockType(type: string): type is WidgetBlockType {
  return (WIDGET_BLOCK_TYPES as readonly string[]).includes(type)
}

// ============================================================================
// DOCUMENT TYPE SCHEMAS (Allowed blocks per document type)
// ============================================================================

/**
 * Defines which blocks are allowed in each document type
 */
export const DOCUMENT_SCHEMAS: Record<DocumentType, readonly BlockType[]> = {
  // .jot files with V3 syntax - all blocks allowed
  jotx: [
    'heading', 'paragraph', 'quote',
    'list', 'listitem', 'checklist', 'taskitem', 'code', 'codereference', 'math', 'image', 'floatimage', 'video',
    'callout', 'section', 'table', 'properties', 'divider',
    'link', 'attach',
    'mermaid', 'chart', 'datetime', 'toggle', 'linkcard',
    'custom',
    'jotxlink', 'blockref',
    // Table parts
    'row', 'cell', 'header',
    // Navigation blocks
    'gridcard', 'card', 'button', 'buttonstrip',
    // Layout blocks
    'columns', 'column', 'tab',
    // Widgets (attribute-only blocks, see WIDGET_BLOCK_TYPES)
    ...WIDGET_BLOCK_TYPES
  ] as const
}

/**
 * Check if a block type is allowed in a document type
 */
export function isBlockAllowedInDocument(
  blockType: BlockType,
  documentType: DocumentType
): boolean {
  const schema = DOCUMENT_SCHEMAS[documentType]
  if (!schema) {
    // If document type is unknown, allow all blocks (be permissive)
    return true
  }
  return schema.includes(blockType)
}

/**
 * Get all allowed blocks for a document type
 */
export function getAllowedBlocks(documentType: DocumentType): readonly BlockType[] {
  return DOCUMENT_SCHEMAS[documentType]
}

// ============================================================================
// BLOCK TYPES
// ============================================================================

export type BlockType =
  // Text blocks
  | 'heading'
  | 'paragraph'
  | 'quote'
  // List blocks
  | 'list'
  | 'checklist'
  // Code & media blocks
  | 'code'
  | 'math'
  | 'image'
  | 'floatimage'
  | 'video'
  | 'codereference'
  // Container blocks
  | 'callout'
  | 'section'
  // Data blocks
  | 'table'
  | 'properties'
  // Separator & embed blocks
  | 'divider'
  | 'link'
  | 'attach'  // Renamed from 'file' for clarity
  // Rich / interactive blocks (supported by VS Code editor)
  | 'mermaid'
  | 'chart'
  | 'datetime'
  | 'toggle'
  | 'linkcard'
  // Custom blocks
  | 'custom'
  // PKM Blocks
  | 'jotxlink'
  | 'blockref'
  // V3 Standard Types
  | 'listitem'
  | 'taskitem'
  | 'row'
  | 'cell'
  | 'header'
  // Navigation blocks
  | 'gridcard'
  | 'card'
  | 'button'
  | 'buttonstrip'
  // Layout blocks
  | 'columns'
  | 'column'
  | 'tab'
  // Widgets
  | WidgetBlockType

export const BLOCK_TYPES: readonly BlockType[] = [
  'heading',
  'paragraph',
  'quote',
  'list',
  'checklist',
  'code',
  'math',
  'image',
  'floatimage',
  'video',
  'codereference',
  'callout',
  'section',
  'table',
  'properties',
  'divider',
  'link',
  'attach',  // Renamed from 'file'
  'mermaid',
  'chart',
  'datetime',
  'toggle',
  'linkcard',
  'custom',
  'jotxlink',
  'blockref',
  'listitem',
  'taskitem',
  'row',
  'cell',
  'header',
  // Navigation blocks
  'gridcard',
  'card',
  'button',
  'buttonstrip',
  // Layout blocks
  'columns',
  'column',
  'tab',
  // Widgets
  ...WIDGET_BLOCK_TYPES
] as const

export function isValidBlockType(type: string): type is BlockType {
  return BLOCK_TYPES.includes(type as BlockType)
}

// ============================================================================
// PROPERTY ENUMS
// ============================================================================

// List types
// NOTE: Text model historically uses `bullet`/`numbered`.
// We also accept `bulleted` for compatibility.
export type ListType = 'bullet' | 'bulleted' | 'numbered'

export const LIST_TYPES: readonly ListType[] = ['bullet', 'bulleted', 'numbered'] as const

export function isValidListType(type: string): type is ListType {
  return LIST_TYPES.includes(type as ListType)
}

// Callout types
export type CalloutType = 'info' | 'success' | 'warning' | 'error' | 'note'

export const CALLOUT_TYPES: readonly CalloutType[] = [
  'info',
  'success',
  'warning',
  'error',
  'note'
] as const

export function isValidCalloutType(type: string): type is CalloutType {
  return CALLOUT_TYPES.includes(type as CalloutType)
}

// Programming languages
export type Language =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'html'
  | 'css'
  | 'scss'
  | 'json'
  | 'yaml'
  | 'xml'
  | 'markdown'
  | 'sql'
  | 'bash'
  | 'shell'
  | 'powershell'
  | 'dockerfile'
  | 'plain'
  | 'text'

export const LANGUAGES: readonly Language[] = [
  'typescript',
  'javascript',
  'python',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'html',
  'css',
  'scss',
  'json',
  'yaml',
  'xml',
  'markdown',
  'sql',
  'bash',
  'shell',
  'powershell',
  'dockerfile',
  'plain',
  'text'
] as const

export function isValidLanguage(lang: string): lang is Language {
  return LANGUAGES.includes(lang as Language)
}

// Priority levels
export type Priority = 'low' | 'medium' | 'high' | 'critical'

export const PRIORITIES: readonly Priority[] = [
  'low',
  'medium',
  'high',
  'critical'
] as const

export function isValidPriority(priority: string): priority is Priority {
  return PRIORITIES.includes(priority as Priority)
}

// Divider styles
export type DividerStyle = 'solid' | 'dashed' | 'dotted'

export const DIVIDER_STYLES: readonly DividerStyle[] = [
  'solid',
  'dashed',
  'dotted'
] as const

export function isValidDividerStyle(style: string): style is DividerStyle {
  return DIVIDER_STYLES.includes(style as DividerStyle)
}

// Property types
export type PropertyType = 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'url' | 'email'

export const PROPERTY_TYPES: readonly PropertyType[] = [
  'text',
  'number',
  'select',
  'date',
  'checkbox',
  'url',
  'email'
] as const

export function isValidPropertyType(type: string): type is PropertyType {
  return PROPERTY_TYPES.includes(type as PropertyType)
}

// Math formats
export type MathFormat = 'latex' | 'markdown'

export const MATH_FORMATS: readonly MathFormat[] = ['latex', 'markdown'] as const

export function isValidMathFormat(format: string): format is MathFormat {
  return MATH_FORMATS.includes(format as MathFormat)
}

// Colors
export type Color = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'gray' | 'orange'

export const COLORS: readonly Color[] = [
  'blue',
  'green',
  'yellow',
  'red',
  'purple',
  'pink',
  'gray',
  'orange'
] as const

export function isValidColor(color: string): color is Color {
  return COLORS.includes(color as Color)
}

// Image alignment
export type ImageAlign = 'left' | 'center' | 'right' | 'full'

export const IMAGE_ALIGNS: readonly ImageAlign[] = [
  'left',
  'center',
  'right',
  'full'
] as const

export function isValidImageAlign(align: string): align is ImageAlign {
  return IMAGE_ALIGNS.includes(align as ImageAlign)
}

// Float image position
export type FloatPosition = 'left' | 'right'

export const FLOAT_POSITIONS: readonly FloatPosition[] = [
  'left',
  'right'
] as const

export function isValidFloatPosition(float: string): float is FloatPosition {
  return FLOAT_POSITIONS.includes(float as FloatPosition)
}

// Video type
export type VideoType = 'youtube' | 'local'

export const VIDEO_TYPES: readonly VideoType[] = [
  'youtube',
  'local'
] as const

export function isValidVideoType(type: string): type is VideoType {
  return VIDEO_TYPES.includes(type as VideoType)
}

// ============================================================================
// ENUM DETECTION HELPER
// ============================================================================

/**
 * Check if a property name expects an enum value (no quotes)
 */
export function isEnumProperty(propertyName: string): boolean {
  const enumProperties = [
    'type',
    'language',
    'priority',
    'style',
    'format',
    'checked',
    'collapsed',
    'locked',
    'hidden',
    'preview'
  ]
  return enumProperties.includes(propertyName)
}

/**
 * Validate enum value for a given property
 */
export function validateEnumValue(propertyName: string, value: string): boolean {
  switch (propertyName) {
    case 'type':
      return isValidListType(value) || isValidCalloutType(value) || isValidPropertyType(value) || isValidDocumentKind(value)
    case 'language':
      return isValidLanguage(value)
    case 'priority':
      return isValidPriority(value)
    case 'style':
      return isValidDividerStyle(value)
    case 'format':
      return isValidMathFormat(value)
    case 'checked':
    case 'collapsed':
    case 'locked':
    case 'hidden':
    case 'preview':
      return value === 'true' || value === 'false'
    default:
      return false
  }
}

