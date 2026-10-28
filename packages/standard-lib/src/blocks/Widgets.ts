import { BlockDefinition, PropertyDefinition } from '@jotx-labs/registry';

/**
 * Property names must be letters only (the .jot tokenizer rejects digits in keys).
 *
 * Widget blocks - self-contained interactive blocks whose whole state lives in
 * flat string properties. List-like data is stored as readable multi-line text
 * (one item per line) so files stay diff-friendly and easy for humans and AI to edit.
 *
 * Example:
 *   def kanban sprint
 *     title "Sprint 12"
 *     board """[Todo]
 *   Write docs
 *   [Done]
 *   Ship widgets"""
 */
interface WidgetSpec {
    label: string;
    icon: string;
    description: string;
    props: Record<string, string>; // property name -> description
}

const WIDGETS: Record<string, WidgetSpec> = {
    // Productivity
    kanban: {
        label: 'Kanban Board', icon: 'kanban', description: 'Columns of cards you can move between stages',
        props: { title: 'Board title', board: 'Lines: "[Column]" starts a column; every other line is a card' }
    },
    habit: {
        label: 'Habit Tracker', icon: 'repeat', description: 'Weekly habit grid with streaks',
        props: { title: 'Tracker title', habits: 'Lines: "Habit | 1010000" (Mon..Sun)' }
    },
    progress: {
        label: 'Progress', icon: 'gauge', description: 'One or more progress bars',
        props: { title: 'Title', items: 'Lines: "Label | value | max"' }
    },
    countdown: {
        label: 'Countdown', icon: 'hourglass', description: 'Live countdown to a date',
        props: { title: 'Event name', target: 'ISO date or datetime' }
    },
    timer: {
        label: 'Focus Timer', icon: 'timer', description: 'Pomodoro-style focus timer',
        props: { title: 'Timer label', minutes: 'Focus minutes', breakminutes: 'Break minutes' }
    },
    matrix: {
        label: 'Priority Matrix', icon: 'grid-2x2', description: 'Eisenhower urgent/important matrix',
        props: { title: 'Title', dofirst: 'Urgent + important', schedule: 'Important, not urgent', delegate: 'Urgent, not important', eliminate: 'Neither' }
    },
    proscons: {
        label: 'Pros & Cons', icon: 'scale', description: 'Weigh two sides of a decision',
        props: { title: 'Question', pros: 'One pro per line', cons: 'One con per line' }
    },
    decision: {
        label: 'Decision Record', icon: 'gavel', description: 'Lightweight ADR: context, decision, consequences',
        props: { title: 'Decision title', status: 'proposed | accepted | rejected | superseded', date: 'Decision date', context: 'Context', decision: 'Decision', consequences: 'Consequences' }
    },
    rating: {
        label: 'Rating', icon: 'star', description: 'Star rating',
        props: { title: 'Label', value: 'Current rating', max: 'Maximum rating' }
    },

    // Docs & planning
    toc: {
        label: 'Table of Contents', icon: 'list-tree', description: 'Live outline of the headings in this note',
        props: { title: 'Title', depth: 'Deepest heading level to include (1-3)' }
    },
    steps: {
        label: 'Steps', icon: 'list-ordered', description: 'Numbered how-to steps you can tick off',
        props: { title: 'Title', steps: 'Lines: "[x] Step title | detail"' }
    },
    timeline: {
        label: 'Timeline', icon: 'milestone', description: 'Milestones over time',
        props: { title: 'Title', events: 'Lines: "date | title | status | detail"' }
    },

    // Developer
    terminal: {
        label: 'Terminal', icon: 'terminal', description: 'Shell commands with copy buttons',
        props: { title: 'Window title', shell: 'Shell name', commands: 'Lines starting with "$ " are commands, others output' }
    },
    api: {
        label: 'API Endpoint', icon: 'webhook', description: 'Document an HTTP endpoint',
        props: { method: 'HTTP method', path: 'Endpoint path', summary: 'Summary', request: 'Request example', response: 'Response example' }
    },
    filetree: {
        label: 'File Tree', icon: 'folder-tree', description: 'Project directory structure',
        props: { title: 'Root name', tree: 'Indented lines (2 spaces per level), folders end with "/"' }
    },
    diff: {
        label: 'Diff', icon: 'git-compare', description: 'Before/after code diff',
        props: { title: 'Title', language: 'Language', before: 'Original text', after: 'Changed text' }
    },
    palette: {
        label: 'Color Palette', icon: 'palette', description: 'Color swatches, click to copy',
        props: { title: 'Palette name', colors: 'Lines: "Name | #hex"' }
    },
    badges: {
        label: 'Badges', icon: 'badge-check', description: 'Status badges (build, version, coverage...)',
        props: { items: 'Lines: "label | message | color"' }
    },
    animation: {
        label: 'Animated Flow', icon: 'waypoints', description: 'A token travels step by step between labelled nodes',
        props: { title: 'Title', steps: 'Lines: "Node | caption"', speed: 'Seconds per step', autoplay: 'true or false' }
    },
    shortcuts: {
        label: 'Shortcuts', icon: 'keyboard', description: 'Keyboard shortcut cheat sheet',
        props: { title: 'Title', items: 'Lines: "Cmd+K | Description"' }
    },
    menu: {
        label: 'Menu', icon: 'menu', description: 'Navigation bar linking notes and web pages, with dropdowns',
        props: { title: 'Optional title shown at the left', items: 'Lines: "Label | link"; indent two spaces for a dropdown entry' }
    }
};

function toDefinition(type: string, spec: WidgetSpec): BlockDefinition {
    const properties: Record<string, PropertyDefinition> = {};
    for (const [key, description] of Object.entries(spec.props)) {
        properties[key] = { type: 'string', required: false, description };
    }
    return {
        type,
        syntax: { keyword: type, hasChildren: false, ...('title' in spec.props ? { primary: 'title' } : {}) },
        schema: { properties },
        ui: { label: spec.label, icon: spec.icon, description: spec.description }
    };
}

export const WidgetBlocks: BlockDefinition[] = Object.entries(WIDGETS).map(([type, spec]) => toDefinition(type, spec));
