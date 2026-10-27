/**
 * Jotx Logger - Centralized logging with dev/prod mode toggle
 * 
 * Format: [jotx 2.4.81][level] message
 * 
 * Usage:
 *   import { logger } from './utils/logger'
 *   logger.log('message')
 *   logger.info('info message')
 *   logger.warn('warning')
 *   logger.error('error')
 *   logger.debug('debug info')
 * 
 * CENTRAL SWITCH:
 *   - IS_DEV_MODE = true  → All logs enabled (log, info, warn, error, debug)
 *   - IS_DEV_MODE = false → Only info and error enabled (for production)
 */

// *** IMPORTANT: Keep this version in sync with package.json ***
export const JOTX_VERSION = '2.4.130'

// *******************************************
// CENTRAL SWITCH: Set to false for production
// *******************************************
const IS_DEV_MODE = false

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

// Safe stringify that handles circular references
function safeStringify(obj: any): string {
    if (typeof obj === 'string') return obj
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj)
    if (obj === null) return 'null'
    if (obj === undefined) return 'undefined'
    try {
        return JSON.stringify(obj)
    } catch (e) {
        // Handle circular references or other stringify errors
        return Object.prototype.toString.call(obj)
    }
}

class JotxLogger {
    private version: string
    private devMode: boolean

    constructor(version: string, devMode: boolean = true) {
        this.version = version
        this.devMode = devMode
    }

    private formatMessage(level: LogLevel, message: string): string {
        return `[jotx ${this.version}][${level}] ${message}`
    }

    setDevMode(devMode: boolean) {
        this.devMode = devMode
    }

    isDevMode(): boolean {
        return this.devMode
    }

    // Regular log - ONLY in dev mode
    log(...args: any[]) {
        if (!this.devMode) return
        const msg = args.map(a => safeStringify(a)).join(' ')
        console.log(this.formatMessage('log', msg))
    }

    // Info - ALWAYS enabled (dev and prod)
    info(...args: any[]) {
        const msg = args.map(a => safeStringify(a)).join(' ')
        console.info(this.formatMessage('info', msg))
    }

    // Warn - ONLY in dev mode
    warn(...args: any[]) {
        if (!this.devMode) return
        const msg = args.map(a => safeStringify(a)).join(' ')
        console.warn(this.formatMessage('warn', msg))
    }

    // Error - ALWAYS enabled (dev and prod)
    error(...args: any[]) {
        const msg = args.map(a => safeStringify(a)).join(' ')
        console.error(this.formatMessage('error', msg))
    }

    // Debug - ONLY in dev mode
    debug(...args: any[]) {
        if (!this.devMode) return
        const msg = args.map(a => safeStringify(a)).join(' ')
        console.debug(this.formatMessage('debug', msg))
    }

    // Group logging - ONLY in dev mode
    group(label: string) {
        if (!this.devMode) return
        console.group(`[jotx ${this.version}] ${label}`)
    }

    groupEnd() {
        if (!this.devMode) return
        console.groupEnd()
    }
}

// Export singleton instance
export const logger = new JotxLogger(JOTX_VERSION, IS_DEV_MODE)

// Export for changing mode at runtime
export function setDevMode(devMode: boolean) {
    logger.setDevMode(devMode)
}

// Export constants
export const isDevelopment = IS_DEV_MODE
