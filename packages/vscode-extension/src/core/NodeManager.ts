/**
 * VSCodeNodeManager - VS Code specific implementation of INodeManager
 * Extends core NodeManager with file system operations and watching
 */

import * as vscode from 'vscode'
import * as path from 'path'
import { parse, NodeManager, type NodeManagerOptions } from '@jotx-labs/core'
import type { NodeEntry, DefTreeNode, INodeManager } from '@jotx-labs/core'
import { logger } from '../utils/logger'

export { INDEXED_BLOCK_TYPES, type IndexedBlockType } from '@jotx-labs/core'

export class VSCodeNodeManager extends NodeManager implements INodeManager {
    // File watching
    private watcher?: vscode.FileSystemWatcher
    private workspaceFolder?: vscode.WorkspaceFolder

    constructor() {
        super({
            onError: (msg, err) => logger.error(msg, err),
            log: (msg) => logger.log(msg)
        })
    }

    /**
     * Initialize NodeManager - index all .jot files
     */
    async initialize(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
        this.workspaceFolder = workspaceFolder

        logger.log('[NodeManager] Initializing...')
        const startTime = Date.now()

        // Get excluded folders from settings
        const config = vscode.workspace.getConfiguration('jotx')
        const excludeFolders: string[] = config.get('nodeManager.excludeFolders', ['jotx-help', 'node_modules', '.git'])

        // Build exclude pattern
        const excludePattern = `**/{${excludeFolders.join(',')}}/**`
        logger.log(`[NodeManager] Exclude pattern: ${excludePattern}`)

        // Find all .jot files
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(workspaceFolder, '**/*.jot'),
            excludePattern
        )

        logger.log(`[NodeManager] Found ${files.length} .jot files`)

        // Index each file
        for (const fileUri of files) {
            await this.indexFile(fileUri.fsPath)
        }

        // Setup file watcher
        this.setupWatcher(workspaceFolder, excludePattern)

        const duration = Date.now() - startTime
        logger.log(`[NodeManager] Indexed ${this.nodeRegistry.size} nodes in ${duration}ms`)
    }

    /**
     * Setup file system watcher for live updates
     */
    private setupWatcher(workspaceFolder: vscode.WorkspaceFolder, excludePattern: string): void {
        const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.jot')
        this.watcher = vscode.workspace.createFileSystemWatcher(pattern)

        // Check if file should be indexed (not in excluded folders)
        const shouldIndex = (uri: vscode.Uri): boolean => {
            const relativePath = vscode.workspace.asRelativePath(uri, false)
            const config = vscode.workspace.getConfiguration('jotx')
            const excludeFolders: string[] = config.get('nodeManager.excludeFolders', ['jotx-help', 'node_modules', '.git'])

            for (const folder of excludeFolders) {
                if (relativePath.startsWith(folder + '/') || relativePath.includes('/' + folder + '/')) {
                    return false
                }
            }
            return true
        }

        // File created
        this.watcher.onDidCreate(async (uri) => {
            if (!shouldIndex(uri)) return
            logger.log(`[NodeManager] File created: ${uri.fsPath}`)
            await this.indexFile(uri.fsPath)
        })

        // File changed
        this.watcher.onDidChange(async (uri) => {
            if (!shouldIndex(uri)) return
            logger.log(`[NodeManager] File changed: ${uri.fsPath}`)
            await this.reindexFile(uri.fsPath)
        })

        // File deleted
        this.watcher.onDidDelete((uri) => {
            logger.log(`[NodeManager] File deleted: ${uri.fsPath}`)
            this.removeFileNodes(uri.fsPath)
        })
    }

    /**
     * Index a single file
     */
    private async indexFile(filePath: string): Promise<void> {
        try {
            // Read file
            const document = await vscode.workspace.openTextDocument(filePath)
            const text = document.getText()

            // Parse
            const ast = parse(text)
            const fileName = path.basename(filePath, '.jot')

            // Extract nodes (using parent class methods)
            this.extractNodes(ast, filePath, fileName)

            // Build def tree
            this.buildDefTree(ast, filePath)

        } catch (error) {
            this.options.onError?.(`[NodeManager] Error indexing ${filePath}:`, error)
        }
    }

    // ========== INodeManager Interface Implementation ==========

    async reindexFile(filePath: string): Promise<void> {
        // Remove old nodes
        this.removeFileNodes(filePath)

        // Re-index
        await this.indexFile(filePath)
    }

    async fullReindex(): Promise<void> {
        // Clear all data
        this.clear()

        // Re-initialize
        if (this.workspaceFolder) {
            await this.initialize(this.workspaceFolder)
        }
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.watcher?.dispose()
        this.clear()
    }
}
