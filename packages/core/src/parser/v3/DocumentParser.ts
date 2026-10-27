import { Token, TokenType, Tokenizer } from '../tokenizer.new';
import { DocumentNode, BlockNode } from '../../types/ast';
import { BlockParser } from './BlockParser';
import { normalizeBlocks } from './normalize';
import { registry } from '@jotx-labs/registry';
import { generateBlockId } from '../../utils/idGenerator';

export class DocumentParser {
    private blockParser: BlockParser;
    private tokenizer: Tokenizer;

    constructor() {
        this.blockParser = new BlockParser();
        this.tokenizer = new Tokenizer();
    }

    parse(input: string): DocumentNode {
        const tokens = this.tokenizer.tokenize(input);
        const rootBlocks: BlockNode[] = [];
        const stack: BlockNode[] = [];
        let currentBlock: BlockNode | null = null;
        let currentPropKey: string | null = null;

        // Document metadata from hdef header
        let docType: string = 'jotx';
        let docId: string = 'doc';
        let docMetadata: Record<string, any> = {};
        let parsingDocMetadata = false;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            switch (token.type) {
                case TokenType.HEADER_DEF: {
                    // hdef <type> <id>
                    const headerType = token.params![0];
                    const headerId = token.params![1] || 'doc';

                    docType = headerType;
                    docId = headerId;
                    parsingDocMetadata = true; // Next properties belong to document metadata
                    break;
                }

                case TokenType.BLOCK_START: {
                    // First block encountered - stop parsing doc metadata
                    parsingDocMetadata = false;

                    const type = token.params![0];
                    const id = token.params![1] || generateBlockId();

                    // Delegate Type Resolution
                    const finalType = this.blockParser.resolveBlockType(type, stack);

                    const newBlock: BlockNode = {
                        id,
                        type: finalType as any,
                        properties: {},
                        children: [],
                        line: token.line
                    };

                    // Compact syntax: def heading "Goals" -> the block's primary property
                    if (token.inline !== undefined) {
                        const primary = registry.get(finalType)?.syntax.primary || 'text';
                        newBlock.properties[primary] = token.inline;
                    }

                    if (stack.length > 0) {
                        const parent = stack[stack.length - 1];
                        if (!parent.children) parent.children = [];
                        parent.children.push(newBlock);
                    } else {
                        rootBlocks.push(newBlock);
                    }
                    currentBlock = newBlock;
                    break;
                }

                case TokenType.INDENT:
                    if (currentBlock) {
                        stack.push(currentBlock);
                    }
                    break;

                case TokenType.DEDENT:
                    stack.pop();
                    currentBlock = stack.length > 0 ? stack[stack.length - 1] : null;
                    break;

                case TokenType.PROPERTY:
                    // If we're still parsing doc metadata (before first block), add to docMetadata
                    if (parsingDocMetadata && token.value) {
                        let val: any = token.params![0];

                        // Strip quotes if string
                        if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
                            val = val.substring(1, val.length - 1);
                        }

                        docMetadata[token.value] = val;
                    } else if (currentBlock && token.value) {
                        this.blockParser.parseProperty(currentBlock, token.value, token.params![0]);
                    }
                    break;

                case TokenType.REF_KEYWORD:
                    // ref <type> <id> (for jotxlink blocks)
                    if (currentBlock && token.params && token.params.length === 2) {
                        currentBlock.properties.refType = token.params[0];
                        currentBlock.properties.refId = token.params[1];
                    }
                    break;

                case TokenType.TEXT_START:
                    if (currentBlock && token.value) {
                        currentPropKey = token.value;
                        currentBlock.properties[currentPropKey] = "";
                    }
                    break;

                case TokenType.TEXT_CONTENT:
                    if (currentBlock && currentPropKey) {
                        const currentVal = currentBlock.properties[currentPropKey] as string;
                        currentBlock.properties[currentPropKey] = currentVal ? currentVal + '\n' + token.value : token.value;
                    }
                    break;

                case TokenType.TEXT_END:
                    currentPropKey = null;
                    break;
            }
        }

        return {
            id: docId,
            type: docType as any,
            metadata: docMetadata,
            blocks: normalizeBlocks(rootBlocks)
        };
    }
}
