/**
 * @jotx-labs/language - Platform-agnostic language support
 * 
 * Provides:
 * - Syntax highlighting (TextMate grammar for VS Code & Monaco)
 * - Diagnostics/Linting (works in any editor)
 * - VS Code integration helpers
 * - Monaco integration helpers
 */

// ============================================================================
// Core Diagnostics (Platform-agnostic)
// ============================================================================
export {
  DiagnosticProvider,
  diagnosticProvider,
  JotxDiagnostic,
  DiagnosticResult
} from './diagnostics/DiagnosticProvider'

// ============================================================================
// VS Code Integration
// ============================================================================
export {
  VSCodeLanguageProvider,
  setupJotxLanguage as setupJotxLanguageForVSCode,
  toVSCodeDiagnostic
} from './vscode/VSCodeLanguageProvider'

// ============================================================================
// Monaco Integration
// ============================================================================
export {
  MonacoLanguageProvider,
  setupJotxLanguage as setupJotxLanguageForMonaco,
  toMonacoMarker,
  MonacoSeverity
} from './monaco/MonacoLanguageProvider'

// ============================================================================
// Grammar (for manual use if needed)
// ============================================================================
// Export path to grammar file for VS Code extension manifest
export const GRAMMAR_PATH = './grammar/jotx.tmLanguage.json'

