import { BlockDefinition } from '@jotx-labs/registry';

export const ButtonStripBlock: BlockDefinition = {
    type: 'buttonstrip',
    syntax: {
        keyword: 'buttonstrip',
        hasText: false
    },
    schema: {
        properties: {
            // No properties on the strip itself for now
        }
    },
    ui: {
        label: 'Button Strip',
        icon: 'layout'
    }
};
