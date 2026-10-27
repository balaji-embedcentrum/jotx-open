import { BlockDefinition } from '@jotx-labs/registry';

export const PropertiesBlock: BlockDefinition = {
    type: 'properties',
    syntax: {
        keyword: 'properties',
        hasChildren: true
    },
    schema: {
        properties: {
            title: { type: 'string', required: false, description: 'Property table title' }
        }
    },
    // Legacy: properties blocks are converted to a Key | Value table when a file is read.
    ui: {
        label: 'Properties',
        icon: 'list'
    }
};
