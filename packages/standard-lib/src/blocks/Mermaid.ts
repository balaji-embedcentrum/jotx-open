import { BlockDefinition } from '@jotx-labs/registry';

export const MermaidBlock: BlockDefinition = {
    type: 'mermaid',
    syntax: {
        primary: 'title',
        keyword: 'mermaid',
        hasText: true
    },
    schema: {
        properties: {
            title: { type: 'string', required: false, description: 'Diagram title' },
            src: { type: 'string', required: true },
            showsource: { type: 'boolean', default: false }
        }
    },
    ui: {
        label: 'Mermaid Diagram',
        icon: 'git-branch'
    }
};
