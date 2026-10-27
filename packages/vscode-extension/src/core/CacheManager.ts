/**
 * CacheManager - Handles disk caching with git detection
 */

import * as vscode from 'vscode'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'
import type { CachedData, CacheMetadata } from './types'
import { logger } from '../utils/logger'

const execAsync = promisify(exec)

export class CacheManager {
    private cacheDir: string
    private cacheFile: string

    constructor(private workspaceFolder: vscode.WorkspaceFolder) {
        this.cacheDir = path.join(workspaceFolder.uri.fsPath, '.jotx', 'cache')
        this.cacheFile = path.join(this.cacheDir, 'node-registry.json')
    }

    /**
     * Load cache from disk
     * Returns null if cache is invalid (git HEAD changed, etc.)
     */
    async loadCache(): Promise<CachedData | null> {
        try {
            // Check if cache file exists
            await fs.access(this.cacheFile)

            // Read cache
            const content = await fs.readFile(this.cacheFile, 'utf-8')
            const cache: CachedData = JSON.parse(content, this.reviver)

            // Validate cache version
            if (cache.metadata.version !== '1.0') {
                logger.info('Cache version mismatch, invalidating')
                return null
            }

            // Check git HEAD
            const currentHead = await this.getGitHead()
            if (currentHead && cache.metadata.gitHead !== currentHead) {
                logger.info('Git HEAD changed, invalidating cache')
                return null
            }

            logger.info('Cache loaded successfully')
            return cache

        } catch (error) {
            // Cache doesn't exist or is corrupted
            logger.info('No valid cache found')
            return null
        }
    }

    /**
     * Save cache to disk
     */
    async saveCache(data: CachedData): Promise<void> {
        try {
            // Ensure cache directory exists
            await fs.mkdir(this.cacheDir, { recursive: true })

            // Get current git HEAD
            const gitHead = await this.getGitHead()

            // Update metadata
            data.metadata.gitHead = gitHead
            data.metadata.timestamp = Date.now()

            // Write to disk
            const content = JSON.stringify(data, this.replacer, 2)
            await fs.writeFile(this.cacheFile, content, 'utf-8')

            logger.info('Cache saved successfully')

        } catch (error) {
            logger.error('Error saving cache:', error)
        }
    }

    /**
     * Get current git HEAD (commit SHA)
     */
    private async getGitHead(): Promise<string | undefined> {
        try {
            const { stdout } = await execAsync('git rev-parse HEAD', {
                cwd: this.workspaceFolder.uri.fsPath
            })
            return stdout.trim()
        } catch {
            // Not a git repo
            return undefined
        }
    }

    /**
     * Hash a file for change detection
     */
    async hashFile(filePath: string): Promise<string> {
        const content = await fs.readFile(filePath, 'utf-8')
        return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16)
    }

    /**
     * Detect changed files by comparing hashes
     */
    async detectChangedFiles(cachedHashes: Map<string, string>, currentFiles: string[]): Promise<string[]> {
        const changed: string[] = []

        // Check modified files
        for (const file of currentFiles) {
            const currentHash = await this.hashFile(file)
            const cachedHash = cachedHashes.get(file)

            if (cachedHash !== currentHash) {
                changed.push(file)
            }
        }

        // Check deleted files
        for (const [file] of cachedHashes) {
            if (!currentFiles.includes(file)) {
                changed.push(file)
            }
        }

        return changed
    }

    /**
     * JSON replacer for Map serialization
     */
    private replacer(key: string, value: any): any {
        if (value instanceof Map) {
            return {
                __type: 'Map',
                entries: Array.from(value.entries())
            }
        }
        if (value instanceof Set) {
            return {
                __type: 'Set',
                values: Array.from(value)
            }
        }
        return value
    }

    /**
     * JSON reviver for Map deserialization
     */
    private reviver(key: string, value: any): any {
        if (value && value.__type === 'Map') {
            return new Map(value.entries)
        }
        if (value && value.__type === 'Set') {
            return new Set(value.values)
        }
        return value
    }
}
