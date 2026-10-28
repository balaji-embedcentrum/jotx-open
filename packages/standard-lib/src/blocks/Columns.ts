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

/** One tab of a tab bar. Consecutive tab blocks form a single bar; each holds regular blocks. */
export const TabBlock: BlockDefinition = {
    type: 'tab',
    syntax: {
        primary: 'title',
        keyword: 'tab',
        hasChildren: true
    },
    schema: {
        properties: {
            title: { type: 'string', required: true, description: 'Tab label' },
            icon: { type: 'string', required: false, description: 'Emoji shown before the label' }
        }
    },
    ui: {
        label: 'Tab',
        icon: 'panel-top'
    }
};
