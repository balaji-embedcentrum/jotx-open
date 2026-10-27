/**
 * jotx 2.0 NoteEditorProvider - Clean Architecture
 * 
 * Uses:
 * - @jotx-labs/core: parse(), serialize(), validate()
 * - @jotx-labs/adapters: TiptapAdapter
 * 
 * No platform abstraction, handles file I/O directly with VS Code API
 */

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { parse, serialize, validate, BlockNode, DocumentNode, jotToMarkdown, detectSyntaxStyle, type SyntaxStyle } from '@jotx-labs/core'
import { TiptapAdapter } from '@jotx-labs/adapters'
import { registry } from '@jotx-labs/registry'
import { registerStandardBlocks } from '@jotx-labs/standard-lib'
import { DOCXExporter } from './exporters/DOCXExporter'
import { PDFExporter } from './exporters/PDFExporter'
import { logger } from './utils/logger'

export class NoteEditorProvider implements vscode.CustomTextEditorProvider {

  private static readonly viewType = 'jotx.noteEditor'
  private tiptapAdapter: TiptapAdapter
  private isApplyingEdit = false
  private isSaving = false
  private pendingUpdates = new Map<string, any>()  // Queue for content changes that arrive during save
  private lastSafeSerializedTextByUri = new Map<string, string>()

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly outputChannel: vscode.OutputChannel
  ) {
    this.tiptapAdapter = new TiptapAdapter()
    this.outputChannel.appendLine('✅ NoteEditorProvider initialized (jotx 2.0)')
  }

  public static register(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel): vscode.Disposable {
    outputChannel.appendLine('📝 Registering NoteEditorProvider (jotx 2.0)...')
    const provider = new NoteEditorProvider(context, outputChannel)
    const options = {
      webviewOptions: {
        retainContextWhenHidden: true,
        enableScripts: true,
      },
    }
    return vscode.window.registerCustomEditorProvider(
      NoteEditorProvider.viewType,
      provider,
      options
    )
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {

    this.outputChannel.appendLine(`📂 Opening file: ${document.fileName}`)

    try {
      // Configure webview
      const wf = vscode.workspace.getWorkspaceFolder(document.uri) || vscode.workspace.workspaceFolders?.[0]
      const docDir = vscode.Uri.file(path.dirname(document.uri.fsPath))
      const outDir = vscode.Uri.file(path.join(this.context.extensionPath, 'out'))

      this.outputChannel.appendLine(`debug: docDir=${docDir.toString()}`)
      this.outputChannel.appendLine(`debug: outDir=${outDir.toString()}`)

      webviewPanel.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          outDir,
          ...(wf ? [wf.uri] : []),
          docDir
        ]
      }
    } catch (e: any) {
      this.outputChannel.appendLine(`❌ Error configuring webview: ${e?.message}`)
      throw e
    }

    // Parse document using jotx 2.0 API
    this.outputChannel.appendLine(`🔍 Debug: Registry size before parse: ${registry.getAll().length}`)
    if (registry.getAll().length === 0) {
      this.outputChannel.appendLine('⚠️ Registry empty! Re-registering standard blocks locally...')
      registerStandardBlocks()
      this.outputChannel.appendLine(`✅ Registry size after fix: ${registry.getAll().length}`)
    }

    let ast = this.parseDocument(document)
    this.outputChannel.appendLine(`✅ Parsed with jotx 2.0: ${ast.document.id}`)
    this.lastSafeSerializedTextByUri.set(document.uri.toString(), document.getText())

    // Validate
    const validationResult = validate(ast.document)
    const errors = validationResult.filter(e => e.severity === 'error')
    const warnings = validationResult.filter(e => e.severity === 'warning')

    this.outputChannel.appendLine(`✅ Checked: ${ast.document.id} (Errors: ${errors.length}, Warnings: ${warnings.length})`)

    if (errors.length > 0) {
      errors.forEach(err => {
        this.outputChannel.appendLine(`  ❌ Error: ${err.message} (Line ${err.line})`)
      })
    }

    // Set webview HTML
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview)

    // Convert blocks to Tiptap format for editor
    const tiptapDoc = {
      type: 'doc',
      content: ast.document.blocks.map(b => this.tiptapAdapter.blockToTiptap(b))
    }

    // DEBUG: Log blocks from parser and tiptap conversion
    this.outputChannel.appendLine(`📥 LOAD: Parsed ${ast.document.blocks.length} blocks from file:`)
    ast.document.blocks.forEach((b, i) => {
      this.outputChannel.appendLine(`  [${i}] type="${b.type}" children=${b.children?.length || 0}`)
      if (b.type === 'gridcard' && b.children) {
        b.children.forEach((c, j) => {
          this.outputChannel.appendLine(`    [${i}.${j}] child type="${c.type}"`)
        })
      }
    })
    this.outputChannel.appendLine(`📤 LOAD: Tiptap doc has ${tiptapDoc.content.length} nodes`)

    // Resolve live code references
    await this.resolveCodeReferences(tiptapDoc, document)

    // Convert relative attachment paths to webview URIs for display
    this.convertAttachmentPathsToWebviewUris(tiptapDoc, document, webviewPanel.webview)

    // Send initial data to webview
    const sendDocument = () => {
      this.outputChannel.appendLine(`📤 Sending document to webview: ID=${ast.document.id}, Type=${ast.document.type}`)
      this.outputChannel.appendLine(`📋 Metadata to send: ${JSON.stringify(ast.document.metadata)}`)

      // Read spell check setting from VS Code configuration
      const config = vscode.workspace.getConfiguration('jotx')
      const spellCheckEnabled = config.get<boolean>('spellCheck.enabled', true)
      this.outputChannel.appendLine(`📝 Spell check enabled: ${spellCheckEnabled}`)

      webviewPanel.webview.postMessage({
        type: 'init',
        document: {
          id: ast.document.id,
          documentType: ast.document.type,
          metadata: ast.document.metadata,
          tiptapDoc,  // Send Tiptap JSON for editor
          documentUri: document.uri.toString()  // Pass document URI for graph icon
        },
        settings: {
          spellCheckEnabled
        },
        validation: {
          isValid: validationResult.length === 0,
          errors: validationResult.filter(e => e.severity === 'error').map(e => ({
            message: e.message,
            type: e.type,
            severity: e.severity,
            line: e.line  // Include line number for display
          })),
          warnings: validationResult.filter(e => e.severity === 'warning').map(w => ({
            message: w.message,
            type: w.type,
            severity: w.severity,
            line: w.line  // Include line number for display
          }))
        }
      })
      this.outputChannel.appendLine('📤 Sent document to webview (Tiptap format)')
    }

    // Handle messages from webview
    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      // Log ALL incoming messages for debugging
      this.outputChannel.appendLine(`📩 Message received: ${message.type} ${JSON.stringify(message.payload || {}).substring(0, 100)}`);

      switch (message.type) {
        case 'ready':
          this.outputChannel.appendLine('📨 Webview ready')
          sendDocument()
          break

        case 'contentChange':
          // Webview sends Tiptap JSON when content changes
          this.outputChannel.appendLine('✏️  Content changed (Tiptap JSON)')

          // Queue the latest update - don't drop it!
          const pendingKey = document.uri.toString()

          if (this.isSaving) {
            this.outputChannel.appendLine('⏳ Save in progress, queueing update for later...')
            this.pendingUpdates.set(pendingKey, message)
            break
          }

          this.isSaving = true
          try {
            const uriKey = document.uri.toString()
            const prevText = this.lastSafeSerializedTextByUri.get(uriKey) ?? document.getText()
            const prevBlockCount = ast.document.blocks?.length ?? 0
            const prevCharCount = prevText.length

            // Convert Tiptap JSON → BlockNode[]
            const blocks = this.tiptapAdapter.tiptapToBlocks(message.tiptapDoc)
            const nextBlockCount = blocks?.length ?? 0

            // DEBUG: Log block types found during conversion
            this.outputChannel.appendLine(`📦 Converted ${nextBlockCount} blocks:`)
            blocks?.forEach((b, i) => {
              this.outputChannel.appendLine(`  [${i}] type="${b.type}" id="${b.id}" children=${b.children?.length || 0}`)
              // Log card children specifically
              if (b.type === 'gridcard' && b.children) {
                b.children.forEach((child, j) => {
                  this.outputChannel.appendLine(`    [${i}.${j}] child type="${child.type}"`)
                })
              }
            })

            // Build AST
            const updatedAst: DocumentNode = {
              ...ast.document,
              blocks,
              metadata: {
                ...ast.document.metadata,
                ...message.metadata  // Allow metadata updates from webview
              }
            }

            // Serialize to jotx text
            const text = serialize({ document: updatedAst }, { style: this.syntaxFor(document) })
            this.outputChannel.appendLine(`✅ Serialized to jotx (${text.length} chars)`)

            // DEBUG: Log if gridcard was serialized
            if (text.includes('def gridcard')) {
              this.outputChannel.appendLine(`🎯 Found 'def gridcard' in serialized output!`)
            } else if (blocks?.some(b => b.type === 'gridcard')) {
              this.outputChannel.appendLine(`⚠️ Gridcard block exists but NOT in serialized text!`)
            }

            // SAFETY GUARD: prevent destructive overwrites if round-trip conversion collapses the document
            const nextCharCount = text.length
            const isSuspiciousShrink =
              (prevBlockCount >= 10 && nextBlockCount <= 2) ||
              (prevBlockCount >= 20 && nextBlockCount < Math.floor(prevBlockCount * 0.5)) ||
              (prevCharCount >= 2000 && nextCharCount < Math.floor(prevCharCount * 0.4))

            if (isSuspiciousShrink) {
              const msg = `jotx prevented a destructive save: blocks ${prevBlockCount} → ${nextBlockCount}, chars ${prevCharCount} → ${nextCharCount}. Your file was NOT overwritten.`
              this.outputChannel.appendLine(`🛑 ${msg}`)
              vscode.window.showErrorMessage(msg)
              webviewPanel.webview.postMessage({
                type: 'syncError',
                message: msg,
                details: { prevBlockCount, nextBlockCount, prevCharCount, nextCharCount }
              })
              this.isSaving = false
              break
            }

            // Write to VS Code document
            await this.updateDocument(document, text)

            // Update local AST
            ast = { document: updatedAst, errors: [] }
            this.lastSafeSerializedTextByUri.set(uriKey, text)
          } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to save: ${error}`)
            vscode.window.showErrorMessage(`Failed to save: ${error}`)
          } finally {
            this.isSaving = false

            // Process any pending update that arrived during save
            const pendingMessage = this.pendingUpdates.get(pendingKey)
            if (pendingMessage) {
              this.pendingUpdates.delete(pendingKey)
              this.outputChannel.appendLine('🔄 Processing queued update...')
              // Emit a synthetic message event to re-process the pending content
              // We do this by directly calling the save logic with the pending data
              const pendingBlocks = this.tiptapAdapter.tiptapToBlocks(pendingMessage.tiptapDoc)
              const pendingUpdatedAst: DocumentNode = {
                ...ast.document,
                blocks: pendingBlocks,
                metadata: {
                  ...ast.document.metadata,
                  ...pendingMessage.metadata
                }
              }
              const pendingText = serialize({ document: pendingUpdatedAst }, { style: this.syntaxFor(document) })
              this.outputChannel.appendLine(`🔄 Processing queued save (${pendingText.length} chars)`)
              this.updateDocument(document, pendingText).then(() => {
                ast = { document: pendingUpdatedAst, errors: [] }
                this.lastSafeSerializedTextByUri.set(pendingKey, pendingText)
                this.outputChannel.appendLine('✅ Queued update saved!')
              }).catch(err => {
                this.outputChannel.appendLine(`❌ Failed to save queued update: ${err}`)
              })
            }
          }
          break

        case 'metadataChange':
          // Update only metadata without touching blocks
          this.outputChannel.appendLine('📝 Metadata updated')
          try {
            const updatedAst: DocumentNode = {
              ...ast.document,
              metadata: {
                ...ast.document.metadata,
                ...message.metadata
              }
            }

            const text = serialize({ document: updatedAst }, { style: this.syntaxFor(document) })
            await this.updateDocument(document, text)
            ast = { document: updatedAst, errors: [] }
          } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to update metadata: ${error}`)
          }
          break

        case 'openExternal':
          // Handle external links
          await vscode.env.openExternal(vscode.Uri.parse(message.url))
          break

        case 'pickAttachment':
          // Handle file picker for attachments
          const result = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false
          })

          webviewPanel.webview.postMessage({
            type: 'attachmentPicked',
            requestId: message.requestId,
            filePath: result && result[0] ? result[0].fsPath : null
          })
          break

        case 'showMessage':
          // Show VS Code message
          switch (message.level) {
            case 'error':
              vscode.window.showErrorMessage(message.message)
              break
            case 'warning':
              vscode.window.showWarningMessage(message.message)
              break
            default:
              vscode.window.showInformationMessage(message.message)
          }
          break

        case 'exportHelpDocs':
          try {
            await vscode.commands.executeCommand('jotx.openHelp')
            webviewPanel.webview.postMessage({
              ok: true,
              requestId: message.requestId
            })
          } catch (error: any) {
            webviewPanel.webview.postMessage({
              ok: false,
              requestId: message.requestId,
              error: error.message
            })
          }
          break

        case 'exportDocument':
          // Handle document export (MD, DOCX, PDF)
          try {
            const format = message.format as 'md' | 'docx' | 'pdf'
            const title = ast.document.metadata?.title || 'Untitled'
            const fileName = title.replace(/[^a-zA-Z0-9-_]/g, '_')

            logger.log(`📄 Export requested: ${format} for "${title}"`)

            let buffer: Buffer | string
            let fileExtension: string
            let filterName: string

            // Export based on format
            switch (format) {
              case 'md':
                // Convert to Markdown
                const fullAst = { ...ast, errors: [] }
                const markdown = jotToMarkdown(fullAst)
                buffer = markdown
                fileExtension = 'md'
                filterName = 'Markdown'
                break

              case 'docx':
                // Convert to DOCX
                const docxExporter = new DOCXExporter()
                buffer = await docxExporter.export(ast.document.blocks, title)
                fileExtension = 'docx'
                filterName = 'Word Document'
                break

              case 'pdf':
                // Convert to PDF using frontend-captured HTML/CSS
                const pdfExporter = new PDFExporter()

                logger.log('🔄 PDF export: checking HTML/CSS from frontend...')

                if (message.html && message.css) {
                  // Use frontend HTML for exact visual fidelity
                  logger.log(`✅ HTML/CSS provided, using puppeteer-core...`)
                  logger.log(`📏 HTML length: ${message.html.length} chars, CSS length: ${message.css.length} chars`)
                  logger.log(`📄 HTML preview (first 500 chars): ${message.html.substring(0, 500)}...`)
                  const pdfBuffer = await pdfExporter.exportFromHTML(message.html, message.css, title)

                  // If buffer is null, signal frontend to use jsPDF
                  if (pdfBuffer === null) {
                    logger.log('⚠️ Puppeteer failed, signaling frontend to use jsPDF fallback...')
                    webviewPanel.webview.postMessage({
                      type: 'useFrontendPDF',
                      requestId: message.requestId,
                      fileName: fileName
                    })
                    return // Exit early, frontend will handle PDF generation
                  }

                  logger.log('✅ PDF generated with puppeteer-core, showing save dialog...')
                  buffer = pdfBuffer
                } else {
                  // Fallback to AST conversion
                  logger.log('⚠️ No HTML/CSS, using AST fallback...')
                  const fullAstForPdf = { ...ast, errors: [] }
                  buffer = await pdfExporter.export(fullAstForPdf, title)
                }

                fileExtension = 'pdf'
                filterName = 'PDF Document'
                break

              default:
                throw new Error(`Unsupported format: ${format}`)
            }

            // Prompt user for save location
            logger.log('📁 Showing save dialog...')
            const uri = await vscode.window.showSaveDialog({
              defaultUri: vscode.Uri.file(path.join(path.dirname(document.uri.fsPath), `${fileName}.${fileExtension}`)),
              filters: {
                [filterName]: [fileExtension]
              }
            })

            if (uri) {
              if (typeof buffer === 'string') {
                fs.writeFileSync(uri.fsPath, buffer, 'utf8')
              } else {
                fs.writeFileSync(uri.fsPath, buffer)
              }
              vscode.window.showInformationMessage(`✅ Exported to ${path.basename(uri.fsPath)}`)

              webviewPanel.webview.postMessage({
                type: 'exportComplete',
                requestId: message.requestId,
                savedPath: uri.fsPath
              })
            } else {
              webviewPanel.webview.postMessage({
                type: 'exportCancelled',
                requestId: message.requestId
              })
            }
          } catch (error: any) {
            vscode.window.showErrorMessage(`❌ Export failed: ${error.message}`)
            webviewPanel.webview.postMessage({
              type: 'exportError',
              requestId: message.requestId,
              error: error.message
            })
          }
          break

        case 'savePDFBuffer':
          // Handle PDF buffer from frontend jsPDF (fallback mode)
          logger.log('📦 Received PDF buffer from frontend (jsPDF fallback)')
          try {
            const fileName = message.fileName || 'Untitled'
            const buffer = Buffer.from(message.buffer)

            logger.log(`📁 Showing save dialog for: ${fileName}.pdf`)

            // Prompt user for save location
            const uri = await vscode.window.showSaveDialog({
              defaultUri: vscode.Uri.file(path.join(path.dirname(document.uri.fsPath), `${fileName}.pdf`)),
              filters: {
                'PDF Document': ['pdf']
              }
            })

            logger.log(`💾 Save dialog result:`, uri ? uri.fsPath : 'CANCELLED')

            if (uri) {
              fs.writeFileSync(uri.fsPath, buffer)
              vscode.window.showInformationMessage(`✅ Exported to ${path.basename(uri.fsPath)}`)

              webviewPanel.webview.postMessage({
                type: 'exportComplete',
                requestId: message.requestId,
                savedPath: uri.fsPath
              })
            } else {
              webviewPanel.webview.postMessage({
                type: 'exportCancelled',
                requestId: message.requestId
              })
            }
          } catch (error: any) {
            vscode.window.showErrorMessage(`❌ PDF save failed: ${error.message}`)
            webviewPanel.webview.postMessage({
              type: 'exportError',
              requestId: message.requestId,
              error: error.message
            })
          }
          break

        case 'savePastedImage':
          // Handle pasted image save to attachments folder
          try {
            const requestId = message.requestId
            const docDir = path.dirname(document.uri.fsPath)
            const attachmentsDir = path.join(docDir, 'attachments')

            // Create attachments directory if it doesn't exist
            if (!fs.existsSync(attachmentsDir)) {
              fs.mkdirSync(attachmentsDir, { recursive: true })
            }

            const mime = String(message?.input?.mime || 'image/png')
            const isSvg = mime === 'image/svg+xml'
            const ext = isSvg ? 'svg' : 'png'
            const name = `img_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`
            const filePath = path.join(attachmentsDir, name)

            if (isSvg) {
              const svgText = String(message?.input?.text || '').trim()
              if (!svgText) throw new Error('Empty SVG')
              fs.writeFileSync(filePath, svgText, 'utf8')
            } else {
              const base64 = String(message?.input?.base64 || '')
              if (!base64) throw new Error('Empty image payload')
              const buffer = Buffer.from(base64, 'base64')
              fs.writeFileSync(filePath, buffer)
            }

            const relPath = `attachments/${name}`
            const webviewUri = webviewPanel.webview.asWebviewUri(vscode.Uri.file(filePath)).toString()

            webviewPanel.webview.postMessage({
              requestId,
              ok: true,
              result: { relPath, webviewUri }
            })
          } catch (err: any) {
            webviewPanel.webview.postMessage({
              requestId: message.requestId,
              ok: false,
              error: String(err?.message || err)
            })
          }
          break

        case 'saveImage':
          // Handle image save to attachments folder
          try {
            const { base64, mime, fileName } = message.data
            const docDir = path.dirname(document.uri.fsPath)
            const attachmentsDir = path.join(docDir, 'attachments')

            // Create attachments directory if it doesn't exist
            if (!fs.existsSync(attachmentsDir)) {
              fs.mkdirSync(attachmentsDir, { recursive: true })
            }

            // Save image file
            const filePath = path.join(attachmentsDir, fileName)
            const buffer = Buffer.from(base64, 'base64')
            fs.writeFileSync(filePath, buffer)

            // Return BOTH relative path (for .jot file) AND webview URI (for display)
            const relativePath = `attachments/${fileName}`
            const webviewUri = webviewPanel.webview.asWebviewUri(vscode.Uri.file(filePath)).toString()

            webviewPanel.webview.postMessage({
              type: 'imageSaved',
              requestId: message.requestId,
              success: true,
              relativePath,
              webviewUri
            })
          } catch (error: any) {
            webviewPanel.webview.postMessage({
              type: 'imageSaved',
              requestId: message.requestId,
              success: false,
              error: error.message
            })
          }
          break

        case 'saveVideo':
          // Handle video save to attachments folder
          try {
            const { filePath: sourceFilePath, fileName } = message.data
            const docDir = path.dirname(document.uri.fsPath)
            const attachmentsDir = path.join(docDir, 'attachments')

            // Create attachments directory if it doesn't exist
            if (!fs.existsSync(attachmentsDir)) {
              fs.mkdirSync(attachmentsDir, { recursive: true })
            }

            // Copy video file
            const destFileName = fileName || path.basename(sourceFilePath)
            const destFilePath = path.join(attachmentsDir, destFileName)
            fs.copyFileSync(sourceFilePath, destFilePath)

            // Return BOTH relative path (for .jot file) AND webview URI (for display)
            const relativePath = `attachments/${destFileName}`
            const webviewUri = webviewPanel.webview.asWebviewUri(vscode.Uri.file(destFilePath)).toString()

            webviewPanel.webview.postMessage({
              type: 'videoSaved',
              requestId: message.requestId,
              success: true,
              relativePath,
              webviewUri
            })
          } catch (error: any) {
            webviewPanel.webview.postMessage({
              type: 'videoSaved',
              requestId: message.requestId,
              success: false,
              error: error.message
            })
          }
          break

        case 'openExternal':
          // Open URL in default browser (used for YouTube videos)
          try {
            const urlToOpen = message.url
            if (urlToOpen) {
              vscode.env.openExternal(vscode.Uri.parse(urlToOpen))
              this.outputChannel.appendLine(`🌐 Opening external URL: ${urlToOpen}`)
            }
          } catch (error: any) {
            this.outputChannel.appendLine(`❌ Failed to open external URL: ${error.message}`)
          }
          break

        case 'runCode':
          // Handle executing code in terminal
          try {
            const { language, code } = message
            this.outputChannel.appendLine(`🚀 Running ${language} code...`)

            // Determine command based on language
            // This is basic - in future could make this configurable
            const terminalName = `jotx Run: ${language}`
            let terminal = vscode.window.terminals.find(t => t.name === terminalName)
            if (!terminal) {
              terminal = vscode.window.createTerminal(terminalName)
            }

            terminal.show(true)

            // Execute code based on language
            // For simple REPL languages we send code directly.
            // For compiled languages, this requires more complex logic or just pasting.
            // For now, supporting common script languages.

            if (['typescript', 'javascript', 'js', 'ts'].includes(language)) {
              // If node is available
              // We could create a tmp file
              // For now, assume a REPL or simply paste
              // Ideally: node -e "code"
              // But multiline code needs escaping. 
              // Better strategy: Simple sendText (pasting into shell)
              terminal.sendText(code)
            } else if (['python', 'py'].includes(language)) {
              // Python REPL or script
              terminal.sendText('python3 -c "') // Start python command
              // This is tricky. 
              // Most robust way for now: just send the text to the terminal standard input
              // The user might be in a python REPL or just bash
              // Let's just send the text and let the user handle context for now (MVP)
              // OR: Write to temp file and run it. this is safer.

              const tmpDir = path.join(this.context.extensionPath, 'tmp')
              if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
              const tmpFile = path.join(tmpDir, `run_${Date.now()}.py`)
              fs.writeFileSync(tmpFile, code)
              terminal.sendText(`python3 "${tmpFile}"`)
            } else if (['bash', 'sh', 'shell'].includes(language)) {
              terminal.sendText(code)
            } else {
              // Default behavior: paste into terminal
              terminal.sendText(code)
            }

          } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to run code: ${error.message}`)
          }
          break

        case 'openFile':
          try {
            let filePath = message.path as string
            if (filePath) {
              this.outputChannel.appendLine(`📂 Opening file: ${filePath}`)

              // Special handling for :previous - go to previously opened editor
              if (filePath === ':previous') {
                this.outputChannel.appendLine(`   Using VS Code's native previous editor`)
                await vscode.commands.executeCommand('workbench.action.openPreviousRecentlyUsedEditor')
                webviewPanel.webview.postMessage({
                  requestId: message.requestId,
                  ok: true,
                  result: true
                })
                break
              }

              // Resolve relative paths based on current document location
              if (!path.isAbsolute(filePath)) {
                const docDir = path.dirname(document.uri.fsPath)
                filePath = path.resolve(docDir, filePath)
                this.outputChannel.appendLine(`   Resolved to: ${filePath}`)
              }

              const uri = vscode.Uri.file(filePath)
              await vscode.commands.executeCommand('vscode.open', uri)
              webviewPanel.webview.postMessage({
                requestId: message.requestId,
                ok: true,
                result: true
              })
            }
          } catch (e: any) {
            this.outputChannel.appendLine(`❌ Open file failed: ${e.message}`)
            webviewPanel.webview.postMessage({
              requestId: message.requestId,
              error: e.message
            })
          }
          break

        case 'openLocalGraph':
          try {
            const documentUri = message.documentUri as string
            if (documentUri) {
              // Execute the show local graph command with the document URI
              await vscode.commands.executeCommand('jotx.showLocalGraphForUri', documentUri)
            }
          } catch (e: any) {
            this.outputChannel.appendLine(`❌ Open local graph failed: ${e.message}`)
          }
          break

        case 'openFileAtLine':
          try {
            const { path: relPath, line } = message
            const workspaceFolders = vscode.workspace.workspaceFolders
            if (!workspaceFolders) return
            const fullPath = vscode.Uri.file(path.join(workspaceFolders[0].uri.fsPath, relPath))

            const doc = await vscode.workspace.openTextDocument(fullPath)
            const editor = await vscode.window.showTextDocument(doc)

            // Jump to line
            const position = new vscode.Position(line - 1, 0)
            editor.selection = new vscode.Selection(position, position)
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter)
          } catch (e: any) {
            this.outputChannel.appendLine(`❌ Open file failed: ${e.message}`)
          }
          break

        case 'navigateToLink':
          try {
            const { documentName, blockId } = message
            this.outputChannel.appendLine(`🔗 Navigating to link: ${documentName}${blockId ? `#${blockId}` : ''}`)

            const workspaceFolders = vscode.workspace.workspaceFolders
            if (!workspaceFolders) {
              vscode.window.showWarningMessage('No workspace folder open')
              return
            }

            // Find .jot files matching the document name
            const files = await vscode.workspace.findFiles(`**/${documentName}.jot`, '**/node_modules/**')

            if (files.length === 0) {
              vscode.window.showWarningMessage(`Document not found: ${documentName}.jot`)
              return
            }

            // Open the first match (TODO: show picker if multiple matches)
            const targetUri = files[0]
            const targetDoc = await vscode.workspace.openTextDocument(targetUri)
            const editor = await vscode.window.showTextDocument(targetDoc)

            // If blockId specified, try to find and navigate to it
            if (blockId) {
              const text = targetDoc.getText()
              const lines = text.split('\n')

              // Search for block definition with this ID
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(`def `) && lines[i].includes(blockId)) {
                  const position = new vscode.Position(i, 0)
                  editor.selection = new vscode.Selection(position, position)
                  editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter)
                  break
                }
              }
            }

            this.outputChannel.appendLine(`✅ Opened: ${documentName}.jot`)
          } catch (e: any) {
            this.outputChannel.appendLine(`❌ Navigate to link failed: ${e.message}`)
            vscode.window.showErrorMessage(`Failed to navigate: ${e.message}`)
          }
          break

        case 'updateTaskInSource':
          // TODO: Handle task update in source
          break

        // NodeManager queries from webview
        case 'getNode':
          try {
            logger.log(`[NoteEditorProvider] getNode request: ${message.payload?.id}`);
            this.outputChannel.appendLine(`📨 getNode request: ${message.payload?.id}`);

            logger.log('[NoteEditorProvider] Importing waitForNodeManager...');
            const { waitForNodeManager: waitFn1 } = await import('./extension');

            logger.log('[NoteEditorProvider] Calling waitForNodeManager(5000)...');
            const nodeManager = await waitFn1(5000);
            logger.log(`[NoteEditorProvider] NodeManager ready: ${!!nodeManager}`);
            this.outputChannel.appendLine(`NodeManager ready: ${!!nodeManager}`);

            if (nodeManager && message.payload?.id) {
              logger.log(`[NoteEditorProvider] Looking up node: ${message.payload.id}`);
              const node = nodeManager.getNode(message.payload.id);
              logger.log(`[NoteEditorProvider] Found node: ${!!node}`);
              this.outputChannel.appendLine(`Found node: ${!!node}`);
              webviewPanel.webview.postMessage({
                type: 'nodeResult',
                requestId: message.requestId,
                data: node || null
              });
              logger.log(`[NoteEditorProvider] Response sent for getNode (requestId: ${message.requestId})`);
            } else {
              logger.log('[NoteEditorProvider] NodeManager not available or no ID');
              this.outputChannel.appendLine(`❌ NodeManager not available or no ID`);
              webviewPanel.webview.postMessage({
                type: 'nodeResult',
                requestId: message.requestId,
                data: null
              });
            }
          } catch (e: any) {
            logger.error(`[NoteEditorProvider] getNode error: ${e.message}`);
            this.outputChannel.appendLine(`❌ getNode failed: ${e.message}`);
            webviewPanel.webview.postMessage({
              type: 'nodeResult',
              requestId: message.requestId,
              data: null
            });
          }
          break;

        case 'getNodeByShortId':
          try {
            logger.log(`[NoteEditorProvider] getNodeByShortId request: ${message.payload?.shortId}`);
            this.outputChannel.appendLine(`📨 getNodeByShortId request: ${message.payload?.shortId}`);

            logger.log('[NoteEditorProvider] Importing waitForNodeManager...');
            const { waitForNodeManager: waitFn2 } = await import('./extension');

            logger.log('[NoteEditorProvider] Calling waitForNodeManager(5000)...');
            const nodeManager = await waitFn2(5000);
            logger.log(`[NoteEditorProvider] NodeManager ready: ${!!nodeManager}`);
            this.outputChannel.appendLine(`NodeManager ready: ${!!nodeManager}`);

            if (nodeManager && message.payload?.shortId) {
              logger.log(`[NoteEditorProvider] Looking up by shortId: ${message.payload.shortId}`);
              const node = nodeManager.getNodeByShortId(message.payload.shortId);
              logger.log(`[NoteEditorProvider] Found node: ${!!node} (type: ${node?.type})`);
              this.outputChannel.appendLine(`Found node by shortId: ${!!node} (type: ${node?.type})`);
              webviewPanel.webview.postMessage({
                type: 'nodeResult',
                requestId: message.requestId,
                data: node || null
              });
              logger.log(`[NoteEditorProvider] Response sent for getNodeByShortId (requestId: ${message.requestId})`);
            } else {
              logger.log('[NoteEditorProvider] NodeManager not available or no shortId');
              this.outputChannel.appendLine(`❌ NodeManager not available or no shortId`);
              webviewPanel.webview.postMessage({
                type: 'nodeResult',
                requestId: message.requestId,
                data: null
              });
            }
          } catch (e: any) {
            logger.error(`[NoteEditorProvider] getNodeByShortId error: ${e.message}`);
            this.outputChannel.appendLine(`❌ getNodeByShortId failed: ${e.message}`);
            webviewPanel.webview.postMessage({
              type: 'nodeResult',
              requestId: message.requestId,
              data: null
            });
          }
          break;

        case 'getNodesByType':
          try {
            this.outputChannel.appendLine(`📨 getNodesByType request: ${message.payload?.type}`);
            const { getNodeManager } = await import('./extension');
            const nodeManager = getNodeManager();
            this.outputChannel.appendLine(`NodeManager exists: ${!!nodeManager}`);
            if (nodeManager && message.payload?.type) {
              const nodes = nodeManager.getNodesByType(message.payload.type);
              this.outputChannel.appendLine(`Found ${nodes?.length || 0} nodes of type ${message.payload.type}`);
              webviewPanel.webview.postMessage({
                type: 'nodesResult',
                requestId: message.requestId,
                data: nodes || []
              });
            } else {
              this.outputChannel.appendLine(`❌ NodeManager not available or no type`);
              webviewPanel.webview.postMessage({
                type: 'nodesResult',
                requestId: message.requestId,
                data: []
              });
            }
          } catch (e: any) {
            this.outputChannel.appendLine(`❌ getNodesByType failed: ${e.message}`);
            webviewPanel.webview.postMessage({
              type: 'nodesResult',
              requestId: message.requestId,
              data: []
            });
          }
          break;

        case 'getNodesByFile':
          try {
            this.outputChannel.appendLine(`📨 getNodesByFile request: ${message.payload?.filePath}`);
            const { getNodeManager } = await import('./extension');
            const nodeManager = getNodeManager();
            if (nodeManager && message.payload?.filePath) {
              const nodes = nodeManager.getNodesByFile(message.payload.filePath);
              this.outputChannel.appendLine(`Found ${nodes?.length || 0} nodes in file`);
              webviewPanel.webview.postMessage({
                type: 'nodesResult',
                requestId: message.requestId,
                data: nodes || []
              });
            } else {
              webviewPanel.webview.postMessage({
                type: 'nodesResult',
                requestId: message.requestId,
                data: []
              });
            }
          } catch (e: any) {
            this.outputChannel.appendLine(`❌ getNodesByFile failed: ${e.message}`);
            webviewPanel.webview.postMessage({
              type: 'nodesResult',
              requestId: message.requestId,
              data: []
            });
          }
          break;

        case 'getAllNodes':
          try {
            this.outputChannel.appendLine(`📨 getAllNodes request`);
            const { getNodeManager } = await import('./extension');
            const nodeManager = getNodeManager();
            if (nodeManager) {
              const nodes = nodeManager.getAllNodes();
              this.outputChannel.appendLine(`Found ${nodes?.length || 0} total nodes`);
              webviewPanel.webview.postMessage({
                type: 'nodesResult',
                requestId: message.requestId,
                data: nodes || []
              });
            } else {
              this.outputChannel.appendLine(`❌ NodeManager not available`);
              webviewPanel.webview.postMessage({
                type: 'nodesResult',
                requestId: message.requestId,
                data: []
              });
            }
          } catch (e: any) {
            this.outputChannel.appendLine(`❌ getAllNodes failed: ${e.message}`);
            webviewPanel.webview.postMessage({
              type: 'nodesResult',
              requestId: message.requestId,
              data: []
            });
          }
          break;

          try {
            const { path: relPath, line: lineNum, updates } = message
            this.outputChannel.appendLine(`📝 Syncing task to source: ${relPath}:${lineNum}`)

            const workspaceFolders = vscode.workspace.workspaceFolders
            if (!workspaceFolders) return
            const fullPath = vscode.Uri.file(path.join(workspaceFolders[0].uri.fsPath, relPath))

            const doc = await vscode.workspace.openTextDocument(fullPath)
            const idx = lineNum - 1
            if (idx < 0 || idx >= doc.lineCount) throw new Error('Invalid line number')

            let lineText = doc.lineAt(idx).text
            let updatedLine = lineText

            // Apply status update
            if (updates.status === 'todo') {
              updatedLine = updatedLine.replace(/^- \[[xX]\] /, '- [ ] ')
            } else if (updates.status === 'done') {
              updatedLine = updatedLine.replace(/^- \[ \] /, '- [x] ')
            }

            // Apply/Update metadata tags
            if (updates.id !== undefined) {
              updatedLine = updatedLine.replace(/#id:[^\s]+/g, '').trim()
              if (updates.id) updatedLine += ` #id:${updates.id}`
            }
            if (updates.priority !== undefined) {
              updatedLine = updatedLine.replace(/#priority:(high|medium|low|none)/gi, '').trim()
              if (updates.priority && updates.priority !== 'none') updatedLine += ` #priority:${updates.priority}`
            }
            if (updates.actions !== undefined) {
              updatedLine = updatedLine.replace(/#actions:"[^"]+"/g, '').replace(/#actions:[^\s]+/g, '').trim()
              if (updates.actions) updatedLine += ` #actions:"${updates.actions}"`
            }

            // Apply Content update
            if (updates.content !== undefined) {
              const statusPart = updatedLine.match(/^- \[[ xX]\] /)?.[0] || '- [ ] '
              const tagsMatch = updatedLine.match(/(#id:[^\s]+|#priority:[^\s]+|#actions:(?:\"[^\"]+\"|[^\s]+))/g)
              const tags = tagsMatch ? ' ' + tagsMatch.join(' ') : ''
              updatedLine = `${statusPart}${updates.content}${tags}`
            }

            if (updatedLine !== lineText) {
              const edit = new vscode.WorkspaceEdit()
              edit.replace(fullPath, doc.lineAt(idx).range, updatedLine)
              await vscode.workspace.applyEdit(edit)
              await doc.save()
              this.outputChannel.appendLine('✅ Source synced successfully (WorkspaceEdit)')
            }

          } catch (e: any) {
            this.outputChannel.appendLine(`❌ Source sync failed: ${e.message}`)
          }
          break

        case 'getFileContent':
          try {
            const { path: relPath, lines, requestId } = message
            this.outputChannel.appendLine(`📄 Fetching file content: ${relPath} lines: ${lines || 'all'}`)

            const workspaceFolders = vscode.workspace.workspaceFolders
            if (!workspaceFolders) {
              throw new Error('No workspace open')
            }

            // Handle absolute paths vs relative paths
            let fullPath = relPath
            if (!path.isAbsolute(relPath)) {
              fullPath = path.join(workspaceFolders[0].uri.fsPath, relPath)
            }

            if (!fs.existsSync(fullPath)) {
              throw new Error(`File not found: ${relPath}`)
            }

            const content = fs.readFileSync(fullPath, 'utf8')
            const fileLines = content.split('\n')

            let result = content
            if (lines) {
              // Parse line range "10-20" or "5"
              const [startStr, endStr] = lines.split('-')
              const start = parseInt(startStr, 10)
              const end = endStr ? parseInt(endStr, 10) : start

              if (!isNaN(start)) {
                // 1-based to 0-based
                const startIndex = Math.max(0, start - 1)
                const endIndex = end ? end : startIndex + 1
                result = fileLines.slice(startIndex, endIndex).join('\n')
              }
            }

            webviewPanel.webview.postMessage({
              type: 'fileContent',
              requestId,
              content: result
            })

          } catch (e: any) {
            this.outputChannel.appendLine(`❌ Failed to get file content: ${e.message}`)
            webviewPanel.webview.postMessage({
              type: 'fileContent',
              requestId: message.requestId,
              error: e.message
            })
          }
          break

        case 'requestTemplateList':
          try {
            this.outputChannel.appendLine('📋 Requesting template list')
            const templatesDir = path.join(this.context.extensionPath, 'out', 'jotx-help', 'templates')
            this.outputChannel.appendLine(`🔍 Looking in: ${templatesDir}`)

            if (!fs.existsSync(templatesDir)) {
              this.outputChannel.appendLine(`❌ Templates directory not found: ${templatesDir}`)
              throw new Error('Templates directory not found')
            }

            const files = fs.readdirSync(templatesDir)
            this.outputChannel.appendLine(`📁 Files found: ${files.join(', ')}`)

            const templates = files
              .filter(f => f.endsWith('.jot'))
              .map(fileName => ({
                fileName,
                name: fileName
                  .replace('.jot', '')
                  .replace(/-/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')
              }))

            this.outputChannel.appendLine(`✅ Found ${templates.length} templates`)
            this.outputChannel.appendLine(`📤 Sending to webview: ${JSON.stringify(templates.map(t => t.name))}`)

            webviewPanel.webview.postMessage({
              type: 'templateList',
              templates
            })

            this.outputChannel.appendLine('✅ postMessage sent to webview')
          } catch (error: any) {
            this.outputChannel.appendLine(`❌ Failed to list templates: ${error.message}`)
            webviewPanel.webview.postMessage({
              type: 'templateList',
              templates: []
            })
          }
          break

        case 'debug':
          // Debug message from webview - log to output channel for visibility
          if (message.message) {
            this.outputChannel.appendLine(`[WEBVIEW DEBUG] ${message.message}`)
          }
          break

        case 'getJotFiles':
          // Return list of all .jot files in workspace for file picker dropdown
          try {
            this.outputChannel.appendLine('📋 Requesting .jot file list for dropdown')
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
            if (!workspaceFolder) {
              webviewPanel.webview.postMessage({ type: 'jotFileList', files: [] })
              break
            }

            const docDir = path.dirname(document.uri.fsPath)
            const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.jot')
            const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 100)

            // Convert to relative paths from current document and sort alphabetically
            const files = uris
              .map(uri => {
                const relativePath = path.relative(docDir, uri.fsPath)
                // Normalize to use ./ for files in same directory
                return relativePath.startsWith('..') ? relativePath : './' + relativePath
              })
              .sort((a, b) => a.localeCompare(b))

            this.outputChannel.appendLine(`✅ Found ${files.length} .jot files`)
            webviewPanel.webview.postMessage({ type: 'jotFileList', files })
          } catch (error: any) {
            this.outputChannel.appendLine(`❌ Failed to list .jot files: ${error.message}`)
            webviewPanel.webview.postMessage({ type: 'jotFileList', files: [] })
          }
          break

        case 'requestTemplateContent':
          try {
            const { fileName } = message
            this.outputChannel.appendLine(`📄 Requesting template content: ${fileName}`)

            const templatesDir = path.join(this.context.extensionPath, 'out', 'jotx-help', 'templates')
            const templatePath = path.join(templatesDir, fileName)

            if (!fs.existsSync(templatePath)) {
              throw new Error(`Template not found: ${fileName}`)
            }

            // Read template file
            const templateContent = fs.readFileSync(templatePath, 'utf8')

            // Parse the template to get AST
            const templateAst = parse(templateContent)

            if (!templateAst.document || !templateAst.document.blocks) {
              throw new Error('Template has no blocks')
            }

            // Convert blocks to Tiptap JSON (excluding header)
            const tiptapBlocks = {
              type: 'doc',
              content: templateAst.document.blocks.map(b => this.tiptapAdapter.blockToTiptap(b))
            }

            this.outputChannel.appendLine(`✅ Template parsed: ${templateAst.document.blocks.length} blocks`)

            // Send the Tiptap JSON blocks to frontend for insertion
            webviewPanel.webview.postMessage({
              type: 'templateContent',
              content: tiptapBlocks
            })
          } catch (error: any) {
            this.outputChannel.appendLine(`❌ Failed to read template: ${error.message}`)
            vscode.window.showErrorMessage(`Failed to load template: ${error.message}`)
          }
          break
      }
    })

    // Handle external document changes
    const changeSubscription = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document === document && !this.isApplyingEdit && e.contentChanges.length > 0) {
        this.outputChannel.appendLine('🔄 External change detected - reloading')

        // Re-parse document
        ast = this.parseDocument(e.document)

        // Validate
        const validationResult = validate(ast.document)
        if (validationResult.length > 0) {
          this.outputChannel.appendLine(`⚠️  Validation errors after external change: ${validationResult.length}`)
        }

        // Convert to Tiptap and send to webview
        const tiptapDoc = {
          type: 'doc',
          content: ast.document.blocks.map(b => this.tiptapAdapter.blockToTiptap(b))
        }

        webviewPanel.webview.postMessage({
          type: 'documentUpdated',
          document: {
            id: ast.document.id,
            documentType: ast.document.type,
            metadata: ast.document.metadata,
            tiptapDoc
          },
          validation: {
            isValid: validationResult.length === 0,
            errors: validationResult.filter(e => e.severity === 'error').map(e => ({
              message: e.message,
              type: e.type,
              severity: e.severity
            })),
            warnings: validationResult.filter(e => e.severity === 'warning').map(w => ({
              message: w.message,
              type: w.type,
              severity: w.severity
            }))
          }
        })
      }
    })

    webviewPanel.onDidDispose(() => {
      changeSubscription.dispose()
      this.outputChannel.appendLine('👋 Editor closed')
    })

    this.outputChannel.appendLine('🎉 Editor loaded (jotx 2.0)!')
  }

  /**
   * Parse VS Code document to AST using jotx 2.0 API
   */
  private parseDocument(document: vscode.TextDocument): { document: DocumentNode, errors: any[] } {
    const text = document.getText()

    // Handle empty documents
    if (!text || text.trim().length === 0) {
      const fileName = path.basename(document.fileName, path.extname(document.fileName))
      return {
        document: {
          id: fileName.replace(/[^a-zA-Z0-9]/g, '_'),
          type: 'jotx',
          metadata: {
            title: fileName
          },
          blocks: []
        },
        errors: []
      }
    }

    // Parse with jotx 2.0
    try {
      return parse(text)
    } catch (e: any) {
      this.outputChannel.appendLine(`❌ Parser crashed: ${e.message}`)
      return {
        document: {
          type: 'jotx',
          id: 'error_recovery',
          metadata: { title: 'Error Recovery' },
          blocks: [{
            type: 'callout',
            id: 'error_msg',
            properties: { variant: 'error', text: `Parser Error: ${e.message}` }
          }]
        },
        errors: [{
          type: 'parse_error',
          message: e.message,
          severity: 'error'
        }]
      }
    }
  }

  /**
   * Update VS Code document with new content
   */
  private async updateDocument(document: vscode.TextDocument, content: string): Promise<void> {
    this.isApplyingEdit = true
    try {
      const edit = new vscode.WorkspaceEdit()
      edit.replace(
        document.uri,
        new vscode.Range(0, 0, document.lineCount, 0),
        content
      )
      const success = await vscode.workspace.applyEdit(edit)
      if (success) {
        await document.save()
      }

      if (!success) {
        this.outputChannel.appendLine('❌ Failed to apply edit')
        throw new Error('Failed to apply edit')
      }

      this.outputChannel.appendLine('✅ Document updated')
    } finally {
      this.isApplyingEdit = false
    }
  }

  /**
   * Convert relative attachment paths to webview URIs in Tiptap JSON
   * Recursively walks the Tiptap document and converts src/url attributes
   */
  private convertAttachmentPathsToWebviewUris(
    node: any,
    document: vscode.TextDocument,
    webview: vscode.Webview
  ): void {
    if (!node || typeof node !== 'object') return

    const docDir = path.dirname(document.uri.fsPath)

    // Convert src attribute (for image and video blocks)
    if (node.attrs?.src && typeof node.attrs.src === 'string' && node.attrs.src.startsWith('attachments/')) {
      const fullPath = path.join(docDir, node.attrs.src)
      node.attrs.src = webview.asWebviewUri(vscode.Uri.file(fullPath)).toString()
    }

    // Convert url attribute (for video blocks with YouTube)
    // Note: YouTube URLs don't need conversion, they're already full URLs

    // Recurse into content array
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        this.convertAttachmentPathsToWebviewUris(child, document, webview)
      }
    }
  }

  /**
   * Resolve code references by reading files
   */
  private async resolveCodeReferences(node: any, document: vscode.TextDocument) {
    if (!node || typeof node !== 'object') return

    if (node.type === 'codeReference') {
      try {
        const docDir = path.dirname(document.uri.fsPath)
        const refPath = node.attrs?.path
        if (refPath) {
          const fullPath = path.resolve(docDir, refPath)

          if (fs.existsSync(fullPath)) {
            let content = fs.readFileSync(fullPath, 'utf8')

            // Handle line ranges (e.g. 10-20)
            const lines = node.attrs?.lines
            if (lines && /^\d+(-\d+)?$/.test(lines)) {
              const parts = lines.split('-').map(Number)
              const start = parts[0]
              const end = parts[1] || start
              const fileLines = content.split('\n')
              content = fileLines.slice(start - 1, end).join('\n')
            }

            node.content = [{ type: 'text', text: content }]

            // Auto-detect language if not specified
            if (!node.attrs.language || node.attrs.language === 'typescript') {
              const ext = path.extname(fullPath).toLowerCase().replace('.', '')
              const langMap: Record<string, string> = {
                'ts': 'typescript', 'js': 'javascript', 'py': 'python', 'sh': 'bash', 'md': 'markdown'
              }
              node.attrs.language = langMap[ext] || ext
            }
          } else {
            node.content = [{ type: 'text', text: `File not found: ${refPath}` }]
          }
        }
      } catch (e) {
        node.content = [{ type: 'text', text: `Error reading file: ${e}` }]
      }
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        await this.resolveCodeReferences(child, document)
      }
    }
  }

  /**
   * Which syntax to write when saving: the jotx.syntax setting, or for "preserve"
   * (the default) the style the file already uses; new and empty files use compact.
   */
  private syntaxFor(document: vscode.TextDocument): SyntaxStyle {
    const setting = vscode.workspace.getConfiguration('jotx').get<string>('syntax', 'preserve')
    if (setting === 'compact' || setting === 'classic') return setting
    const text = document.getText()
    return text.trim() ? detectSyntaxStyle(text) : 'compact'
  }

  /**
   * Generate HTML for webview
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    // Webpack bundles React app to: out/webview/webview.js
    const scriptPath = path.join(this.context.extensionPath, 'out', 'webview', 'webview.js')
    const scriptUri = webview.asWebviewUri(vscode.Uri.file(scriptPath))

    // Note: NO styles.css reference - webpack bundles CSS into JS

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-eval'; img-src ${webview.cspSource} https: data: blob:; media-src ${webview.cspSource} https: data: blob:; font-src ${webview.cspSource} data:; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://*.youtube.com https://*.googlevideo.com; child-src https://www.youtube.com https://www.youtube-nocookie.com https://*.youtube.com https://*.googlevideo.com; connect-src https:;">
  <title>jotx 2.0 Editor</title>
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`
  }
}
