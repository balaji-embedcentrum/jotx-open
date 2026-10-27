/**
 * VS Code Platform Bridge
 * 
 * Implements EditorPlatformBridge to connect @jotx-labs/editor
 * with VS Code-specific APIs. This bridge is NOT USED YET - 
 * it's infrastructure for future Phase 2 integration.
 */

import type { EditorPlatformBridge, FilePickerOptions } from '@jotx-labs/editor'

/**
 * VS Code Bridge Implementation
 * 
 * Note: This bridge uses postMessage to communicate with the extension host
 * since we're in a webview context without direct VS Code API access.
 */
export class VSCodeBridge implements EditorPlatformBridge {
    private vscodeApi: any

    constructor() {
        // Get VS Code API from window (set by vscode-api.ts)
        this.vscodeApi = (window as any).vscodeApi
        this.log('VSCodeBridge initialized')
    }

    getPlatform(): 'vscode' | 'web' | 'electron' {
        return 'vscode'
    }

    async pickFile(options?: FilePickerOptions): Promise<string | null> {
        this.log('pickFile requested')
        // Will be implemented when we wire up the bridge
        // For now, return null (not used yet)
        return null
    }

    openExternal(url: string): void {
        this.log(`openExternal: ${url}`)
        this.vscodeApi?.postMessage({
            type: 'openExternal',
            url
        })
    }

    navigateToNote(noteId: string): void {
        this.log(`navigateToNote: ${noteId}`)
        this.vscodeApi?.postMessage({
            type: 'openFile',
            path: noteId
        })
    }

    async savePastedImage(base64: string, filename: string): Promise<string> {
        this.log(`savePastedImage: ${filename}`)
        // Will be implemented when we wire up the bridge
        return ''
    }

    log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
        const prefix = '[VSCodeBridge]'
        switch (level) {
            case 'error':
                console.error(`${prefix} ${message}`)
                break
            case 'warn':
                console.warn(`${prefix} ${message}`)
                break
            default:
                console.log(`${prefix} ${message}`)
        }
    }
}

// Export a singleton instance
let bridgeInstance: VSCodeBridge | null = null

export function getVSCodeBridge(): VSCodeBridge {
    if (!bridgeInstance) {
        bridgeInstance = new VSCodeBridge()
    }
    return bridgeInstance
}
