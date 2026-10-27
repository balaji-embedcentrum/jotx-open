import { BlockDefinition } from '@jotx-labs/registry';

export const DividerBlock: BlockDefinition = {
    type: 'divider',
    syntax: {
        keyword: 'divider',
        markdownPrefix: '---',
        hasText: false
    },
    schema: {
        properties: {}
    },
    ui: {
        label: 'Divider',
        icon: 'minus'
    }
};
