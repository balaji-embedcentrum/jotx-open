/**
 * Main App Component - Using @jotx-labs/core types
 * Sends Tiptap JSON to extension for conversion
 * 
 * CRITICAL: getVSCodeAPI() must be called BEFORE any @jotx-labs/editor imports!
 * The editor package has components that import vscode-api.ts which will try to
 * call acquireVsCodeApi(). We must call it first and set window.vscodeApi.
 */

import React, { useState, useEffect } from 'react'

// CRITICAL: Import and call this FIRST before any @jotx-labs/editor imports!
// This acquires the VS Code API and stores it on window.vscodeApi
import { getVSCodeAPI } from './vscode-api'
const vscode = getVSCodeAPI()  // This sets window.vscodeApi

// Now safe to import editor package (it will find window.vscodeApi)
import { ThemeProvider } from './theme/ThemeProvider'
import { NodeManagerProvider } from './contexts/NodeManagerContext'
import { BridgeProvider, DocumentHeader, EditorModeProvider, JotxEditor } from '@jotx-labs/editor'  // Phase 2: Using shared editor package
import { EditorNodeManagerBridge } from './components/EditorNodeManagerBridge'
import { SpellCheckService } from './services/SpellCheckService'
import { getVSCodeBridge } from './bridge/VSCodeBridge'
import { exportHelpDocsToWorkspace, openLocalGraph } from './lib/vscodeBridge'
import './App.css'

import { registerStandardBlocks } from '@jotx-labs/standard-lib'
import { logger } from '../utils/logger'

// Register core blocks available in the webview
registerStandardBlocks()

// Initialize the platform bridge (for future Phase 2 component integration)
const bridge = getVSCodeBridge()
logger.log('📦 VSCodeBridge initialized, platform:', bridge.getPlatform())

// jotx 2.0: Extension sends Tiptap JSON (from TiptapAdapter)
interface DocumentData {
  id: string
  documentType: string
  tiptapDoc: any  // Tiptap JSON format
  metadata?: Record<string, any>
  documentUri?: string  // Full document URI for graph icon
}

interface ValidationError {
  message: string
  type: string
  severity: string
}

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

export function App() {
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [ribbonExpanded, setRibbonExpanded] = useState(true)  // Ribbon expanded by default

  // CRITICAL: Log immediately when script loads
  logger.log('🎬 WEBVIEW SCRIPT LOADED!')
  logger.log('🔍 React version:', React.version)
  logger.log('🌍 Window location:', window.location.href)

  useEffect(() => {
    logger.log('🚀 jotx App mounting...')
    logger.log('📦 Initial state:', { document, isLoading })

    // Handle messages from VS Code extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data
      logger.log('📨 Received message:', message.type, message)

      switch (message.type) {
        case 'init':
          logger.log('📄 Initializing document:', message.document)
          setDocument(message.document)
          setValidation(message.validation || null)
          setSyncError(null)
          if (message.validation && !message.validation.isValid) {
            logger.warn('⚠️ Document has validation errors:', message.validation.errors)
          }

          // Apply spell check setting from VS Code config
          if (message.settings && typeof message.settings.spellCheckEnabled === 'boolean') {
            logger.log('📝 Setting spell check enabled:', message.settings.spellCheckEnabled)
            SpellCheckService.enabled = message.settings.spellCheckEnabled
          }

          setIsLoading(false)
          break

        case 'update':
        case 'documentUpdated':
          logger.log('🔄 Updating document from external change')
          setDocument(message.document)
          setValidation(message.validation || null)
          if (message.validation && !message.validation.isValid) {
            logger.warn('⚠️ Document has validation errors:', message.validation.errors)
          }
          break

        case 'templateList':
          logger.log('📋 App.tsx received template list:', message.templates)
          logger.log('🔄 Dispatching window event: templateList')
          window.dispatchEvent(new CustomEvent('templateList', { detail: message.templates }))
          logger.log('✅ Event dispatched')
          break

        case 'templateContent':
          logger.log('📄 Received template content message:', message)
          logger.log('📄 message.content:', message.content)
          logger.log('📄 Dispatching templateContent event with detail:', message.content)
          window.dispatchEvent(new CustomEvent('templateContent', { detail: message.content }))
          logger.log('✅ templateContent event dispatched')
          break
      }
    }

    window.addEventListener('message', handleMessage)

    // Request initial document
    logger.log('📤 Requesting initial document...')
    vscode.postMessage({ type: 'ready' })

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  const handleContentChange = (tiptapJson: string) => {
    logger.log('✏️ Content changed (jotx 2.0), sending Tiptap JSON to extension...')

    // DEBUG: Parse and inspect the content
    const parsed = JSON.parse(tiptapJson)
    const types = parsed.content?.map((n: any) => n.type) || []
    logger.log('📦 Block types in Tiptap JSON:', types)

    // Check for gridcard/card/button
    const hasGridcard = types.includes('gridcard')
    const hasButton = types.includes('button')
    logger.log(`🔍 Contains gridcard: ${hasGridcard}, button: ${hasButton}`)

    // Log any gridcard details
    parsed.content?.filter((n: any) => n.type === 'gridcard').forEach((gc: any, i: number) => {
      logger.log(`🃏 GridCard[${i}]:`, gc)
      logger.log(`   - layout: ${gc.attrs?.layout}`)
      logger.log(`   - children:`, gc.content?.map((c: any) => c.type))
    })

    // Send Tiptap JSON to extension
    // Extension will convert: Tiptap JSON → BlockNode[] → jotx text
    vscode.postMessage({
      type: 'contentChange',
      tiptapDoc: parsed,
      metadata: document?.metadata || {}
    })
  }

  const handleMetadataChange = (metadata: Record<string, any>) => {
    logger.log('📝 Metadata changed (jotx 2.0):', metadata)

    // Optimistic UI update
    setDocument(prev => {
      if (!prev) return prev
      return { ...prev, metadata: { ...(prev.metadata || {}), ...metadata } }
    })

    // Send to extension
    vscode.postMessage({
      type: 'metadataChange',
      metadata
    })
  }

  if (isLoading) {
    return (
      <NodeManagerProvider>
        <ThemeProvider>
          <div className="jotx-loading">
            <div className="jotx-loading-spinner" />
            <div className="jotx-loading-text">Loading jotx...</div>
          </div>
        </ThemeProvider>
      </NodeManagerProvider>
    )
  }

  // jotx 2.0: Use new document structure
  const docId = document?.id || 'untitled'
  const docType = document?.documentType || 'jot'
  const docTitle = document?.metadata?.title || 'Untitled'
  const docIcon = document?.metadata?.icon
  const docContentType = document?.metadata?.type // New cosmetic field
  const tiptapDoc = document?.tiptapDoc || { type: 'doc', content: [] }

  return (
    <BridgeProvider bridge={bridge}>
      <NodeManagerProvider>
        <ThemeProvider>
          {/* Shared edit/preview mode: the header lock toggle drives the editor */}
          <EditorModeProvider>
          <div className="jotx-app">
            {/* Header - ALWAYS visible */}
            <DocumentHeader
              documentId={docId}
              documentUri={document?.documentUri}
              documentType={docType as any}
              contentType={docContentType}
              title={docTitle}
              icon={docIcon}
              onTitleChange={(title) => handleMetadataChange({ title })}
              onIconChange={(icon) => handleMetadataChange({ icon })}
              onContentTypeChange={(type) => handleMetadataChange({ type: type })}
              onOpenGraph={document?.documentUri ? () => openLocalGraph(document.documentUri!) : undefined}
              onCopyHelpFiles={async () => { try { await exportHelpDocsToWorkspace() } catch { } }}
              ribbonExpanded={ribbonExpanded}
              onToggleRibbon={() => setRibbonExpanded(!ribbonExpanded)}
            />

            {/* Sync Error Banner */}
            {syncError && (
              <div className="jotx-sync-error">
                <div className="jotx-error-banner">
                  <div className="jotx-error-icon">🛑</div>
                  <div className="jotx-error-content">
                    <div className="jotx-error-title">Save blocked to protect your file</div>
                    <div className="jotx-error-list">
                      <div className="jotx-error-item">{syncError}</div>
                    </div>
                    <div className="jotx-error-help">
                      Switch to text editor to fix the underlying issue, then retry. Your original file is still intact.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Errors Banner */}
            {validation && !validation.isValid && (
              <div className="jotx-validation-errors">
                <div className="jotx-error-banner">
                  <div className="jotx-error-icon">⚠️</div>
                  <div className="jotx-error-content">
                    <div className="jotx-error-title">
                      {validation.errors.length} Validation {validation.errors.length === 1 ? 'Error' : 'Errors'}
                    </div>
                    <div className="jotx-error-list">
                      {validation.errors.map((error, index) => (
                        <div key={index} className="jotx-error-item">
                          • {(error as any).line ? `Line ${(error as any).line}: ` : ''}{error.message}
                        </div>
                      ))}
                    </div>
                    <div className="jotx-error-help">
                      Fix these errors in the text editor (right-click → Open With → Text Editor) or check the Output panel (View → Output → jotx)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Editor */}
            <div className="jotx-editor-container">
              <EditorNodeManagerBridge>
                <JotxEditor
                  documentId={docId}
                  documentType={docType as any}
                  tiptapDoc={tiptapDoc}
                  onChange={handleContentChange}
                  ribbonExpanded={ribbonExpanded}
                />
              </EditorNodeManagerBridge>
            </div>
          </div>
          </EditorModeProvider>
        </ThemeProvider>
      </NodeManagerProvider>
    </BridgeProvider>
  )
}
