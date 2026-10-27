/**
 * Stand-in for the VS Code webview API.
 *
 * The editor's blocks talk to their host by posting messages ("open this file",
 * "open this link"). In a browser there is no extension on the other end, so this
 * shim answers the few messages that make sense on a web page and ignores the rest.
 * It must be installed before any editor module loads.
 */

type Navigate = (path: string) => void

let navigate: Navigate = () => {}

export function setNavigator(fn: Navigate) {
  navigate = fn
}

const api = {
  postMessage(message: any) {
    switch (message?.type) {
      case 'openFile':
        if (message.path) navigate(String(message.path))
        break
      case 'openExternal':
        if (message.url && /^https?:\/\//i.test(String(message.url))) {
          window.open(String(message.url), '_blank', 'noopener,noreferrer')
        }
        break
      default:
        // Editing, templates, exports and file pickers need the VS Code extension
        break
    }
  },
  getState: () => ({}),
  setState: () => {}
}

if (typeof window !== 'undefined' && !(window as any).vscodeApi) {
  ;(window as any).vscodeApi = api
}
