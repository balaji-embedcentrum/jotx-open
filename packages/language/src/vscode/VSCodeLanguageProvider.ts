/**
 * VS Code integration for jotx
 * Use this in your VS Code extension
 */

import { DiagnosticProvider, JotxDiagnostic } from '../diagnostics/DiagnosticProvider'
import { registerAuthoring } from './JotxAuthoring'

// Type-only imports to avoid bundling VS Code in the package
type Diagnostic = any
type DiagnosticSeverity = any
type Range = any
type Position = any

/**
 * Convert jotx diagnostic to VS Code diagnostic
 */
export function toVSCodeDiagnostic(
  diagnostic: JotxDiagnostic,
  vscode: any
): Diagnostic {
  const severityMap = {
    'error': vscode.DiagnosticSeverity.Error,
    'warning': vscode.DiagnosticSeverity.Warning,
    'info': vscode.DiagnosticSeverity.Information,
    'hint': vscode.DiagnosticSeverity.Hint
  }

  const range = new vscode.Range(
    new vscode.Position(diagnostic.startLine, diagnostic.startColumn),
    new vscode.Position(diagnostic.endLine, diagnostic.endColumn)
  )

  const vscodeDiagnostic = new vscode.Diagnostic(
    range,
    diagnostic.message,
    severityMap[diagnostic.severity]
  )

  vscodeDiagnostic.code = diagnostic.code
  vscodeDiagnostic.source = diagnostic.source

  return vscodeDiagnostic
}

/**
 * VS Code language provider for jotx
 * Provides real-time diagnostics (red squiggles)
 */
export class VSCodeLanguageProvider {
  private diagnosticProvider: DiagnosticProvider
  private diagnosticCollection: any
  private vscode: any

  constructor(vscode: any) {
    this.vscode = vscode
    this.diagnosticProvider = new DiagnosticProvider()
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('jotx')
  }

  /**
   * Register diagnostic provider
   * Call this in extension activation
   */
  register(context: any) {
    // Update diagnostics on document change
    context.subscriptions.push(
      this.vscode.workspace.onDidChangeTextDocument((event: any) => {
        if (this.isJotxDocument(event.document)) {
          this.updateDiagnostics(event.document)
        }
      })
    )

    // Update diagnostics on document open
    context.subscriptions.push(
      this.vscode.workspace.onDidOpenTextDocument((document: any) => {
        if (this.isJotxDocument(document)) {
          this.updateDiagnostics(document)
        }
      })
    )

    // Clear diagnostics on document close
    context.subscriptions.push(
      this.vscode.workspace.onDidCloseTextDocument((document: any) => {
        if (this.isJotxDocument(document)) {
          this.diagnosticCollection.delete(document.uri)
        }
      })
    )

    // Register the diagnostic collection
    context.subscriptions.push(this.diagnosticCollection)

    // Validate all open jotx documents
    this.vscode.workspace.textDocuments.forEach((document: any) => {
      if (this.isJotxDocument(document)) {
        this.updateDiagnostics(document)
      }
    })
  }

  /**
   * Update diagnostics for a document
   */
  private updateDiagnostics(document: any) {
    const text = document.getText()
    const result = this.diagnosticProvider.validate(text)
    
    const vscodeDiagnostics = result.diagnostics.map(d => 
      toVSCodeDiagnostic(d, this.vscode)
    )

    this.diagnosticCollection.set(document.uri, vscodeDiagnostics)
  }

  /**
   * Check if document is a jotx file
   */
  private isJotxDocument(document: any): boolean {
    return document.languageId === 'jotx-note' || 
           document.fileName.endsWith('.jot') || 
           document.fileName.endsWith('.meet')
  }

  /**
   * Manually validate a document (for testing)
   */
  validateDocument(document: any): Diagnostic[] {
    const text = document.getText()
    const result = this.diagnosticProvider.validate(text)
    return result.diagnostics.map(d => toVSCodeDiagnostic(d, this.vscode))
  }

  /**
   * Clear all diagnostics
   */
  clear() {
    this.diagnosticCollection.clear()
  }

  /**
   * Dispose the provider
   */
  dispose() {
    this.diagnosticCollection.dispose()
  }
}

/**
 * Setup jotx language support in VS Code
 * Call this in your extension's activate() function
 * 
 * @example
 * import * as vscode from 'vscode'
 * import { setupJotxLanguage } from '@jotx-labs/language'
 * 
 * export function activate(context: vscode.ExtensionContext) {
 *   const provider = setupJotxLanguage(vscode, context)
 *   // ...
 * }
 */
export function setupJotxLanguage(vscode: any, context: any): VSCodeLanguageProvider {
  const provider = new VSCodeLanguageProvider(vscode)
  provider.register(context)
  // Completions + hovers for blocks, widgets and their properties
  registerAuthoring(vscode, context)
  return provider
}

