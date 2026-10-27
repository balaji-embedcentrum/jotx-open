import { BlockDefinition } from '@jotx-labs/registry';

export const GridCardBlock: BlockDefinition = {
    type: 'gridcard',
    syntax: {
        keyword: 'gridcard',
        hasText: false
    },
    schema: {
        properties: {
            layout: {
                type: 'enum',
                required: false,
                default: '2x2',
                options: ['1x1', '1x2', '2x1', '2x2', '2x3', '3x2', '3x3']
            }
        }
    },
    ui: {
        label: 'Grid Card',
        icon: 'grid'
    }
};
