/**
 * ReadonlyBlockRenderer - Renders a readonly version of a referenced block
 * Uses Tiptap with existing extensions for consistent rendering
 */

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { NodeEntry } from '@jotx-labs/core';
import { TiptapAdapter } from '@jotx-labs/adapters';
import { MermaidNode } from '../extensions/MermaidNode';
import { ChartNode } from '../extensions/ChartNode';
import { JotxTable } from '../extensions/JotxTable';
import { MathNode } from '../extensions/MathNode';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import StarterKit from '@tiptap/starter-kit';
import '../styles/ReadonlyBlockRenderer.css';
import { logger } from '../utils/logger';

interface ReadonlyBlockRendererProps {
    node: NodeEntry;
    onEditSource: () => void;
}

export function ReadonlyBlockRenderer({ node, onEditSource }: ReadonlyBlockRendererProps) {
    const [tiptapContent, setTiptapContent] = useState<any>(null);

    // Convert NodeEntry to AST Block, then use TiptapAdapter (same as main editor!)
    useEffect(() => {
        // Reconstruct an AST block from NodeEntry
        const astBlock: any = {
            type: node.type,
            id: node.id,
            properties: node.properties || {},
            content: node.content || '',
            // Use astChildren (original AST) for tables, callouts, etc.
            children: (node as any).astChildren || []
        };

        // Use TiptapAdapter to convert (same logic as main editor)
        const adapter = new TiptapAdapter();
        const tiptapBlock = adapter.blockToTiptap(astBlock);

        logger.log('[ReadonlyBlockRenderer] Converted to Tiptap:', tiptapBlock);

        // Wrap in doc
        setTiptapContent({
            type: 'doc',
            content: [tiptapBlock]
        });
    }, [node]);

    // Create readonly Tiptap editor
    const editor = useEditor({
        content: tiptapContent,
        editable: false,
        extensions: [
            StarterKit,
            MermaidNode,
            ChartNode,
            MathNode,
            JotxTable.configure({ resizable: false }),
            TableRow,
            TableCell,
            TableHeader
        ],
        editorProps: {
            attributes: {
                class: 'readonly-block-content'
            }
        }
    }, [tiptapContent]);

    // Update content when it changes
    useEffect(() => {
        if (editor && tiptapContent && !editor.isDestroyed) {
            editor.commands.setContent(tiptapContent);
        }
    }, [editor, tiptapContent]);

    if (!tiptapContent) {
        return <div className="readonly-block-loading">Loading...</div>;
    }

    return (
        <div className="readonly-block-renderer">
            <EditorContent editor={editor} />
        </div>
    );
}
