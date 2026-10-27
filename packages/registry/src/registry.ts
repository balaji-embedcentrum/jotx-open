import { BlockDefinition } from './types';

export class BlockRegistry {
    private static instance: BlockRegistry;
    private blocks: Map<string, BlockDefinition> = new Map();
    private keywords: Map<string, string> = new Map(); // keyword -> type
    private prefixes: Map<string, string> = new Map(); // prefix -> type

    private constructor() { }

    public static getInstance(): BlockRegistry {
        if (!BlockRegistry.instance) {
            BlockRegistry.instance = new BlockRegistry();
        }
        return BlockRegistry.instance;
    }

    /**
     * Register a new block definition
     */
    public register(definition: BlockDefinition): void {
        if (this.blocks.has(definition.type)) {
            console.warn(`Block type "${definition.type}" is already registered. Overwriting.`);
        }

        this.blocks.set(definition.type, definition);

        // Index by keyword
        if (definition.syntax.keyword) {
            this.keywords.set(definition.syntax.keyword, definition.type);
        }

        // Index by markdown prefix
        if (definition.syntax.markdownPrefix) {
            this.prefixes.set(definition.syntax.markdownPrefix, definition.type);
        }
    }

    /**
     * Get block definition by type
     */
    public get(type: string): BlockDefinition | undefined {
        return this.blocks.get(type);
    }

    /**
     * Get block definition by keyword (e.g. "video")
     */
    public getByKeyword(keyword: string): BlockDefinition | undefined {
        const type = this.keywords.get(keyword);
        return type ? this.blocks.get(type) : undefined;
    }

    /**
     * Get block definition by prefix (e.g. "# ")
     */
    public getByPrefix(prefix: string): BlockDefinition | undefined {
        // Find longest matching prefix
        // (This is a naive implementation, optimize with Trie later if needed)
        for (const [p, type] of this.prefixes.entries()) {
            if (prefix.startsWith(p)) {
                return this.blocks.get(type);
            }
        }
        return undefined;
    }

    /**
     * Get all registered blocks
     */
    public getAll(): BlockDefinition[] {
        return Array.from(this.blocks.values());
    }

    /**
     * Clear registry (useful for tests)
     */
    public clear(): void {
        this.blocks.clear();
        this.keywords.clear();
        this.prefixes.clear();
    }
}

// Export singleton instance for convenience
export const registry = BlockRegistry.getInstance();
