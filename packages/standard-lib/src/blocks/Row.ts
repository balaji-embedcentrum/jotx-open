import { BlockDefinition } from '@jotx-labs/registry';

export const RowBlock: BlockDefinition = {
    type: 'row',
    syntax: {
        keyword: 'row',
        hasChildren: true
    },
    schema: {
        properties: {}
    }
};
