import { BlockDefinition } from '@jotx-labs/registry';

export const CellBlock: BlockDefinition = {
    type: 'cell',
    syntax: {
        keyword: 'cell',
        hasChildren: true,
        hasText: true // Allows inline text
    },
    schema: {
        properties: {
            rowspan: { type: 'number', required: false },
            colspan: { type: 'number', required: false }
        }
    }
};
