import { getVSCodeAPI } from '../vscode-api'

type Pending = {
  resolve: (value: any) => void
  reject: (reason?: any) => void
}

const vscode = getVSCodeAPI()
const pending = new Map<string, Pending>()

// Export vscode for direct message posting
export { vscode }

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

// Register once
let registered = false
export function ensureBridge() {
  if (registered) return
  registered = true

  window.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data
    if (!msg || typeof msg !== 'object') return

    // Handle special message types
    if (msg.type === 'useFrontendPDF') {
      // Backend is signaling to use frontend jsPDF
      const requestId = msg.requestId
      if (requestId && pending.has(requestId)) {
        const p = pending.get(requestId)!
        pending.delete(requestId)
        // Resolve with special signal for frontend PDF generation
        p.resolve({ useFrontendPDF: true, fileName: msg.fileName })
      }
      return
    }

    const requestId = msg.requestId
    if (!requestId || !pending.has(requestId)) return
    const p = pending.get(requestId)!
    pending.delete(requestId)

    // Handle standard response types
    if (msg.type === 'exportComplete' || msg.type === 'exportCancelled') {
      p.resolve({ success: true, type: msg.type })
    } else if (msg.type === 'exportError') {
      p.reject(msg.error || 'Request failed')
    } else if (msg.type === 'attachmentPicked') {
      const path = msg.filePath || msg.path
      const name = msg.name || path.split(/[/\\]/).pop()
      p.resolve({ path, name })
    } else if (msg.ok) {
      p.resolve(msg.result)
    } else {
      p.reject(msg.error || 'Request failed')
    }
  })
}

export async function openExternal(url: string) {
  ensureBridge()
  const requestId = makeId('openExternal')
  return new Promise<void>((resolve, reject) => {
    pending.set(requestId, { resolve, reject })
    vscode.postMessage({ type: 'openExternal', requestId, url })
  })
}

export async function pickAttachmentFile() {
  ensureBridge()
  const requestId = makeId('pickAttachment')
  return new Promise<{ path: string; name: string } | null>((resolve, reject) => {
    pending.set(requestId, { resolve, reject })
    vscode.postMessage({ type: 'pickAttachment', requestId })
  })
}

export async function exportHelpDocsToWorkspace() {
  ensureBridge()
  const requestId = makeId('exportHelpDocs')
  return new Promise<{ folder: string; files: string[] }>((resolve, reject) => {
    pending.set(requestId, { resolve, reject })
    vscode.postMessage({ type: 'exportHelpDocs', requestId })
  })
}

export async function savePastedImage(input: { mime: string; base64?: string; text?: string }) {
  ensureBridge()
  const requestId = makeId('savePastedImage')
  return new Promise<{ relPath: string; webviewUri: string }>((resolve, reject) => {
    pending.set(requestId, { resolve, reject })
    vscode.postMessage({ type: 'savePastedImage', requestId, input })
  })
}

export async function getBacklinks(currentUri: string) {
  ensureBridge()
  const requestId = makeId('getBacklinks')
  return new Promise<Array<{ path: string; title: string; matches: number }>>((resolve, reject) => {
    pending.set(requestId, { resolve, reject })
    vscode.postMessage({ type: 'getBacklinks', requestId, currentUri })
  })
}

export async function openFile(path: string) {
  ensureBridge()
  const requestId = makeId('openFile')
  return new Promise<boolean>((resolve, reject) => {
    pending.set(requestId, { resolve, reject })
    vscode.postMessage({ type: 'openFile', requestId, path })
  })
}

export async function exportDocument(format: 'md' | 'docx' | 'pdf', html?: string, css?: string) {
  ensureBridge()
  const requestId = makeId('exportDocument')
  return new Promise<{ savedPath: string }>((resolve, reject) => {
    pending.set(requestId, { resolve, reject })
    vscode.postMessage({ type: 'exportDocument', requestId, format, html, css })
  })
}

export function openLocalGraph(documentUri: string) {
  // Fire and forget - opens the local graph view for this document
  vscode.postMessage({ type: 'openLocalGraph', documentUri })
}
