/**
 * Resolve CSS colors to concrete hex values.
 *
 * Theme tokens are often expressions (`var(--vscode-editor-foreground)`,
 * `color-mix(...)`), which canvas-based renderers (Chart.js, Mermaid's color
 * math) cannot consume. These helpers let the browser compute the final color.
 */

let probeCtx: CanvasRenderingContext2D | null = null

function toHex(n: number): string {
  return n.toString(16).padStart(2, '0')
}

/**
 * Resolve any CSS color expression to "#rrggbb" (alpha is dropped).
 * `scope` is the element whose theme applies (defaults to the page body), so a
 * dark embed on a light page resolves its own tokens.
 */
export function resolveCssColor(value: string, fallback: string, scope?: Element | null): string {
  if (!value || typeof document === 'undefined') return fallback
  try {
    const el = document.createElement('span')
    el.style.display = 'none'
    el.style.color = value
    if (!el.style.color) return fallback
    ;(scope || document.body).appendChild(el)
    const computed = getComputedStyle(el).color
    el.remove()

    if (!probeCtx) {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      probeCtx = canvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null
    }
    if (!probeCtx) return fallback
    probeCtx.clearRect(0, 0, 1, 1)
    probeCtx.fillStyle = '#000'
    probeCtx.fillStyle = computed
    probeCtx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = probeCtx.getImageData(0, 0, 1, 1).data
    if (a === 0) return fallback
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  } catch {
    return fallback
  }
}

/** Resolve a CSS custom property (e.g. '--jx-fg') to "#rrggbb". */
export function themeColor(name: string, fallback: string, scope?: Element | null): string {
  return resolveCssColor(`var(${name})`, fallback, scope)
}
