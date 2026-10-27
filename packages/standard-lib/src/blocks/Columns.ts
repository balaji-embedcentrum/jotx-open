import { BlockDefinition } from '@jotx-labs/registry';

export const ColumnsBlock: BlockDefinition = {
    type: 'columns',
    syntax: {
        keyword: 'columns',
        hasChildren: true
    },
    schema: {
        properties: {}
    },
    ui: {
        label: 'Columns',
        icon: 'columns'
    }
};

export const ColumnBlock: BlockDefinition = {
    type: 'column',
    syntax: {
        keyword: 'column',
        hasChildren: true
    },
    schema: {
        properties: {
            width: { type: 'string', required: false, description: 'Relative column width (e.g. 1, 2)' }
        }
    },
    ui: {
        label: 'Column',
        icon: 'columns'
    }
};
