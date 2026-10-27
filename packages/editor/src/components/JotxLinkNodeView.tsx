import React, { useState, useEffect } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useNodeManager } from '../contexts/NodeManagerContext';
import { NodePickerDialog } from './NodePickerDialog';
import { ReadonlyBlockRenderer } from './ReadonlyBlockRenderer';
import type { NodeEntry } from '@jotx-labs/core';
import { getVSCodeAPI } from '../bridge/vscode-api';
import '../styles/JotxLinkNodeView.css';
import { logger } from '../utils/logger';

export function JotxLinkNodeView({ node, updateAttributes, deleteNode }: NodeViewProps) {
    const refType = (node?.attrs as any)?.refType || '';
    const refId = (node?.attrs as any)?.refId || '';
    const [showPicker, setShowPicker] = useState(!refType || !refId);
    const [expanded, setExpanded] = useState(false);
    const [referencedNode, setReferencedNode] = useState<NodeEntry | null>(null);
    const nodeManager = useNodeManager();

    // Load referenced node
    useEffect(() => {
        if (refType && refId) {
            logger.log(`[JotxLink] Loading reference: type=${refType}, refId=${refId}`);

            // Try direct lookup first (for full node IDs like "filePath#shortId")
            const node = nodeManager.getNode((n) => n.id === refId);
            if (node) {
                logger.log(`[JotxLink] Found node via getNode:`, node);
                handleNodeFound(node as any);
            } else {
                // Fallback: try searching by short ID (for backwards compatibility or document nodes)
                logger.log(`[JotxLink] getNode failed, trying getNodeByShortId`);
                const fallbackNode = nodeManager.getNodeByShortId(refId);
                logger.log(`[JotxLink] getNodeByShortId result:`, fallbackNode);
                if (fallbackNode) handleNodeFound(fallbackNode as any);
            }
        }

        // Helper: Check if we got a document but need a specific block type
        function handleNodeFound(node: any) {
            // If refType matches node.type, we're good
            if (refType === node.type || refType === 'jotx' || refType === 'document') {
                setReferencedNode(node);
                return;
            }

            // We got a document but refType is a specific block type (mermaid, chart, etc.)
            // Try to find the first block of that type within the file
            if (node.type === 'jotx' && refType && (node.filePath || node.path)) {
                logger.log(`[JotxLink] Got document but need ${refType}, searching for block in file...`);
                try {
                    const nodesInFile = nodeManager.getNodesByFile(node.filePath || node.path);
                    const matchingBlock = nodesInFile.find(n => n.type === refType);
                    if (matchingBlock) {
                        logger.log(`[JotxLink] Found matching ${refType} block:`, matchingBlock);
                        setReferencedNode(matchingBlock as any);
                        return;
                    } else {
                        logger.log(`[JotxLink] No ${refType} block found in file, using document`);
                    }
                } catch (e) {
                    logger.error(`[JotxLink] Error searching for block:`, e);
                }
            }

            // Fallback: use what we got
            setReferencedNode(node);
        }
    }, [refType, refId, nodeManager]);


    const handleSelectNode = (selectedNode: NodeEntry) => {
        // refType = block type (jotx, mermaid, heading, etc.)
        // refId = the node's full ID for reliable lookup
        // For documents: ID is the AST document ID (e.g., "JotxUserGuide")
        // For blocks: ID is documentId#blockId (e.g., "JotxUserGuide#block_42")
        const refType = selectedNode.type;
        const refId = selectedNode.id;  // Store the full node ID

        logger.log('[JotxLink] Saving reference:', { refType, refId });
        updateAttributes({ refType, refId });
        setReferencedNode(selectedNode);
        setShowPicker(false);
    };

    const handleEditSource = () => {
        if (!referencedNode?.filePath) {
            logger.log('[JotxLink] No file path to open');
            return;
        }
        const vscode = getVSCodeAPI();
        logger.log(`[JotxLink] Opening file: ${referencedNode.filePath}`);
        vscode.postMessage({
            type: 'openFile',
            path: referencedNode.filePath  // Must be 'path' to match NoteEditorProvider
        });
    };

    const getTypeIcon = (type: string) => {
        const icons: Record<string, string> = {
            jotx: '📄',
            document: '📄',
            mermaid: '📊',
            code: '💻',
            chart: '📈',
            heading: '📌',
            paragraph: '📝',
            math: '🔢',
            table: '📦'
        };
        return icons[type] || '📦';
    };

    // Show picker if no ref set
    if (showPicker) {
        return (
            <NodeViewWrapper className="jotxlink-node-wrapper">
                <NodePickerDialog
                    onSelect={handleSelectNode}
                    onCancel={() => {
                        // If cancelled without selection and node has no existing reference, delete it
                        if (!refType && !refId) {
                            deleteNode();
                        } else {
                            setShowPicker(false);
                        }
                    }}
                />
            </NodeViewWrapper>
        );
    }

    // Show collapsible box with toggle
    return (
        <NodeViewWrapper className="jotxlink-node-wrapper">
            <div className="jotxlink-box">
                {/* Collapsible header with toggle */}
                <div
                    className="jotxlink-header"
                    onClick={() => setExpanded(!expanded)}
                >
                    <button className="toggle-btn">
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <span className="type-icon">{getTypeIcon(refType)}</span>
                    <span className="node-label">
                        {referencedNode?.label || refId}
                    </span>
                    <span className="node-meta">
                        {refType} · {referencedNode?.filePath?.split('/').pop() || ''}
                    </span>
                    <button
                        className="edit-source-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEditSource();
                        }}
                    >
                        <ExternalLink size={14} />
                    </button>
                </div>

                {/* Expanded content - shows block directly without type label */}
                {expanded && (
                    <div className="jotxlink-content">
                        {referencedNode ? (
                            // For document type, show metadata instead of full render
                            referencedNode.type === 'jotx' || referencedNode.type === 'document' ? (
                                <div className="jotxlink-document-meta">
                                    <div className="meta-row">
                                        <span className="meta-label">📄 Document</span>
                                        <span className="meta-value">{referencedNode.label || referencedNode.id}</span>
                                    </div>
                                    {referencedNode.filePath && (
                                        <div className="meta-row">
                                            <span className="meta-label">Path</span>
                                            <span className="meta-value">{referencedNode.filePath}</span>
                                        </div>
                                    )}
                                    {referencedNode.properties?.title && (
                                        <div className="meta-row">
                                            <span className="meta-label">Title</span>
                                            <span className="meta-value">{referencedNode.properties.title}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Render block directly - NO type label text before it
                                <ReadonlyBlockRenderer
                                    node={referencedNode}
                                    onEditSource={handleEditSource}
                                />
                            )
                        ) : (
                            <div className="jotxlink-empty-note">
                                ⏳ Loading referenced content...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
}

