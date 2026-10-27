/**
 * Find Chrome/Chromium/Edge executable on the system
 * Supports macOS, Windows, Linux
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface ChromeInfo {
  executablePath: string
  browser: 'Chrome' | 'Edge' | 'Chromium'
}

/**
 * Find Chrome/Edge/Chromium on the system
 * Returns the first available browser
 */
export async function findChrome(): Promise<ChromeInfo | null> {
  const platform = os.platform()
  
  switch (platform) {
    case 'darwin':
      return findChromeMac()
    case 'win32':
      return findChromeWindows()
    case 'linux':
      return findChromeLinux()
    default:
      return null
  }
}

/**
 * Find Chrome on macOS
 */
function findChromeMac(): ChromeInfo | null {
  const paths = [
    // Google Chrome
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    `${os.homedir()}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    
    // Microsoft Edge
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    `${os.homedir()}/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`,
    
    // Chromium
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    `${os.homedir()}/Applications/Chromium.app/Contents/MacOS/Chromium`,
    
    // Chrome Canary
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    
    // Chrome Beta
    '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta'
  ]
  
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const browser = p.includes('Edge') ? 'Edge' : 
                      p.includes('Chromium') ? 'Chromium' : 'Chrome'
      return { executablePath: p, browser }
    }
  }
  
  return null
}

/**
 * Find Chrome on Windows
 */
function findChromeWindows(): ChromeInfo | null {
  const paths = [
    // Microsoft Edge (default on Windows 10/11)
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
    
    // Google Chrome
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    
    // Chromium
    'C:\\Program Files\\Chromium\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Chromium\\Application\\chrome.exe`
  ]
  
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const browser = p.includes('Edge') ? 'Edge' : 
                      p.includes('Chromium') ? 'Chromium' : 'Chrome'
      return { executablePath: p, browser }
    }
  }
  
  return null
}

/**
 * Find Chrome on Linux
 */
function findChromeLinux(): ChromeInfo | null {
  const paths = [
    // Google Chrome
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome-beta',
    '/usr/bin/google-chrome-dev',
    
    // Chromium
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    
    // Microsoft Edge (available on Linux)
    '/usr/bin/microsoft-edge',
    '/usr/bin/microsoft-edge-stable',
    '/usr/bin/microsoft-edge-beta',
    '/usr/bin/microsoft-edge-dev'
  ]
  
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const browser = p.includes('edge') ? 'Edge' : 
                      p.includes('chromium') ? 'Chromium' : 'Chrome'
      return { executablePath: p, browser }
    }
  }
  
  return null
}

/**
 * Get a user-friendly message about which browser was found
 */
export function getChromeBrowserName(info: ChromeInfo | null): string {
  if (!info) return 'No Chromium-based browser'
  return `${info.browser}`
}







