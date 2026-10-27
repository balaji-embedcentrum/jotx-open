import { BlockDefinition } from '@jotx-labs/registry';

export const ButtonBlock: BlockDefinition = {
    type: 'button',
    syntax: {
        keyword: 'button',
        hasText: false
    },
    schema: {
        properties: {
            label: { type: 'string', required: true, description: 'Button text' },
            link: { type: 'string', required: true, description: 'File path to navigate' },
            style: {
                type: 'enum',
                required: false,
                default: 'primary',
                options: ['primary', 'secondary', 'outline', 'ghost']
            },
            align: {
                type: 'enum',
                required: false,
                default: 'left',
                options: ['left', 'center', 'right']
            }
        }
    },
    ui: {
        label: 'Button',
        icon: 'play'
    }
};
