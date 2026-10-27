/**
 * Bridge utilities - platform-agnostic functions that use the bridge
 * These are convenience wrappers that components can import directly
 */

import { EditorPlatformBridge, defaultBridge } from './types'

// Current bridge instance (set by BridgeProvider)
let currentBridge: EditorPlatformBridge = defaultBridge

export function setBridge(bridge: EditorPlatformBridge) {
    currentBridge = bridge
}

export function getBridge(): EditorPlatformBridge {
    return currentBridge
}

// Convenience functions that use the current bridge
export async function openExternal(url: string): Promise<void> {
    currentBridge.openExternal(url)
}

export async function openFile(path: string): Promise<void> {
    if (currentBridge.openExternal) {
        currentBridge.openExternal(path)
    }
}

export async function pickAttachmentFile(): Promise<{ path: string; name: string } | null> {
    if (currentBridge.pickAttachmentFile) {
        return currentBridge.pickAttachmentFile()
    }
    // Fallback: use pickFile
    const path = await currentBridge.pickFile()
    if (path) {
        const name = path.split('/').pop() || path
        return { path, name }
    }
    return null
}

export async function savePastedImage(data: { mime: string; base64?: string; text?: string }): Promise<{ webviewUri: string }> {
    if (currentBridge.savePastedImage && data.base64) {
        const uri = await currentBridge.savePastedImage(data.base64, `pasted-${Date.now()}.png`)
        return { webviewUri: uri }
    }
    // Fallback: return data URL
    if (data.base64) {
        return { webviewUri: `data:${data.mime};base64,${data.base64}` }
    }
    if (data.text) {
        return { webviewUri: `data:${data.mime};base64,${btoa(data.text)}` }
    }
    return { webviewUri: '' }
}

export function navigateToNote(noteId: string): void {
    if (currentBridge.navigateToNote) {
        currentBridge.navigateToNote(noteId)
    }
}

export function getWorkspaceFiles(): Promise<string[]> {
    if (currentBridge.getWorkspaceFiles) {
        return currentBridge.getWorkspaceFiles()
    }
    return Promise.resolve([])
}

export function resolveRelativePath(relativePath: string): string {
    if (currentBridge.resolveRelativePath) {
        return currentBridge.resolveRelativePath(relativePath)
    }
    return relativePath
}
