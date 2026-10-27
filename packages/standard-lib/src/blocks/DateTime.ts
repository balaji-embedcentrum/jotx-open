import { BlockDefinition } from '@jotx-labs/registry';

export const DateTimeBlock: BlockDefinition = {
    type: 'datetime',
    syntax: {
        keyword: 'datetime',
        hasText: false
    },
    schema: {
        properties: {
            mode: { type: 'enum', options: ['date', 'time', 'datetime'], default: 'datetime' },
            value: { type: 'string', required: true }
        }
    },
    ui: {
        label: 'Date/Time',
        icon: 'calendar'
    }
};
