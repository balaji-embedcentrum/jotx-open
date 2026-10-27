import { BlockDefinition } from '@jotx-labs/registry';

export const TableBlock: BlockDefinition = {
    type: 'table',
    syntax: {
        primary: 'title',
        hasChildren: true
    },
    schema: {
        properties: {
            title: { type: 'string', required: false, description: 'Table title' },
            columns: { type: 'string', required: false }, // Legacy prop, ideally derived from headers
            rows: { type: 'string', required: false, description: 'Compact form: one row per line, cells separated by | (escape a literal | as \\|)' }
        }
    },
    ui: {
        label: 'Table',
        icon: 'table'
    }
}

export const TableRowBlock: BlockDefinition = {
    type: 'row',
    syntax: {
        hasChildren: true
    },
    schema: {
        properties: {}
    },
    ui: {
        label: 'Row',
        icon: 'rows'
    }
}

export const TableCellBlock: BlockDefinition = {
    type: 'cell',
    syntax: {
        hasChildren: true
    },
    schema: {
        properties: {
            text: { type: 'string', required: false } // can contain just text or other blocks
        }
    },
    ui: {
        label: 'Cell',
        icon: 'square'
    }
}

export const TableHeaderBlock: BlockDefinition = {
    type: 'header',
    syntax: {
        hasChildren: true
    },
    schema: {
        properties: {
            text: { type: 'string', required: false }
        }
    },
    ui: {
        label: 'Header',
        icon: 'heading'
    }
}
