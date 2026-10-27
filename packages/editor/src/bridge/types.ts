/**
 * Platform Bridge Interface
 * 
 * Abstracts platform-specific operations so the editor can run in:
 * - VS Code webview
 * - Web browser (Knowledge Hub)
 * - Electron (future)
 */

export interface FilePickerOptions {
    accept?: string[]
    multiple?: boolean
    title?: string
}

export interface EditorPlatformBridge {
    // Platform identification
    getPlatform(): 'vscode' | 'web' | 'electron'

    // File operations
    pickFile(options?: FilePickerOptions): Promise<string | null>
    pickAttachmentFile?(): Promise<{ path: string; name: string } | null>
    saveFile?(path: string, content: string): Promise<void>
    readFile?(path: string): Promise<string>

    // Links & navigation
    openExternal(url: string): void
    navigateToNote?(noteId: string): void

    // Images
    savePastedImage?(base64: string, filename: string): Promise<string>

    // Document operations
    getWorkspaceFiles?(): Promise<string[]>
    resolveRelativePath?(relativePath: string): string

    // Logging (optional, defaults to console)
    log?(message: string, level?: 'info' | 'warn' | 'error'): void
}

/**
 * Default no-op bridge for testing or SSR
 */
export const defaultBridge: EditorPlatformBridge = {
    getPlatform: () => 'web',
    pickFile: async () => null,
    openExternal: (url) => {
        if (typeof window !== 'undefined') {
            window.open(url, '_blank')
        }
    },
    log: (message, level = 'info') => {
        console[level](`[JotxEditor] ${message}`)
    }
}
