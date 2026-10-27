/**
 * Helpers for the line-based text formats widgets store in their attributes.
 */

/** Split multi-line text into trimmed, non-empty lines. */
export function lines(text: string | undefined): string[] {
  return (text || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
}

/** Split a "a | b | c" line into trimmed cells; missing cells come back as ''. */
export function cells(line: string, count: number): string[] {
  const parts = line.split('|').map(p => p.trim())
  while (parts.length < count) parts.push('')
  return parts
}

/** Join cells back into a "a | b | c" line, dropping trailing empty cells. */
export function joinCells(parts: string[]): string {
  const out = [...parts]
  while (out.length > 1 && !out[out.length - 1]) out.pop()
  return out.join(' | ')
}

/** Parse a number, falling back when the value is missing or invalid. */
export function num(value: string | undefined, fallback: number): number {
  const n = parseFloat(value || '')
  return Number.isFinite(n) ? n : fallback
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Copy text to the clipboard; resolves false if the platform refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** Named accent colors shared by all widgets (map to --jx-c-* tokens). */
export const ACCENTS = ['teal', 'blue', 'violet', 'pink', 'amber', 'green', 'red', 'slate'] as const
export type Accent = typeof ACCENTS[number]

/** Stable accent for the i-th item of a list. */
export function accentAt(i: number): Accent {
  return ACCENTS[((i % ACCENTS.length) + ACCENTS.length) % ACCENTS.length]
}
