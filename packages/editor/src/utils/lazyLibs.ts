/**
 * Heavy rendering libraries, loaded on first use.
 *
 * Mermaid, Chart.js and KaTeX together are several megabytes. Loading them only
 * when a document actually contains a diagram, chart or equation keeps plain
 * notes fast, in the VS Code webview and in the browser embed alike.
 */

import { useEffect, useState } from 'react'

type Mermaid = typeof import('mermaid')['default']
type ChartCtor = typeof import('chart.js')['Chart']
type Katex = typeof import('katex')

let mermaidPromise: Promise<Mermaid> | null = null
let chartPromise: Promise<ChartCtor> | null = null
let katexPromise: Promise<Katex> | null = null

export function loadMermaid(): Promise<Mermaid> {
  return (mermaidPromise ??= import('mermaid').then(m => m.default))
}

export function loadChart(): Promise<ChartCtor> {
  return (chartPromise ??= import('chart.js').then(m => {
    m.Chart.register(...m.registerables)
    return m.Chart
  }))
}

export function loadKatex(): Promise<Katex> {
  return (katexPromise ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')])
    .then(([k]) => ((k as any).default || k) as Katex))
}

/** React hook: the library once loaded, null until then. */
function useLib<T>(load: () => Promise<T>): T | null {
  const [lib, setLib] = useState<T | null>(null)
  useEffect(() => {
    let alive = true
    load().then(l => { if (alive) setLib(() => l) }).catch(() => { /* render fallback stays */ })
    return () => { alive = false }
  }, [load])
  return lib
}

export const useMermaid = () => useLib(loadMermaid)
export const useChart = () => useLib(loadChart)
export const useKatex = () => useLib(loadKatex)
