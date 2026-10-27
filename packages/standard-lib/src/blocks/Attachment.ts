import { BlockDefinition } from '@jotx-labs/registry';

export const AttachmentBlock: BlockDefinition = {
    type: 'attach',
    syntax: {
        keyword: 'attachment',
        hasText: true
    },
    schema: {
        properties: {
            path: { type: 'string', required: true },
            text: { type: 'string', required: true }
        }
    },
    ui: {
        label: 'Attachment',
        icon: 'paperclip'
    }
};
