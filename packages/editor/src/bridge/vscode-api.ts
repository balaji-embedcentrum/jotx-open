/**
 * VS Code API stub for editor package
 * This gets replaced by actual vscode API in VS Code context
 * or by web equivalents in web context
 * 
 * IMPORTANT: acquireVsCodeApi() can only be called ONCE per webview.
 * If the host extension already called it, we must reuse that instance.
 */

import { logger } from '../utils/logger'

interface VSCodeAPI {
    postMessage: (message: any) => void
    getState: () => any
    setState: (state: any) => void
}

let vscodeApi: VSCodeAPI | null = null

export function getVSCodeAPI(): VSCodeAPI {
    if (vscodeApi) return vscodeApi

    // FIRST: Check if the host extension already acquired the API and stored it
    // This is critical - acquireVsCodeApi() can only be called ONCE
    if (typeof window !== 'undefined' && (window as any).vscodeApi) {
        logger.log('[Editor] Using pre-acquired VS Code API from window.vscodeApi')
        vscodeApi = (window as any).vscodeApi
        return vscodeApi!
    }

    // SECOND: We're the first to need it, so acquire it ourselves
    if (typeof window !== 'undefined' && (window as any).acquireVsCodeApi) {
        logger.log('[Editor] Acquiring VS Code API for the first time')
        vscodeApi = (window as any).acquireVsCodeApi()
            // Store it globally so other code can reuse it
            ; (window as any).vscodeApi = vscodeApi
        return vscodeApi!
    }

    // Fallback for non-VS Code environments (web app)
    logger.log('[Editor] Using fallback postMessage (non-VS Code environment)')
    return {
        postMessage: (message: any) => {
            logger.log('[Editor] postMessage (non-VS Code):', message)
        },
        getState: () => ({}),
        setState: () => { },
    }
}

