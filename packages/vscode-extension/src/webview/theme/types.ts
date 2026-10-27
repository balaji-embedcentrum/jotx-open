/**
 * Theme System - Modular and extensible
 */

export interface JotxTheme {
  id: string
  name: string
  colors: ThemeColors
  header: HeaderTheme
  editor: EditorTheme
  blocks: BlockTheme
}

export interface ThemeColors {
  // Background
  background: string
  backgroundSecondary: string
  backgroundTertiary: string

  // Text
  text: string
  textSecondary: string
  textMuted: string

  // Primary
  primary: string
  primaryHover: string

  // Borders
  border: string
  borderHover: string

  // States
  success: string
  warning: string
  error: string
  info: string
}

export interface HeaderTheme {
  height: string
  backgroundColor: string
  borderColor: string
  logoSize: string
  titleSize: string
  titleWeight: string
  buttonSize: string
}

export interface EditorTheme {
  fontSize: string
  lineHeight: string
  fontFamily: string
  padding: string
  maxWidth: string
}

export interface BlockTheme {
  padding: string
  borderRadius: string
  hoverBackground: string
  dragHandleColor: string
}

/**
 * Surfaces and text are derived from the active VS Code theme so jotx blends
 * into any color theme; only the brand accent and status hues are fixed.
 */
const FG = 'var(--vscode-editor-foreground)'
const BG = 'var(--vscode-editor-background)'
const mix = (pct: number) => `color-mix(in srgb, ${FG} ${pct}%, ${BG})`

const SHARED_SURFACES = {
  background: BG,
  backgroundSecondary: mix(4),
  backgroundTertiary: mix(7.5),
  text: FG,
  textSecondary: mix(68),
  textMuted: mix(45),
  border: mix(12),
  borderHover: mix(22)
}

const SHARED_EDITOR: EditorTheme = {
  fontSize: '16px',
  lineHeight: '1.7',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  padding: '40px',
  maxWidth: '900px'
}

const SHARED_HEADER: HeaderTheme = {
  height: '52px',
  backgroundColor: BG,
  borderColor: mix(12),
  logoSize: '28px',
  titleSize: '15px',
  titleWeight: '600',
  buttonSize: '32px'
}

/**
 * Default Light Theme
 */
export const defaultLightTheme: JotxTheme = {
  id: 'light',
  name: 'Light',
  colors: {
    ...SHARED_SURFACES,
    primary: '#0d9488', // Teal-600 (AA on light backgrounds)
    primaryHover: '#0f766e', // Teal-700
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb'
  },
  header: SHARED_HEADER,
  editor: SHARED_EDITOR,
  blocks: {
    padding: '8px 12px',
    borderRadius: '8px',
    hoverBackground: mix(4),
    dragHandleColor: mix(35)
  }
}

/**
 * Default Dark Theme
 */
export const defaultDarkTheme: JotxTheme = {
  id: 'dark',
  name: 'Dark',
  colors: {
    ...SHARED_SURFACES,
    primary: '#2dd4bf', // Teal-400
    primaryHover: '#5eead4', // Teal-300
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa'
  },
  header: SHARED_HEADER,
  editor: SHARED_EDITOR,
  blocks: {
    padding: '8px 12px',
    borderRadius: '8px',
    hoverBackground: mix(5),
    dragHandleColor: mix(35)
  }
}
