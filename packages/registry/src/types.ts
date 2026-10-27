/**
 * Block Definition Interface
 * The contract that all blocks must fulfill (Core, UI, and Parsing)
 */
export interface BlockDefinition<Props = any> {
    type: string;

    // ==========================================
    // 1. Parsing Rules (The "Grammar")
    // ==========================================
    syntax: {
        // The keyword used in the file, e.g. "video" -> "def video block_id"
        // If undefined, this block cannot be defined explicitly (maybe internal only)
        keyword?: string;

        // Markdown-style prefix (e.g. "# " for heading1)
        // If present, the parser will try to match this first
        markdownPrefix?: string;

        // Does this block accept children? (e.g. list items, section)
        hasChildren?: boolean;

        // Does this block accept raw text content? (e.g. access via 'text """content"""')
        hasText?: boolean;

        // Property that may be written inline on the def line in compact syntax:
        //   def heading "Goals"   ->   properties.text = "Goals"
        primary?: string;
    };

    // ==========================================
    // 2. Schema (Validation)
    // ==========================================
    schema: {
        properties: Record<keyof Props, PropertyDefinition>;
    };

    // ==========================================
    // 3. UI (Frontend)
    // ==========================================
    ui?: {
        icon?: string; // Icon name (lucide)
        label?: string; // Human readable name
        description?: string;

        // Lazy loaded component import
        // Returns a Promise that resolves to a React Component
        component?: () => Promise<any>;
    };
}

export interface PropertyDefinition {
    type: 'string' | 'number' | 'boolean' | 'enum' | 'identifier';
    default?: any;
    required?: boolean;
    options?: string[]; // For enums
    description?: string;
}

export interface BlockFn<Props = any> {
    (props: Props): any;
}
