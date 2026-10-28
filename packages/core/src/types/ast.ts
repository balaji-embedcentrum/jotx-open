/**
 * jotx 2.0 AST Types - Pure data structures
 * Abstract Syntax Tree node types for parsed jotx documents
 */

import { BlockType, DocumentType, WidgetBlockType } from './enums'

// ============================================================================
// TOKEN TYPES (for lexer/parser)
// ============================================================================

export type TokenType =
  | 'keyword'      // hdef, def, item, prop, row, cell, etc.
  | 'identifier'   // block_1, task_1, etc.
  | 'string'       // "quoted string" or """triple quoted"""
  | 'enum'         // bulleted, typescript, info, etc.
  | 'number'       // 123, 45.67
  | 'boolean'      // true, false
  | 'operator'     // operators like =, :, etc.
  | 'newline'      // \n
  | 'indent'       // indentation spaces
  | 'eof'          // end of file

export interface Token {
  type: TokenType
  value: string
  line: number
  column: number
  indent?: number  // Indentation level
  raw?: string     // Original text including quotes
}

// ============================================================================
// CORE AST TYPES (Pure data structures)
// ============================================================================

/**
 * Base block node - every block has this structure
 * Properties bag contains all block-specific data
 */
export interface BlockNode {
  type: BlockType | 'item' | 'row' | 'cell' | 'prop'  // Special types for nested structures
  id: string
  properties: Record<string, any>  // Flexible property bag
  children?: BlockNode[]           // For nested blocks (section, toggle, table, list)
  line?: number                    // Source line number (for error reporting)
}

/**
 * Document metadata - flexible key-value pairs
 */
export interface DocumentMetadata {
  title?: string
  type?: string // Explicitly added as requested
  icon?: string
  created?: string
  modified?: string
  author?: string
  tags?: string[]
  // Allow any other custom metadata, but keep the core interface clean
  [key: string]: any
}

/**
 * Document root node
 */
export interface DocumentNode {
  type: DocumentType  // 'jot' | 'meet' | 'todo'
  id: string
  metadata: DocumentMetadata
  blocks: BlockNode[]
}

/**
 * Complete AST with validation results
 */
export interface AST {
  document: DocumentNode
  errors: ValidationError[]
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export type ValidationSeverity = 'error' | 'warning'

export type ValidationErrorType =
  | 'syntax_error'
  | 'duplicate_id'
  | 'invalid_enum'
  | 'missing_required'
  | 'invalid_type'
  | 'invalid_property'
  | 'invalid_block_type'      // Block not allowed in this document type
  | 'invalid_nesting'          // Invalid nested structure
  | 'invalid_block_schema'     // Block does not match schema constraints
  | 'invalid_document_type'    // Unknown document type
  | 'schema_violation'         // Block not allowed in this document type
  | 'invalid_metadata'         // Invalid document metadata value

export interface ValidationError {
  type: ValidationErrorType
  message: string
  severity: ValidationSeverity
  line?: number
  column?: number
  blockId?: string
  propertyName?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

// ============================================================================
// PROPERTY SCHEMAS (What properties each block expects)
// ============================================================================

/**
 * Property schema definition
 */
export interface PropertySchema {
  type: 'string' | 'enum' | 'number' | 'boolean'
  required: boolean
  options?: string[]
  default?: any
  description?: string
}

/**
 * Block property schemas map
 */
export type BlockPropertySchemaMap = Record<string, PropertySchema>

/**
 * Property schemas for all 21 block types
 * Defines what properties each block requires/accepts
 */
// Widgets describe their properties in the block registry (standard-lib), so they are optional here.
export const BLOCK_PROPERTY_SCHEMAS: Record<Exclude<BlockType, WidgetBlockType>, BlockPropertySchemaMap> &
  Partial<Record<WidgetBlockType, BlockPropertySchemaMap>> = {
  heading: {
    text: { type: 'string', required: true, description: 'Heading content' },
    level: { type: 'number', required: true, description: 'Heading level' }
  },
  paragraph: {
    text: { type: 'string', required: true, description: 'Paragraph content' }
  },
  quote: {
    text: { type: 'string', required: true, description: 'Quoted content' }
  },
  listitem: {
    text: { type: 'string', required: true, description: 'Item content' }
  },
  taskitem: {
    text: { type: 'string', required: true, description: 'Task description' },
    checked: {
      type: 'enum',
      required: true,
      options: ['true', 'false'],
      description: 'Checked state'
    }
  },
  row: {
    // Nested structure
  },
  cell: {
    text: { type: 'string', required: true, description: 'Cell content' },
    rowspan: { type: 'number', required: false, description: 'Row span' },
    colspan: { type: 'number', required: false, description: 'Col span' }
  },
  header: {
    text: { type: 'string', required: true, description: 'Header content' },
    rowspan: { type: 'number', required: false, description: 'Row span' },
    colspan: { type: 'number', required: false, description: 'Col span' }
  },

  // ========== LIST BLOCKS ==========
  list: {
    listtype: {
      type: 'enum',
      required: true,
      options: ['bulleted', 'numbered'],
      description: 'List type'
    }
    // items handled as children
  },
  checklist: {
    // items handled as children
  },

  // ========== CODE & MEDIA BLOCKS ==========
  code: {
    language: {
      type: 'enum',
      required: true,
      options: ['typescript', 'javascript', 'python', 'bash', 'java', 'c', 'cpp', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css', 'json', 'yaml', 'xml', 'sql', 'shell', 'plaintext', 'text'],
      description: 'Programming language'
    },
    text: { type: 'string', required: true, description: 'Code content' }
  },
  math: {
    title: { type: 'string', required: false, description: 'Equation title' },
    src: { type: 'string', required: true, description: 'LaTeX math content' },
    display: {
      type: 'enum',
      required: false,
      options: ['block', 'inline'],
      default: 'block',
      description: 'Display mode'
    }
  },
  image: {
    src: { type: 'string', required: true, description: 'Image URL or path' },
    alt: { type: 'string', required: false, description: 'Alt text' },
    width: { type: 'number', required: false, default: 800, description: 'Width in pixels' },
    height: { type: 'string', required: false, default: 'auto', description: 'Height in pixels or auto' },
    align: {
      type: 'enum',
      required: false,
      options: ['left', 'center', 'right', 'full'],
      default: 'center',
      description: 'Image alignment'
    },
    caption: { type: 'string', required: false, description: 'Image caption' }
  },
  floatimage: {
    src: { type: 'string', required: true, description: 'Image URL or path' },
    alt: { type: 'string', required: false, description: 'Alt text' },
    width: { type: 'number', required: false, default: 400, description: 'Width in pixels' },
    height: { type: 'string', required: false, default: 'auto', description: 'Height in pixels or auto' },
    float: {
      type: 'enum',
      required: true,
      options: ['left', 'right'],
      description: 'Float position'
    },
    caption: { type: 'string', required: false, description: 'Image caption' }
  },
  video: {
    type: {
      type: 'enum',
      required: true,
      options: ['youtube', 'local'],
      description: 'Video type'
    },
    src: { type: 'string', required: true, description: 'Video source URL or path (YouTube or Local)' },
    title: { type: 'string', required: false, description: 'Video title' },
    width: { type: 'number', required: false, default: 800, description: 'Width in pixels' },
    height: { type: 'number', required: false, default: 450, description: 'Height in pixels' },
    controls: {
      type: 'enum',
      required: false,
      options: ['true', 'false'],
      default: 'true',
      description: 'Show controls'
    },
    autoplay: {
      type: 'enum',
      required: false,
      options: ['true', 'false'],
      default: 'false',
      description: 'Auto-play'
    },
    muted: {
      type: 'enum',
      required: false,
      options: ['true', 'false'],
      default: 'false',
      description: 'Muted'
    },
    loop: {
      type: 'enum',
      required: false,
      options: ['true', 'false'],
      default: 'false',
      description: 'Loop video'

    },
  },

  codereference: {
    path: { type: 'string', required: true, description: 'Relative path to file' },
    lines: { type: 'string', required: false, description: 'Line range (e.g. 10-20)' },
    language: { type: 'string', required: false, description: 'Language override' },
    text: { type: 'string', required: false, description: 'Cached file content (editable)' }
  },

  // ========== CONTAINER BLOCKS ==========
  callout: {
    variant: {
      type: 'enum',
      required: true,
      options: ['info', 'warning', 'success', 'error', 'note'],
      description: 'Callout variant'
    },
    text: { type: 'string', required: true, description: 'Callout content' }
  },
  section: {
    title: { type: 'string', required: false, description: 'Section title' },
    collapsed: {
      type: 'enum',
      required: false,
      options: ['true', 'false'],
      default: 'false',
      description: 'Collapse state'
    }
    // nested blocks handled as children
  },
  toggle: {
    title: { type: 'string', required: true, description: 'Toggle title' },
    open: {
      type: 'enum',
      required: false,
      options: ['true', 'false'],
      default: 'false',
      description: 'Open state'
    }
    // nested blocks handled as children
  },

  // ========== DATA BLOCKS ==========
  table: {
    title: { type: 'string', required: false, description: 'Table title' },
    columns: { type: 'string', required: true, description: 'Comma-separated column names' }
    // rows/cells handled as nested structures
  },
  properties: {
    title: { type: 'string', required: false, description: 'Property table title' }
    // props handled as nested structures
  },

  // ========== SEPARATOR & EMBED BLOCKS ==========
  divider: {
    // no properties
  },
  link: {
    url: { type: 'string', required: true, description: 'URL' },
    text: { type: 'string', required: true, description: 'Link display text' }
  },
  attach: {
    path: { type: 'string', required: true, description: 'File path' },
    text: { type: 'string', required: true, description: 'Attachment display name' }
  },

  // ========== RICH / INTERACTIVE BLOCKS ==========
  mermaid: {
    title: { type: 'string', required: false, description: 'Diagram title' },
    src: { type: 'string', required: true, description: 'Mermaid diagram syntax' },
    showsource: {
      type: 'enum',
      required: false,
      options: ['true', 'false'],
      default: 'false',
      description: 'Show source code'
    }
  },
  chart: {
    title: { type: 'string', required: false, description: 'Chart title' },
    charttype: {
      type: 'enum',
      required: true,
      options: ['bar', 'line', 'pie', 'doughnut', 'radar'],
      description: 'Chart type'
    },
    json: { type: 'string', required: true, description: 'Chart.js JSON data' },
    showsource: {
      type: 'enum',
      required: false,
      options: ['true', 'false'],
      default: 'false',
      description: 'Show source code'
    }
  },
  datetime: {
    value: { type: 'string', required: true, description: 'ISO 8601 datetime value' },
    mode: {
      type: 'enum',
      required: false,
      options: ['datetime', 'date', 'time'],
      default: 'datetime',
      description: 'Display mode'
    }
  },
  linkcard: {
    url: { type: 'string', required: true, description: 'URL to preview' },
    title: { type: 'string', required: false, description: 'Page title' },
    description: { type: 'string', required: false, description: 'Page description' },
    image: { type: 'string', required: false, description: 'Preview image URL' },
    sitename: { type: 'string', required: false, description: 'Site name' }
  },

  // ========== CUSTOM BLOCKS ==========
  custom: {
    customtype: { type: 'string', required: true, description: 'Custom block type identifier' },
    text: { type: 'string', required: false, description: 'Optional content' }
    // all other properties are user-defined
  },

  // ========== PKM BLOCKS ==========
  jotxlink: {
    target: { type: 'string', required: true, description: 'Target document ID or path' },
    text: { type: 'string', required: false, description: 'Display text' }
  },
  blockref: {
    ref: { type: 'string', required: true, description: 'Target block ID' }
  },

  // ========== NAVIGATION BLOCKS ==========
  gridcard: {
    layout: {
      type: 'enum',
      required: false,
      options: ['1x1', '1x2', '2x1', '2x2', '2x3', '3x2', '3x3'],
      default: '2x2',
      description: 'Grid layout (columns x rows)'
    }
    // cards handled as children
  },
  card: {
    title: { type: 'string', required: true, description: 'Card title' },
    value: { type: 'string', required: false, description: 'Stat value' },
    icon: { type: 'string', required: false, description: 'Emoji icon' },
    color: {
      type: 'enum',
      required: false,
      options: ['blue', 'green', 'red', 'yellow', 'purple', 'teal', 'gray'],
      default: 'teal',
      description: 'Card color theme'
    },
    link: { type: 'string', required: false, description: 'Navigation link' }
  },
  button: {
    label: { type: 'string', required: true, description: 'Button text' },
    link: { type: 'string', required: true, description: 'Navigation link' },
    style: {
      type: 'enum',
      required: false,
      options: ['primary', 'secondary', 'outline', 'ghost'],
      default: 'primary',
      description: 'Button style'
    },
    align: {
      type: 'enum',
      required: false,
      options: ['left', 'center', 'right'],
      default: 'left',
      description: 'Button alignment'
    }
  },
  buttonstrip: {
    // No properties on the strip itself
  },

  // ========== LAYOUT BLOCKS ==========
  columns: {
    // columns handled as children
  },
  column: {
    width: { type: 'string', required: false, description: 'Relative column width (e.g. 1, 2)' }
    // nested blocks handled as children
  },
  tab: {
    title: { type: 'string', required: true, description: 'Tab label' },
    icon: { type: 'string', required: false, description: 'Emoji shown before the label' }
    // nested blocks handled as children
  }
}

/**
 * Schema for list items
 */
export const LIST_ITEM_SCHEMA: BlockPropertySchemaMap = {
  text: { type: 'string', required: true, description: 'Item content' }
}

/**
 * Schema for checklist items
 */
export const CHECKLIST_ITEM_SCHEMA: BlockPropertySchemaMap = {
  text: { type: 'string', required: true, description: 'Task description' },
  checked: {
    type: 'enum',
    required: true,
    options: ['true', 'false'],
    description: 'Checked state'
  }
}

/**
 * Schema for properties props
 */
export const PROPERTY_SCHEMA: BlockPropertySchemaMap = {
  key: { type: 'string', required: false, description: 'Property name' },
  value: { type: 'string', required: false, description: 'Property value' },
  type: {
    type: 'enum',
    required: true,
    options: ['text', 'number', 'select', 'date', 'checkbox', 'url', 'email'],
    description: 'Property type'
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get property schema for a block type
 */
export function getBlockPropertySchema(blockType: BlockType): BlockPropertySchemaMap | undefined {
  return (BLOCK_PROPERTY_SCHEMAS as Partial<Record<BlockType, BlockPropertySchemaMap>>)[blockType]
}

/**
 * Check if a property is required for a block type
 */
export function isPropertyRequired(blockType: BlockType, propertyName: string): boolean {
  const schema = getBlockPropertySchema(blockType)
  return schema?.[propertyName]?.required ?? false
}

/**
 * Get default value for a property
 */
export function getPropertyDefault(blockType: BlockType, propertyName: string): any {
  const schema = getBlockPropertySchema(blockType)
  return schema?.[propertyName]?.default
}

/**
 * Validate enum value
 */
export function isValidEnumValue(blockType: BlockType, propertyName: string, value: string): boolean {
  const schema = getBlockPropertySchema(blockType)
  const options = schema?.[propertyName]?.options
  return options ? options.includes(value) : true
}
