import { BlockDefinition } from '@jotx-labs/registry';

export const CardBlock: BlockDefinition = {
    type: 'card',
    syntax: {
        keyword: 'card',
        hasText: false
    },
    schema: {
        properties: {
            title: { type: 'string', required: true, description: 'Card title' },
            value: { type: 'string', required: false, description: 'Stat value' },
            icon: { type: 'string', required: false, description: 'Emoji icon' },
            color: {
                type: 'enum',
                required: false,
                default: 'teal',
                options: ['blue', 'green', 'red', 'yellow', 'purple', 'teal', 'gray']
            },
            link: { type: 'string', required: false, description: 'File path to navigate' }
        }
    },
    ui: {
        label: 'Card',
        icon: 'credit-card'
    }
};
