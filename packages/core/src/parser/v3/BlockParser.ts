import { Token, TokenType } from '../tokenizer.new';
import { BlockNode } from '../../types/ast';
import { registry } from '@jotx-labs/registry';

export class BlockParser {

    // Returns the parsed block and the next token index
    parseBlock(tokens: Token[], startIndex: number, parentStack: BlockNode[]): { node: BlockNode, nextIndex: number } | null {
        const token = tokens[startIndex];
        if (token.type !== TokenType.BLOCK_START) {
            return null;
        }

        // 1. Identify Type & ID
        let type = token.params![0];
        const id = token.params![1] || `auto_${Date.now()}_${startIndex}`;

        // 2. Resolve Registry Definition
        const resolvedType = this.resolveBlockType(type, parentStack);

        const block: BlockNode = {
            id,
            type: resolvedType as any,
            properties: {},
            children: [],
            line: token.line
        };

        // 3. Parse Body (Properties & Children)
        let i = startIndex + 1;

        // We need to track our own scope. 
        // In the indent-based tokenizer, children are marked by INDENT/DEDENT
        // But the linear token stream flattens this.

        // Actually, the RegistryParser approach loop was:
        // Iterate all tokens, maintain a `stack` of open blocks.
        // That approach is O(N) single pass and easier than recursive recursive calls 
        // because the tokenizer outputs linear tokens including INDENT/DEDENTS.

        // So BlockParser might just be a helper for "resolving type" and "parsing single prop",
        // while DocumentParser (or a main Parser loop) manages the stack.
        // Let's refactor DocumentParser to control the loop, and move the specific logic here.

        return null; // Logic moved to main loop for streaming efficiency
    }

    resolveBlockType(rawType: string, stack: BlockNode[]): string {
        let def = registry.get(rawType) || registry.getByKeyword(rawType);

        // Context-aware overriding
        if (rawType === 'item' && stack.length > 0) {
            const parent = stack[stack.length - 1];
            if (parent.type === 'checklist') return 'taskItem';
            if (parent.type === 'list') return 'listItem';
        }

        let finalType = def ? def.type : rawType;

        // V3 STRICT: Simplified Mappings (CASE-SENSITIVE)
        const SIMPLIFIED_MAP: Record<string, string> = {
            // No mappings - strict flatcase AST
        };
        if (SIMPLIFIED_MAP[finalType]) {
            finalType = SIMPLIFIED_MAP[finalType];
        }

        // V3 STRICT: Error if not registered (no fuzzy fallback)
        if (!registry.get(finalType)) {
            console.error(`Unknown block type '${rawType}'. Block types must be registered in registry and use exact flatcase names.`);
            finalType = 'custom';
        }

        return finalType;
    }

    parseProperty(block: BlockNode, key: string, value: any) {
        // V3 STRICT: Property names must be exact flatcase (no fuzzy matching)
        const blockDef = registry.get(block.type);
        let finalKey = key;

        if (blockDef && blockDef.schema) {
            // Type Coercion
            const propDef = blockDef.schema.properties[finalKey];
            if (propDef) {
                if (propDef.type === 'boolean') {
                    if (value === 'true') value = true;
                    if (value === 'false') value = false;
                }
                if (propDef.type === 'number') {
                    const num = parseFloat(value);
                    if (!isNaN(num)) value = num;
                }
            }
            // Properties outside the schema are allowed (custom data); the validator reports real problems
        }

        block.properties[finalKey] = value;
    }
}
