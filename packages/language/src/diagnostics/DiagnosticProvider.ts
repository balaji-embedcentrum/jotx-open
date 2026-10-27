/**
 * Platform-agnostic diagnostic provider for jotx
 * Works with VS Code, Monaco, or any other editor
 */

import { parse, validate } from '@jotx-labs/core'

/**
 * Generic diagnostic format (works for VS Code, Monaco, LSP, etc.)
 */
export interface JotxDiagnostic {
  message: string
  severity: 'error' | 'warning' | 'info' | 'hint'
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
  code?: string
  source: 'jotx'
}

/**
 * Result of validation
 */
export interface DiagnosticResult {
  diagnostics: JotxDiagnostic[]
  isValid: boolean
}

/**
 * Platform-agnostic diagnostic provider
 * Wraps @jotx-labs/core validate() and returns generic diagnostics
 */
export class DiagnosticProvider {

  /**
   * Validate jotx text and return diagnostics
   */
  validate(text: string): DiagnosticResult {
    // Parse the text
    let ast
    try {
      ast = parse(text)
    } catch (error) {
      // Parse error - point at the reported line ("Line 12: ...", 1-based)
      const message = error instanceof Error ? error.message : String(error)
      const reported = message.match(/^Line (\d+):/)
      const errorLine = reported ? Math.max(0, Number(reported[1]) - 1) : 0
      return {
        diagnostics: [{
          message: `Parse error: ${message}`,
          severity: 'error',
          startLine: errorLine,
          startColumn: 0,
          endLine: errorLine,
          endColumn: 1000,
          code: 'parse-error',
          source: 'jotx'
        }],
        isValid: false
      }
    }

    // Validate the AST
    const validation = validate(ast.document)

    // Convert validation errors to generic diagnostics
    const diagnostics: JotxDiagnostic[] = validation.map(err => {
      // Validator lines are 1-based; editor positions are 0-based
      const line = Math.max(0, ((err as any).line || 1) - 1)
      const column = (err as any).column || 0

      return {
        message: err.message,
        severity: this.getSeverity(err.type),
        startLine: line,
        startColumn: column,
        endLine: line,
        endColumn: 1000,
        code: err.type,
        source: 'jotx'
      }
    })

    return {
      diagnostics,
      isValid: validation.length === 0
    }
  }

  /**
   * Get severity level based on error type
   */
  private getSeverity(errorType?: string): 'error' | 'warning' | 'info' | 'hint' {
    if (!errorType) return 'error'

    // Map error types to severity levels
    switch (errorType) {
      case 'validation-error':
      case 'parse-error':
      case 'missing-required-property':
      case 'invalid-block-type':
        return 'error'

      case 'deprecated':
      case 'unused':
        return 'warning'

      case 'style':
      case 'formatting':
        return 'info'

      case 'suggestion':
        return 'hint'

      default:
        return 'error'
    }
  }

  /**
   * Quick validation - returns true/false only
   */
  isValid(text: string): boolean {
    return this.validate(text).isValid
  }

  /**
   * Get only error-level diagnostics
   */
  getErrors(text: string): JotxDiagnostic[] {
    return this.validate(text).diagnostics.filter(d => d.severity === 'error')
  }

  /**
   * Get only warning-level diagnostics
   */
  getWarnings(text: string): JotxDiagnostic[] {
    return this.validate(text).diagnostics.filter(d => d.severity === 'warning')
  }
}

/**
 * Singleton instance for convenience
 */
export const diagnosticProvider = new DiagnosticProvider()

