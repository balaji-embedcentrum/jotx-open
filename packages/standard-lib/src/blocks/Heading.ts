import { BlockDefinition } from '@jotx-labs/registry';

export const HeadingBlock: BlockDefinition = {
    type: 'heading',
    syntax: {
        primary: 'text',
        markdownPrefix: '#', // Matches #, ##, ### etc based on level? Or we define explicit heading1, heading2
        keyword: 'heading', // def heading level=1
        hasText: true
    },
    schema: {
        properties: {
            level: {
                type: 'number',
                default: 1,
                // TODO: add min/max validation in schema later
            },
            text: { type: 'string', required: true }
        }
    },
    ui: {
        label: 'Heading',
        icon: 'heading'
    }
};
