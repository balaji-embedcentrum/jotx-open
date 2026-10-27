/**
 * NodeManagerContext - Provides access to node/file management
 * In web context, this manages the file tree and node lookup
 */

import React, { createContext, useContext } from 'react'

export interface JotxNode {
    id: string
    shortId?: string
    title: string
    path: string
    type: string
    children?: JotxNode[]
    file?: string
}

export interface NodeManager {
    nodes: JotxNode[]
    getNodeById: (id: string) => JotxNode | undefined
    getNodeByShortId: (shortId: string) => JotxNode | undefined
    getNodeByPath: (path: string) => JotxNode | undefined
    getNode: (predicate: (node: JotxNode) => boolean) => JotxNode | undefined
    getNodesByFile: (file: string) => JotxNode[]
    searchNodes: (query: string) => JotxNode[]
    getAllNodes: () => JotxNode[]
    getAllDocuments: () => JotxNode[]
    getAllBlocks: () => JotxNode[]
}

const defaultNodeManager: NodeManager = {
    nodes: [],
    getNodeById: () => undefined,
    getNodeByShortId: () => undefined,
    getNodeByPath: () => undefined,
    getNode: () => undefined,
    getNodesByFile: () => [],
    searchNodes: () => [],
    getAllNodes: () => [],
    getAllDocuments: () => [],
    getAllBlocks: () => [],
}

export const NodeManagerContext = createContext<NodeManager>(defaultNodeManager)

export function useNodeManager(): NodeManager {
    return useContext(NodeManagerContext)
}

export interface NodeManagerProviderProps {
    manager: NodeManager
    children: React.ReactNode
}

export function NodeManagerProvider({ manager, children }: NodeManagerProviderProps) {
    return (
        <NodeManagerContext.Provider value={manager}>
            {children}
        </NodeManagerContext.Provider>
    )
}
