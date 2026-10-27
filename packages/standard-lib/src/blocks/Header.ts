import { BlockDefinition } from '@jotx-labs/registry';

export const HeaderBlock: BlockDefinition = {
    type: 'header',
    syntax: {
        keyword: 'header',
        hasChildren: true,
        hasText: true
    },
    schema: {
        properties: {
            rowspan: { type: 'number', required: false },
            colspan: { type: 'number', required: false }
        }
    }
};
