/**
 * EditorNodeManagerBridge - Bridges VS Code's async NodeManager to the editor package's sync NodeManager
 * 
 * This component fetches nodes from VS Code's NodeManager via postMessage and provides them
 * to the editor package's NodeManagerContext so that NodePickerDialog can access nodes.
 */

import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { NodeManagerProvider as EditorNodeManagerProvider, type NodeManager } from '@jotx-labs/editor';
import type { NodeEntry } from '@jotx-labs/core';
import { useNodeManager } from '../contexts/NodeManagerContext';
import { logger } from '../../utils/logger';

interface EditorNodeManagerBridgeProps {
    children: ReactNode;
}

// Helper to create a node object with BOTH sets of property names
// (title/path for JotxNode interface, label/filePath for NodePickerDialog's direct access)
function createBridgedNode(n: NodeEntry): any {
    return {
        id: n.id,
        shortId: n.id.includes('#') ? n.id.split('#').pop() : undefined,
        // JotxNode interface properties
        title: n.label,
        path: n.filePath,
        file: n.filePath,
        type: n.type,
        // NodeEntry properties (for NodePickerDialog which accesses these directly)
        label: n.label,
        filePath: n.filePath,
        properties: n.properties,
        content: n.content,
        parentId: n.parentId,
        // For ReadonlyBlockRenderer - needs astChildren for tables, callouts, etc.
        astChildren: (n as any).astChildren || [],
        children: (n as any).astChildren || n.children || []
    };
}

export function EditorNodeManagerBridge({ children }: EditorNodeManagerBridgeProps) {
    const [nodes, setNodes] = useState<NodeEntry[]>([]);
    const [loadCount, setLoadCount] = useState(0);

    // Get VS Code's async node manager
    const vscodeNodeManager = useNodeManager();

    // Load nodes from VS Code's NodeManager
    useEffect(() => {
        async function loadNodes() {
            try {
                logger.log('[EditorNodeManagerBridge] Loading nodes from VS Code NodeManager...');
                const docs = await vscodeNodeManager.getAllDocuments();
                const blocks = await vscodeNodeManager.getAllBlocks();
                const allNodes = [...docs, ...blocks];
                logger.log(`[EditorNodeManagerBridge] Loaded ${allNodes.length} nodes (${docs.length} docs, ${blocks.length} blocks)`);
                setNodes(allNodes);
                setLoadCount(prev => prev + 1);  // Force re-render with new manager
            } catch (error) {
                logger.error('[EditorNodeManagerBridge] Error loading nodes:', error);
            }
        }
        loadNodes();
    }, [vscodeNodeManager]);

    // Create a NEW sync NodeManager when nodes change
    // useMemo ensures a new object reference when nodes array changes
    const syncNodeManager: NodeManager = useMemo(() => ({
        nodes: nodes.map(createBridgedNode),
        getNodeById: (id: string) => {
            const node = nodes.find(n => n.id === id);
            return node ? createBridgedNode(node) : undefined;
        },
        getNodeByShortId: (shortId: string) => {
            const node = nodes.find(n => n.id.endsWith(`#${shortId}`) || n.id === shortId);
            return node ? createBridgedNode(node) : undefined;
        },
        getNodeByPath: (path: string) => {
            const node = nodes.find(n => n.filePath === path);
            return node ? createBridgedNode(node) : undefined;
        },
        getNode: (predicate) => {
            const bridgedNodes = nodes.map(createBridgedNode);
            return bridgedNodes.find(predicate);
        },
        getNodesByFile: (file: string) => {
            return nodes.filter(n => n.filePath === file).map(createBridgedNode);
        },
        searchNodes: (query: string) => {
            const lowerQuery = query.toLowerCase();
            return nodes
                .filter(n =>
                    (n.label || '').toLowerCase().includes(lowerQuery) ||
                    (n.id || '').toLowerCase().includes(lowerQuery)
                )
                .map(createBridgedNode);
        },
        getAllNodes: () => nodes.map(createBridgedNode),
        getAllDocuments: () => nodes.filter(n => n.type === 'jotx').map(createBridgedNode),
        getAllBlocks: () => nodes.filter(n => n.type !== 'jotx').map(createBridgedNode)
    }), [nodes, loadCount]);  // Depend on nodes AND loadCount to ensure new reference

    // Always render children - the syncNodeManager will update when nodes load
    return (
        <EditorNodeManagerProvider manager={syncNodeManager}>
            {children}
        </EditorNodeManagerProvider>
    );
}
