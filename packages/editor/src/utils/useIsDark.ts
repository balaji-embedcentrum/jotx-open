import { useEffect, useState, type RefObject } from 'react'

/**
 * Whether the block is shown on a dark background.
 * VS Code marks the webview body with vscode-dark / vscode-high-contrast;
 * a page embedding jotx sets data-theme on the .jx-scope wrapper instead.
 */
export function useIsDark(ref: RefObject<HTMLElement>): boolean {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const body = document.body
    const scope = ref.current?.closest<HTMLElement>('[data-theme]') || null
    const compute = () =>
      body.classList.contains('vscode-dark') ||
      body.classList.contains('vscode-high-contrast') ||
      scope?.dataset.theme === 'dark'
    setIsDark(compute())

    const obs = new MutationObserver(() => setIsDark(compute()))
    obs.observe(body, { attributes: true, attributeFilter: ['class'] })
    if (scope) obs.observe(scope, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [ref])

  return isDark
}
