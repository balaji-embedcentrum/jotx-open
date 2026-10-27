import { BlockDefinition } from '@jotx-labs/registry';

export const BlockRefBlock: BlockDefinition = {
    type: 'blockref',
    syntax: {
        keyword: 'blockref',
        hasText: false
    },
    schema: {
        properties: {
            ref: { type: 'string', required: true, description: 'Target block ID' }
        }
    },
    ui: {
        label: 'Block Reference',
        icon: 'network' // Lucide icon
    }
};
