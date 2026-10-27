import { BlockDefinition } from '@jotx-labs/registry';

export const ChecklistBlock: BlockDefinition = {
    type: 'checklist', // Matches legacy "def checklist"
    syntax: {
        keyword: 'checklist',
        hasChildren: true,
        hasText: false
    },
    schema: {
        properties: {
            items: { type: 'string', required: false, description: 'Compact form: one item per line, "[x] done" or "[ ] open"' }
        }
    },
    ui: {
        label: 'Checklist',
        icon: 'check-square'
    }
};

export const TaskItemBlock: BlockDefinition = {
    type: 'taskitem',
    syntax: {
        keyword: 'taskitem',
        primary: 'text',
        hasText: true
    },
    schema: {
        properties: {
            text: { type: 'string', required: true },
            checked: { type: 'boolean', default: false },
            priority: { type: 'enum', options: ['low', 'medium', 'high', 'critical'], default: 'medium' }
        }
    },
    ui: {
        label: 'Task',
        icon: 'check-square'
    }
};
