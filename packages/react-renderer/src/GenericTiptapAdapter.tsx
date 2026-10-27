import { registry, BlockDefinition } from '@jotx-labs/registry';
import { BlockNode } from '@jotx-labs/core/dist/types/ast';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

/**
 * Generic Tiptap Adapter
 * Automatically generates Tiptap node extensions from the Block Registry.
 */
export class GenericTiptapAdapter {

    /**
     * Generates a list of Tiptap Extensions based on the Registry
     */
    public getExtensions() {
        const extensions: any[] = [];

        // 1. Core Blocks (Document, Text, Paragraph are standard Tiptap)
        // We assume StarterKit handles these, or we explicitly define them if overridden.

        // 2. Registry Blocks
        const blocks = registry.getAll();

        // Skip standard Tiptap extensions that we handle manually or via StarterKit
        // 'code' is a mark in Tiptap but might be a block in our registry or just a name collision.
        // We must avoid defining a Node with the same name as an existing Mark.
        const SKIP_LIST = [
            'doc', 'text', 'paragraph',
            'code', 'codeBlock', 'link', 'bold', 'italic', 'strike', 'underline',
            'taskItem', 'taskList', 'listItem', 'orderedList', 'bulletList',
            'heading', 'blockquote', 'hardBreak', 'horizontalRule',
            'image', 'video'
        ];

        blocks.forEach(def => {
            if (SKIP_LIST.includes(def.type)) return;

            const Ext = Node.create({
                name: def.type,
                group: 'block', // TODO: Handle inline vs block based on definition
                content: def.syntax.hasChildren ? 'block+' : (def.syntax.hasText ? 'text*' : ''),

                // Define attributes based on schema
                addAttributes() {
                    const attrs: Record<string, any> = {};
                    if (def.schema && def.schema.properties) {
                        Object.entries(def.schema.properties).forEach(([key, prop]) => {
                            attrs[key] = {
                                default: prop.default,
                                // Keep the attribute in the HTML for serialization reference
                                keepOnSplit: false
                            };
                        });
                    }
                    return attrs;
                },

                parseHTML() {
                    return [
                        {
                            tag: `div[data-type="${def.type}"]`,
                        },
                    ];
                },

                renderHTML({ HTMLAttributes }) {
                    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': def.type, 'class': `jotx-block ${def.type}` }), 0];
                },

                // React Node View
                addNodeView() {
                    if (def.ui && def.ui.component) {
                        // We need a wrapper to handle the lazy load result or standard component
                        // This part is tricky because addNodeView expects a React component class/function directly usually
                        // But we can use ReactNodeViewRenderer to wrap it.

                        // Simplification: We assume the UI kit provides the component directly or via a specific loader
                        // For now, let's return a placeholder if not ready, or delegate to a DynamicNodeView
                        return ReactNodeViewRenderer(GenericNodeViewWrapper);
                    }
                    return null as any;
                },
            });

            extensions.push(Ext);
        });

        return extensions;
    }
}

// Temporary Wrapper until we implement the full React Component Loader
import React from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';

const GenericNodeViewWrapper: React.FC<NodeViewProps> = (props) => {
    const def = registry.get(props.node.type.name);
    const [Component, setComponent] = React.useState<any>(null);

    React.useEffect(() => {
        if (def?.ui?.component) {
            def.ui.component().then((mod: any) => {
                // Handle default export vs named
                setComponent(() => mod.default || mod);
            }).catch((err) => {
                console.error(`Failed to load component for ${def.type}`, err);
            });
        }
    }, [def]);

    if (!def) return <div>Unknown Block: {props.node.type.name} </div>;

    return (
        <NodeViewWrapper className={`jotx-node-view ${def.type}`}>
            {Component ? (
                <Component {...props.node.attrs} />
            ) : (
                <div className="loading-placeholder">Loading {def.ui?.label || def.type}...</div>
            )}
            {def.syntax.hasChildren && <NodeViewContent className="content" />}
        </NodeViewWrapper>
    );
};
