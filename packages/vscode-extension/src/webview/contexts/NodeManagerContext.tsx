/**
 * NodeManager Context - Provides NodeManager to React components
 */

import React, { createContext, useContext, ReactNode, useState } from 'react';
import type { NodeEntry } from '@jotx-labs/core';
import { logger } from '../../utils/logger';

// Message types for communication with extension
export interface NodeManagerMessage {
    type: 'getNode' | 'getNodeByShortId' | 'getNodesByType' | 'getNodesByFile' | 'getAllNodes';
    payload?: any;
}

export interface NodeManagerResponse {
    type: 'nodeResult' | 'nodesResult';
    data: NodeEntry | NodeEntry[] | null;
}

// Context interface
interface NodeManagerContextType {
    getNode: (id: string) => Promise<NodeEntry | null>;
    getNodeByShortId: (shortId: string) => Promise<NodeEntry | null>;
    getNodesByType: (type: string) => Promise<NodeEntry[]>;
    getNodesByFile: (filePath: string) => Promise<NodeEntry[]>;
    getAllDocuments: () => Promise<NodeEntry[]>;
    getAllBlocks: () => Promise<NodeEntry[]>;
    searchNodes: (query: string) => Promise<NodeEntry[]>;
}

const NodeManagerContext = createContext<NodeManagerContextType | null>(null);

export function NodeManagerProvider({ children }: { children: ReactNode }) {
    // Import and use getVSCodeAPI to ensure it's initialized
    const [vscode] = useState(() => {
        const { getVSCodeAPI } = require('../vscode-api');
        return getVSCodeAPI();
    });

    // Counter for unique request IDs
    const requestIdRef = React.useRef(0);

    const sendMessage = (message: NodeManagerMessage): Promise<any> => {
        return new Promise((resolve) => {
            // Generate unique request ID
            const requestId = `req_${Date.now()}_${++requestIdRef.current}`;
            logger.log(`[NodeManagerContext] Sending message (${requestId}):`, message);

            if (!vscode) {
                logger.error('[NodeManagerContext] vscode API not available!');
                resolve(null);
                return;
            }

            const handler = (event: MessageEvent) => {
                const response = event.data;
                // Only process responses that match our request ID
                if ((response.type === 'nodeResult' || response.type === 'nodesResult') && response.requestId === requestId) {
                    logger.log(`[NodeManagerContext] Matched response (${requestId}):`, response);
                    window.removeEventListener('message', handler);
                    resolve(response.data);
                }
            };

            window.addEventListener('message', handler);
            vscode.postMessage({ ...message, requestId });

            // Timeout after 5s
            setTimeout(() => {
                logger.log(`[NodeManagerContext] Request timed out (${requestId}):`, message);
                window.removeEventListener('message', handler);
                resolve(null);
            }, 5000);
        });
    };


    const contextValue: NodeManagerContextType = {
        getNode: async (id: string) => {
            const result = await sendMessage({ type: 'getNode', payload: { id } });
            return result;
        },

        getNodeByShortId: async (shortId: string) => {
            // Use getNodeByShortId to find nodes by their short UUID
            // This works for both documents (jotx) and blocks (heading, mermaid, etc.)
            const result = await sendMessage({ type: 'getNodeByShortId', payload: { shortId } });
            return result;
        },

        getNodesByType: async (type: string) => {
            const result = await sendMessage({ type: 'getNodesByType', payload: { type } });
            return result || [];
        },

        getNodesByFile: async (filePath: string) => {
            const result = await sendMessage({ type: 'getNodesByFile', payload: { filePath } });
            return result || [];
        },

        getAllDocuments: async () => {
            // Get all nodes and filter for document-level (hdef) nodes only
            // Documents have type 'jotx' and no parentId
            const allNodes = await sendMessage({ type: 'getAllNodes' });
            if (!allNodes) return [];
            return allNodes.filter((node: NodeEntry) => node.type === 'jotx');
        },

        getAllBlocks: async () => {
            // Get all nodes and filter for internal (def) blocks only
            // Blocks have any type OTHER than 'jotx' (the document type)
            const allNodes = await sendMessage({ type: 'getAllNodes' });
            if (!allNodes) return [];
            return allNodes.filter((node: NodeEntry) => node.type !== 'jotx');
        },

        searchNodes: async (query: string) => {
            // Search across all blocks (not documents)
            const allBlocks = await contextValue.getAllBlocks();
            const lowerQuery = query.toLowerCase();
            return allBlocks.filter(node =>
                node.label.toLowerCase().includes(lowerQuery) ||
                node.id.toLowerCase().includes(lowerQuery)
            );
        }
    };

    return (
        <NodeManagerContext.Provider value={contextValue}>
            {children}
        </NodeManagerContext.Provider>
    );
}

export function useNodeManager() {
    const context = useContext(NodeManagerContext);
    if (!context) {
        throw new Error('useNodeManager must be used within NodeManagerProvider');
    }
    return context;
}
