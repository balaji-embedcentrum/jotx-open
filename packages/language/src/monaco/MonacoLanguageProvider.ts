/**
 * Monaco Editor integration for jotx
 * Use this in your web app
 */

import { DiagnosticProvider, JotxDiagnostic } from '../diagnostics/DiagnosticProvider'

/**
 * Monaco marker severity mapping
 */
export const MonacoSeverity = {
  error: 8,    // monaco.MarkerSeverity.Error
  warning: 4,  // monaco.MarkerSeverity.Warning
  info: 2,     // monaco.MarkerSeverity.Info
  hint: 1      // monaco.MarkerSeverity.Hint
}

/**
 * Convert jotx diagnostic to Monaco marker
 */
export function toMonacoMarker(diagnostic: JotxDiagnostic): any {
  return {
    severity: MonacoSeverity[diagnostic.severity],
    message: diagnostic.message,
    startLineNumber: diagnostic.startLine + 1,  // Monaco uses 1-based
    startColumn: diagnostic.startColumn + 1,
    endLineNumber: diagnostic.endLine + 1,
    endColumn: diagnostic.endColumn + 1,
    code: diagnostic.code,
    source: diagnostic.source
  }
}

/**
 * Monaco language provider for jotx
 * Register this in your Monaco editor setup
 */
export class MonacoLanguageProvider {
  private diagnosticProvider: DiagnosticProvider
  private monaco: any  // Monaco instance

  constructor(monaco: any) {
    this.monaco = monaco
    this.diagnosticProvider = new DiagnosticProvider()
  }

  /**
   * Register jotx language with Monaco
   */
  register() {
    // Register language
    this.monaco.languages.register({
      id: 'jotx',
      extensions: ['.jot', '.meet'],
      aliases: ['jotx', 'JOTX'],
      mimetypes: ['text/x-jotx']
    })

    // Set language configuration
    this.monaco.languages.setLanguageConfiguration('jotx', {
      comments: {
        lineComment: '#'
      },
      brackets: [
        ['"""', '"""']
      ],
      autoClosingPairs: [
        { open: '"', close: '"' },
        { open: '"""', close: '"""' }
      ],
      surroundingPairs: [
        { open: '"', close: '"' }
      ],
      indentationRules: {
        increaseIndentPattern: /^\s*(hdef|def|item|row|cell|section)\s+/,
        decreaseIndentPattern: /^\s*$/
      }
    })

    // Set token provider (syntax highlighting)
    this.monaco.languages.setMonarchTokensProvider('jotx', this.getTokenProvider())

    // Register validation
    this.monaco.languages.registerDocumentFormattingEditProvider('jotx', {
      provideDocumentFormattingEdits: () => []  // TODO: Add formatter
    })
  }

  /**
   * Validate text and return Monaco markers
   */
  validate(text: string): any[] {
    const result = this.diagnosticProvider.validate(text)
    return result.diagnostics.map(d => toMonacoMarker(d))
  }

  /**
   * Get Monaco Monarch token provider (syntax highlighting)
   */
  private getTokenProvider() {
    return {
      defaultToken: '',
      tokenPostfix: '.jotx',

      keywords: [
        'hdef', 'def', 'item', 'row', 'cell', 'section'
      ],

      blockTypes: [
        'jot', 'meeting', 'tasklist', 'journal',
        'heading1', 'heading2', 'heading3', 'paragraph', 'quote',
        'code', 'codeReference', 'list', 'checklist', 'table', 'image', 'link',
        'attach', 'callout', 'toggle', 'divider', 'datetime',
        'math', 'mermaid', 'chart', 'linkCard', 'custom'
      ],

      properties: [
        'title', 'text', 'language', 'type', 'variant', 'href',
        'src', 'alt', 'width', 'align', 'url', 'description',
        'image', 'siteName', 'timestamp', 'format', 'timezone',
        'display', 'columns', 'customType', 'icon', 'created',
        'modified', 'author', 'tags'
      ],

      enums: [
        'bulleted', 'numbered', 'info', 'warning', 'success', 'danger',
        'left', 'center', 'right', 'inline', 'block', 'true', 'false'
      ],

      tokenizer: {
        root: [
          // Comments
          [/#.*$/, 'comment'],

          // hdef and def
          [/^\s*(hdef|def)\s+/, { token: 'keyword', next: '@blockType' }],

          // item, row, cell, section
          [/^\s*(item|row|cell|section)\s+/, { token: 'keyword', next: '@identifier' }],

          // Properties
          [/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s+/, 'variable.parameter'],

          // Strings
          [/"""/, { token: 'string.quote', bracket: '@open', next: '@tripleString' }],
          [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

          // Enums
          [/\b(bulleted|numbered|info|warning|success|danger|left|center|right|inline|block|true|false)\b/, 'constant.language']
        ],

        blockType: [
          [/[a-zA-Z_][a-zA-Z0-9_]*/, { token: 'entity.name.type', next: '@identifier' }],
          [/\s+/, '']
        ],

        identifier: [
          [/[a-zA-Z_][a-zA-Z0-9_]*/, { token: 'entity.name.function', next: '@pop' }],
          [/\s+/, '']
        ],

        string: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
        ],

        tripleString: [
          [/[^"]+/, 'string'],
          [/"""/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
          [/"/, 'string']
        ]
      }
    }
  }
}

/**
 * Setup jotx language in Monaco editor
 * Call this once when initializing Monaco
 * 
 * @example
 * import * as monaco from 'monaco-editor'
 * import { setupJotxLanguage } from '@jotx-labs/language'
 * 
 * setupJotxLanguage(monaco)
 */
export function setupJotxLanguage(monaco: any): MonacoLanguageProvider {
  const provider = new MonacoLanguageProvider(monaco)
  provider.register()
  return provider
}

