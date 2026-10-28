import { getVSCodeAPI } from '../bridge/vscode-api'

/**
 * Follow a link from a card, button or menu:
 *   #safety          opens that tab (or heading) in this note
 *   https://...      opens in the browser
 *   other.jot, ...   opens that note in jotx (VS Code), or its page (web)
 * ":previous" goes back; the VS Code extension handles it.
 */
export function followLink(link: string) {
  if (!link) return
  if (link.startsWith('#')) {
    try { location.hash = link } catch { /* sandboxed frames */ }
    return
  }
  const vscode = getVSCodeAPI()
  if (/^[a-z][a-z0-9+.-]*:/i.test(link)) vscode.postMessage({ type: 'openExternal', url: link })
  else vscode.postMessage({ type: 'openFile', path: link })
}
