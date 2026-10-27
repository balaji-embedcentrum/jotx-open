/**
 * VS Code specific types for NodeManager
 */

import type { NodeEntry } from '@jotx-labs/core'

/**
 * Cache metadata for NodeManager
 */
export interface CacheMetadata {
    version: string
    timestamp: number
    gitHead?: string
    fileHashes: Map<string, string>
}

/**
 * Cached data structure
 */
export interface CachedData {
    metadata: CacheMetadata
    nodes: NodeEntry[]
    defTrees: Record<string, any>
}

/**
 * File change event
 */
export interface FileChangeEvent {
    type: 'create' | 'update' | 'delete'
    filePath: string
}
