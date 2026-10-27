/**
 * Graph View Provider - Manages webview panel for graph visualization
 */

import * as vscode from 'vscode'
import * as path from 'path'
import { GraphIndexer, GraphData } from './GraphIndexer'
import * as fs from 'fs'
import { logger } from '../utils/logger'

export class GraphViewProvider {
  private static currentPanel: vscode.WebviewPanel | undefined
  private indexer: GraphIndexer | undefined
  private fileWatcher: vscode.FileSystemWatcher | undefined
  private focusedDocumentId: string | undefined
  private currentFilePath: string | undefined // Track for local graph refresh
  private refreshTimer: NodeJS.Timeout | undefined
  private context: vscode.ExtensionContext

  constructor(context: vscode.ExtensionContext) {
    this.context = context
  }

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new GraphViewProvider(context)

    const showGraphCommand = vscode.commands.registerCommand('jotx.showGraph', async () => {
      await provider.showGraph()
    })

    const showLocalGraphCommand = vscode.commands.registerCommand('jotx.showLocalGraph', async () => {
      await provider.showLocalGraph()
    })

    const showLocalGraphForUriCommand = vscode.commands.registerCommand('jotx.showLocalGraphForUri', async (documentUri: string) => {
      await provider.showLocalGraphForUri(documentUri)
    })

    // For context menu - receives URI from right-click
    const showLocalGraphForFileCommand = vscode.commands.registerCommand('jotx.showLocalGraphForFile', async (uri: vscode.Uri) => {
      await provider.showLocalGraphForUri(uri.toString())
    })

    return vscode.Disposable.from(showGraphCommand, showLocalGraphCommand, showLocalGraphForUriCommand, showLocalGraphForFileCommand)
  }

  private async showGraph() {
    logger.log('[GraphViewProvider] ===== WORKSPACE GRAPH CALLED =====')
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open')
      return
    }

    if (!this.indexer) {
      this.indexer = new GraphIndexer(workspaceFolder)
    }

    // Clear local mode - this is workspace view
    this.currentFilePath = undefined

    // Build graph data - show all nodes, no root validation required
    const graphData = await this.indexer.buildGraph()
    logger.log(`[GraphViewProvider] Workspace graph built: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`)

    // Setup file watcher for real-time updates
    if (!this.fileWatcher) {
      const workspacePattern = new vscode.RelativePattern(workspaceFolder, '**/*.jot')
      this.fileWatcher = vscode.workspace.createFileSystemWatcher(workspacePattern)

      this.fileWatcher.onDidChange(() => this.refreshGraph())
      this.fileWatcher.onDidCreate(() => this.refreshGraph())
      this.fileWatcher.onDidDelete(() => this.refreshGraph())
    }

    // Show webview (full workspace graph)
    this.createOrShowPanel(graphData, 'jotx', undefined)
  }

  private async showLocalGraph() {
    const activeEditor = vscode.window.activeTextEditor
    if (!activeEditor || !activeEditor.document.fileName.endsWith('.jot')) {
      vscode.window.showWarningMessage('Open a .jot file to see its local graph')
      return
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    if (!workspaceFolder) {
      return
    }

    if (!this.indexer) {
      this.indexer = new GraphIndexer(workspaceFolder)
    }

    const filePath = activeEditor.document.fileName
    const fileName = path.basename(filePath, '.jot')

    // Store for refresh support
    this.currentFilePath = filePath

    // Use FULL WORKSPACE graph with focus on this document
    const graphData = await this.indexer.buildGraph()
    logger.log('[GraphViewProvider] showLocalGraph: filePath=', filePath, 'nodes=', graphData.nodes.length)

    this.createOrShowPanel(graphData, `Graph: ${fileName}`, filePath)
  }

  public async showLocalGraphForUri(documentUri: string) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open')
      return
    }

    if (!this.indexer) {
      this.indexer = new GraphIndexer(workspaceFolder)
    }

    // Get the file path from URI
    const filePath = documentUri.startsWith('file://')
      ? vscode.Uri.parse(documentUri).fsPath
      : documentUri

    // Use WORKSPACE graph with focus on this document (not local graph)
    const graphData = await this.indexer.buildGraph()
    const fileName = path.basename(filePath, '.jot')

    // Extract document ID from filePath to use as focus
    // Extract document ID from filePath to use as focus
    const docId = filePath  // Use FULL PATH for robust matching in webview

    this.createOrShowPanel(graphData, 'jotx', docId)
  }

  private async refreshGraph() {
    // Debounce the refresh to prevent race conditions with NodeManager
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    this.refreshTimer = setTimeout(async () => {
      if (!GraphViewProvider.currentPanel) {
        logger.log('[GraphViewProvider] Refresh skipped: no panel')
        return
      }

      // Reinitialize indexer if needed
      if (!this.indexer) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
        if (!workspaceFolder) {
          logger.log('[GraphViewProvider] Refresh failed: no workspace folder')
          return
        }
        logger.log('[GraphViewProvider] Reinitializing indexer for refresh')
        this.indexer = new GraphIndexer(workspaceFolder)
      }

      try {
        // Use local graph if we have a current file, otherwise full workspace
        const graphData = this.currentFilePath
          ? await this.indexer.buildLocalGraph(this.currentFilePath)
          : await this.indexer.buildGraph()

        logger.log(`[GraphViewProvider] Refresh complete: ${graphData.nodes.length} nodes, mode: ${this.currentFilePath ? 'local' : 'workspace'}`)

        GraphViewProvider.currentPanel.webview.postMessage({
          type: 'graphData',
          data: graphData,
          focusedDocumentId: this.focusedDocumentId
        })
      } catch (error) {
        logger.error('[GraphViewProvider] Error refreshing graph:', error)
      }
    }, 500) // Reduced to 500ms for better responsiveness
  }

  private createOrShowPanel(graphData: GraphData, title: string, focusedDocId?: string) {
    const column = vscode.ViewColumn.One  // Full editor instead of sidebar

    // If we already have a panel, show it
    if (GraphViewProvider.currentPanel) {
      GraphViewProvider.currentPanel.reveal(column)
      // Send new data WITH focusedDocumentId (CRITICAL for centering!)
      this.focusedDocumentId = focusedDocId
      logger.log('[GraphViewProvider] Reusing panel, sending focusedDocumentId:', focusedDocId)
      GraphViewProvider.currentPanel.webview.postMessage({
        type: 'graphData',
        data: graphData,
        focusedDocumentId: focusedDocId  // THIS WAS MISSING!
      })
      return
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'jotxGraph',
      title,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, 'out'))
        ]
      }
    )

    GraphViewProvider.currentPanel = panel

    // Set HTML content
    panel.webview.html = this.getWebviewContent(panel.webview, graphData, focusedDocId)

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'openNode':
            await this.openNode(message.nodePath)
            break
          case 'ready':
            // Send initial data when webview is ready
            this.focusedDocumentId = focusedDocId
            logger.log('[GraphViewProvider] Sending graphData with focusedDocumentId:', focusedDocId)
            logger.log('[GraphViewProvider] Total nodes:', graphData.nodes.length)
            logger.log('[GraphViewProvider] Sample node paths:', graphData.nodes.slice(0, 3).map(n => n.path))
            panel.webview.postMessage({
              type: 'graphData',
              data: graphData,
              focusedDocumentId: focusedDocId
            })
            break
          case 'expandDocument':
            // Blocks are already in the graph data from NodeManager
            // No need to fetch separately - just filter existing nodes
            panel.webview.postMessage({
              type: 'blocksExpanded',
              docId: message.docId
            })
            break

          case 'refresh':
            logger.log('[GraphViewProvider] ===== REFRESH BUTTON CLICKED =====')
            await this.refreshGraph()
            logger.log('[GraphViewProvider] ===== REFRESH COMPLETE =====')
            break
        }
      },
      undefined,
      this.context.subscriptions
    )

    // Reset when closed
    panel.onDidDispose(() => {
      GraphViewProvider.currentPanel = undefined
    })
  }

  private async openNode(nodePath: string) {
    try {
      // nodePath could be an absolute file path OR a node ID
      // First check if it's a valid file path
      if (nodePath && (nodePath.startsWith('/') || nodePath.includes(':\\'))) {
        // It's an absolute file path - open directly
        const uri = vscode.Uri.file(nodePath);
        try {
          await fs.promises.access(nodePath);  // Check file exists
          await vscode.commands.executeCommand('jotx.openWithJotx', uri);
          return;
        } catch {
          // File doesn't exist, fall through to NodeManager lookup
        }
      }

      // Fallback: Get NodeManager to lookup by node ID
      const { getNodeManager } = require('../extension');
      const nm = getNodeManager();

      // Try to get node by full ID first
      let node = nm?.getNode(nodePath);

      // If not found and contains #, try just the document part
      if (!node && nodePath.includes('#')) {
        const documentId = nodePath.split('#')[0];
        node = nm?.getNode(documentId);
      }

      if (node && node.filePath) {
        const uri = vscode.Uri.file(node.filePath);
        await vscode.commands.executeCommand('jotx.openWithJotx', uri);
      } else {
        vscode.window.showErrorMessage(`Failed to find node: ${nodePath}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${nodePath}`);
    }
  }

  private getWebviewContent(webview: vscode.Webview, initialData: GraphData, focusedDocId?: string): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'graphView.js'))
    )

    // No dropdown needed - we show full workspace graph

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Graph View</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
    }
    .graph-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: var(--vscode-titleBar-activeBackground);
      border-bottom: 1px solid var(--vscode-panel-border);
      height: 44px;
    }
    .graph-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .graph-logo {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .graph-logo span {
      font-size: 16px;
      font-weight: 400;
      letter-spacing: 0.5px;
      color: #00CED1;  /* Cyan like document header */
    }
    .graph-logo svg {
      width: 20px;
      height: 20px;
    }
    .graph-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }
    .graph-header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .graph-select {
      padding: 4px 8px;
      font-size: 12px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      min-width: 180px;
    }
    .graph-select:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    .graph-btn {
      padding: 4px 10px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    }
    .graph-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .graph-btn-secondary {
      background: transparent;
      border: 1px solid var(--vscode-input-border);
      color: var(--vscode-foreground);
    }
    /* Search Container */
    .search-container {
      position: relative;
    }
    .search-input {
      padding: 5px 10px 5px 30px;
      font-size: 12px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      min-width: 200px;
    }
    .search-input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }
    .search-input:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    .search-icon {
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      color: var(--vscode-descriptionForeground);
    }
    .search-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 4px;
      margin-top: 4px;
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .search-results:empty {
      display: none;
    }
    .search-result-item {
      padding: 8px 12px;
      cursor: pointer;
      font-size: 12px;
      border-bottom: 1px solid var(--vscode-dropdown-border);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .search-result-item:last-child {
      border-bottom: none;
    }
    .search-result-item:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .search-result-label {
      color: var(--vscode-foreground);
      font-weight: 500;
    }
    .search-result-id {
      color: var(--vscode-descriptionForeground);
      font-size: 10px;
      font-family: monospace;
    }
    .search-result-type {
      display: inline-block;
      padding: 1px 6px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 10px;
      font-size: 9px;
      margin-left: 8px;
    }
    #graph-container {
      width: 100vw;
      height: calc(100vh - 44px);
    }
    .stats {
      position: absolute;
      bottom: 10px;
      left: 10px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-editor-background);
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid var(--vscode-panel-border);
    }
    .side-panel {
      position: absolute;
      right: 0;
      top: 44px;
      width: 320px;
      height: calc(100% - 44px);
      background: var(--vscode-sideBar-background);
      border-left: 1px solid var(--vscode-panel-border);
      display: flex;
      flex-direction: column;
      transition: transform 0.3s ease;
      z-index: 10;
    }
    .side-panel.hidden {
      transform: translateX(100%);
    }
    .panel-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .panel-header h3 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
    }
    .close-btn {
      background: none;
      border: none;
      color: var(--vscode-foreground);
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    .close-btn:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }
    .panel-content {
      padding: 16px;
      overflow-y: auto;
      flex: 1;
    }
    .property-row {
      margin-bottom: 16px;
    }
    .property-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 4px;
      font-weight: 500;
    }
    .property-value {
      font-size: 13px;
      color: var(--vscode-foreground);
      word-break: break-all;
      line-height: 1.4;
    }
    .open-file-btn {
      width: 100%;
      padding: 8px 12px;
      margin-bottom: 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .open-file-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="graph-header">
    <div class="graph-header-left">
      <div class="graph-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="5" r="3"/>
          <circle cx="5" cy="19" r="3"/>
          <circle cx="19" cy="19" r="3"/>
          <line x1="12" y1="8" x2="5" y2="16"/>
          <line x1="12" y1="8" x2="19" y2="16"/>
        </svg>
        <span>jotx<span style="color: #ffffff;">Graph</span></span>
      </div>
    </div>
    <div class="graph-header-right">
       <!-- Search Box -->
       <div class="search-container">
         <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <circle cx="11" cy="11" r="8"/>
           <line x1="21" y1="21" x2="16.65" y2="16.65"/>
         </svg>
         <input type="text" id="graph-search" class="search-input" placeholder="Search nodes..." autocomplete="off" />
         <div id="search-results" class="search-results"></div>
       </div>
       <button id="refresh-btn" class="graph-btn graph-btn-secondary" title="Refresh Graph">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 4v6h-6"></path>
          <path d="M1 20v-6h6"></path>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
       </button>
    </div>
  </div>
  <div id="graph-container" style="width: 100%; height: calc(100vh - 44px); flex: 1;"></div>
  <div id="side-panel" class="side-panel hidden">
    <div class="panel-header">
      <h3 id="panel-title">Node Details</h3>
      <button id="close-panel" class="close-btn">×</button>
    </div>
    <div class="panel-content" id="panel-content">
      <!-- Properties will be injected here -->
    </div>
  </div>
  <div id="legend" style="position: absolute; top: 60px; right: 10px; background: var(--vscode-editor-background); padding: 12px; border-radius: 4px; border: 1px solid var(--vscode-panel-border); font-size: 11px; max-width: 200px;">
    <div style="font-weight: 600; margin-bottom: 8px;">Legend</div>
    <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #FF0000; margin-right: 6px;"></span>Root</div>
    <div style="margin-bottom: 4px;"><span style="display: inline-bl block; width: 10px; height: 10px; border-radius: 50%; background: #5B9BD5; margin-right: 6px;"></span>Document</div>
    <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #00BCD4; margin-right: 6px;"></span>Mermaid</div>
    <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #FF6B6B; margin-right: 6px;"></span>Chart</div>
    <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #FFD700; margin-right: 6px;"></span>Math</div>
    <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #32CD32; margin-right: 6px;"></span>Table</div>
    <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #FF69B4; margin-right: 6px;"></span>JotxLink</div>
  </div>
  <script src="${scriptUri}"></script>
  <script>
    // graphView.ts already called acquireVsCodeApi() and stored it in window
    // Access the vscode API from window since it's already initialized
    let initialData = ${JSON.stringify(initialData)};
    
    // Wait for graphView.ts to initialize vscode, then attach refresh handler
    setTimeout(function() {
      logger.log('[Graph HTML] Attaching refresh button handler');
      document.getElementById('refresh-btn').addEventListener('click', function() {
        logger.log('[Graph HTML] Refresh button clicked, sending message');
        // Use window.vscode which is set by graphView.ts
        if (window.vscode) {
          window.vscode.postMessage({ type: 'refresh' });
        } else {
          logger.error('[Graph HTML] window.vscode not available!');
        }
      });
    }, 100);
  </script>
</body>
</html>`
  }
}
