/**
 * Simple logger for @jotx-labs/editor
 * Can be overridden by platform-specific implementations
 */

type LogLevel = 'debug' | 'log' | 'info' | 'warn' | 'error'

interface Logger {
    debug: (...args: any[]) => void
    log: (...args: any[]) => void
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
}

const createLogger = (): Logger => {
    // Bundlers replace process.env.NODE_ENV with a literal; browsers have no process, hence the try
    let isProduction = false
    try { isProduction = process.env.NODE_ENV === 'production' } catch { /* no process object */ }

    const logFn = (level: LogLevel) => (...args: any[]) => {
        if (isProduction && (level === 'debug' || level === 'log')) {
            return // Suppress debug/log in production
        }
        console[level]('[JotxEditor]', ...args)
    }

    return {
        debug: logFn('debug'),
        log: logFn('log'),
        info: logFn('info'),
        warn: logFn('warn'),
        error: logFn('error'),
    }
}

export const logger = createLogger()
