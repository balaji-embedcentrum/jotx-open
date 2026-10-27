/**
 * Theme Provider - React Context for theming
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { JotxTheme, defaultLightTheme, defaultDarkTheme } from './types'

interface ThemeContextType {
  theme: JotxTheme
  setTheme: (theme: JotxTheme) => void
  isDark: boolean
  toggleDark: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  initialTheme?: JotxTheme
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<JotxTheme>(initialTheme || defaultLightTheme)
  const [isDark, setIsDark] = useState(false)

  // Detect VS Code theme
  useEffect(() => {
    const body = document.body
    const isDarkTheme = (body.classList.contains('vscode-dark') ||
                       body.classList.contains('vscode-high-contrast')) &&
                       !body.classList.contains('vscode-high-contrast-light')
    
    setIsDark(isDarkTheme)
    setThemeState(isDarkTheme ? defaultDarkTheme : defaultLightTheme)

    // Watch for theme changes
    let lastIsDark = isDarkTheme
    const observer = new MutationObserver(() => {
      const newIsDark = (body.classList.contains('vscode-dark') ||
                       body.classList.contains('vscode-high-contrast')) &&
                       !body.classList.contains('vscode-high-contrast-light')
      if (newIsDark !== lastIsDark) {
        lastIsDark = newIsDark
        setIsDark(newIsDark)
        setThemeState(newIsDark ? defaultDarkTheme : defaultLightTheme)
      }
    })

    observer.observe(body, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  // Apply theme CSS variables
  useEffect(() => {
    const root = document.documentElement
    
    // Colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--jotx-${key}`, value)
    })

    // Header
    Object.entries(theme.header).forEach(([key, value]) => {
      root.style.setProperty(`--jotx-header-${key}`, value)
    })

    // Editor
    Object.entries(theme.editor).forEach(([key, value]) => {
      root.style.setProperty(`--jotx-editor-${key}`, value)
    })

    // Blocks
    Object.entries(theme.blocks).forEach(([key, value]) => {
      root.style.setProperty(`--jotx-block-${key}`, value)
    })
  }, [theme])

  const setTheme = (newTheme: JotxTheme) => {
    setThemeState(newTheme)
  }

  const toggleDark = () => {
    setIsDark(!isDark)
    setThemeState(isDark ? defaultLightTheme : defaultDarkTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

