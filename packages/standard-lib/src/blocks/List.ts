import { BlockDefinition } from '@jotx-labs/registry';

export const ListBlock: BlockDefinition = {
    type: 'list',
    syntax: {
        keyword: 'list',
        hasChildren: true,
    },
    schema: {
        properties: {
            listtype: { type: 'enum', options: ['bulleted', 'numbered'], default: 'bulleted' },
            items: { type: 'string', required: false, description: 'Compact form: one item per line (expanded into list items when read)' }
        }
    },
    ui: {
        label: 'List',
        icon: 'list'
    }
};

export const ListItemBlock: BlockDefinition = {
    type: 'listitem',
    syntax: {
        keyword: 'listitem',
        primary: 'text',
        markdownPrefix: '-',
        hasText: true,
        hasChildren: true // Nested lists
    },
    schema: {
        properties: {
            text: { type: 'string', required: true }
        }
    },
    ui: {
        label: 'List Item',
        icon: 'minus'
    }
};
