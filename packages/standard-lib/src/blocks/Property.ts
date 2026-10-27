import { BlockDefinition } from '@jotx-labs/registry';

export const PropertyBlock: BlockDefinition = {
    type: 'property',
    syntax: {
        keyword: 'prop',
        hasChildren: false
    },
    schema: {
        properties: {
            key: { type: 'string', required: true },
            value: { type: 'string', required: true },
            type: { type: 'string', default: 'text' }
        }
    },
    ui: {
        label: 'Property',
        icon: 'tag'
    }
};
