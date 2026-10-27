/**
 * NodePickerDialog - Dialog for selecting nodes to reference in jotxlink
 */

import React, { useState, useEffect } from 'react';
import { useNodeManager } from '../contexts/NodeManagerContext';
import type { NodeEntry } from '@jotx-labs/core';
import '../styles/NodePickerDialog.css';
import { logger } from '../utils/logger';

interface NodePickerDialogProps {
    onSelect: (node: NodeEntry) => void;
    onCancel: () => void;
}

export function NodePickerDialog({ onSelect, onCancel }: NodePickerDialogProps) {
    const [activeTab, setActiveTab] = useState<'documents' | 'blocks'>('documents');
    const [documents, setDocuments] = useState<NodeEntry[]>([]);
    const [blocks, setBlocks] = useState<NodeEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Only show content blocks, not navigational blocks (link, button, jotxlink, card)
    const CONTENT_BLOCK_TYPES = ['mermaid', 'table', 'chart', 'math'];

    const nodeManager = useNodeManager();

    useEffect(() => {
        function loadNodes() {
            setLoading(true);
            try {
                const docs = nodeManager.getAllDocuments() as any[];
                const allBlocks = nodeManager.getAllBlocks() as any[];
                // Filter to only show content blocks, not navigational blocks
                const contentBlocks = allBlocks.filter((block: any) =>
                    CONTENT_BLOCK_TYPES.includes(block.type)
                );
                setDocuments(docs);
                setBlocks(contentBlocks);
            } catch (error) {
                logger.error('Failed to load nodes:', error);
            } finally {
                setLoading(false);
            }
        }
        loadNodes();
    }, []);


    const filteredDocuments = documents.filter(doc =>
        (doc.label || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.id || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredBlocks = blocks.filter(block =>
        (block.label || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (block.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (block.type || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getTypeIcon = (type: string) => {
        const icons: Record<string, string> = {
            // Document type
            jotx: '📄',

            // Text blocks
            paragraph: '📝',
            heading: '📌',
            quote: '💬',

            // List blocks
            list: '📋',
            listitem: '•',
            checklist: '☑️',
            taskitem: '✅',

            // Code & Rich blocks
            code: '💻',
            codereference: '�',
            math: '🔢',
            mermaid: '📊',
            chart: '📈',

            // Media blocks
            image: '🖼️',
            floatimage: '🖼️',
            video: '�',
            attach: '📎',

            // Container blocks
            callout: '�',
            section: '�',
            toggle: '�',

            // Table blocks
            table: '�',
            row: '➖',
            cell: '▫️',
            header: '▪️',

            // Data blocks
            properties: '🏷️',
            property: '🔖',

            // Other blocks
            divider: '➖',
            link: '�',
            linkcard: '🃏',
            datetime: '📅',
            jotxlink: '🔗',
            blockref: '�'
        };
        return icons[type] || '📦';
    };

    return (
        <div className="node-picker-overlay" onClick={onCancel}>
            <div className="node-picker-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="node-picker-header">
                    <h2>Select Block to Reference</h2>
                    <button className="close-btn" onClick={onCancel}>×</button>
                </div>

                <div className="node-picker-search">
                    <input
                        type="text"
                        placeholder="🔍 Search nodes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="node-picker-tabs">
                    <button
                        className={activeTab === 'documents' ? 'active' : ''}
                        onClick={() => setActiveTab('documents')}
                    >
                        📄 Documents ({documents.length})
                    </button>
                    <button
                        className={activeTab === 'blocks' ? 'active' : ''}
                        onClick={() => setActiveTab('blocks')}
                    >
                        📦 Blocks ({blocks.length})
                    </button>
                </div>

                <div className="node-picker-content">
                    {loading ? (
                        <div className="loading">Loading nodes...</div>
                    ) : activeTab === 'documents' ? (
                        <div className="node-list">
                            {filteredDocuments.length === 0 ? (
                                <div className="empty-state">No documents found</div>
                            ) : (
                                filteredDocuments.map(doc => (
                                    <div
                                        key={doc.id}
                                        className="node-item"
                                        onClick={() => onSelect(doc)}
                                    >
                                        <span className="node-icon">{getTypeIcon(doc.type)}</span>
                                        <div className="node-info">
                                            <div className="node-label">{doc.label}</div>
                                            <div className="node-meta">
                                                {doc.type} · {(doc.filePath || '').split('/').pop() || 'Unknown'}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="node-list">
                            {filteredBlocks.length === 0 ? (
                                <div className="empty-state">No blocks found</div>
                            ) : (
                                filteredBlocks.map(block => (
                                    <div
                                        key={block.id}
                                        className="node-item"
                                        onClick={() => onSelect(block)}
                                    >
                                        <span className="node-icon">{getTypeIcon(block.type)}</span>
                                        <div className="node-info">
                                            <div className="node-label">{block.label}</div>
                                            <div className="node-meta">
                                                {block.type} · ID: {(block.id || '').split('#').pop() || 'Unknown'} · {(block.filePath || '').split('/').pop() || 'Unknown'}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="node-picker-footer">
                    <button className="cancel-btn" onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
