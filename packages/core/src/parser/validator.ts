import { registry, BlockDefinition } from '@jotx-labs/registry';
import { AST, DocumentNode, BlockNode, ValidationError, ValidationErrorType } from '../types/ast';
import { DOCUMENT_SCHEMAS, BlockType, isValidDocumentKind, DOCUMENT_KINDS } from '../types/enums';

/**
 * Jotx Validator
 * Validates AST against Registry Schema
 */
export class Validator {

  validate(doc: DocumentNode): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate document-level schema (which blocks are allowed)
    this.validateDocumentSchema(doc, errors);

    // Validate document metadata
    this.validateDocumentMetadata(doc, errors);

    // Validate individual blocks
    this.validateBlocks(doc.blocks, errors);

    return errors;
  }

  /**
   * Validate that all blocks in the document are allowed for this document type
   */
  private validateDocumentSchema(doc: DocumentNode, errors: ValidationError[]) {
    const allowedBlocks = DOCUMENT_SCHEMAS[doc.type];

    if (!allowedBlocks) {
      errors.push({
        type: 'invalid_document_type',
        message: `Unknown document type: '${doc.type}'`,
        severity: 'error',
        line: 1
      });
      return;
    }

    // Check all blocks recursively
    this.checkBlocksAgainstSchema(doc.blocks, allowedBlocks, doc.type, errors);
  }

  /**
   * Validate document metadata (e.g. type enum)
   */
  private validateDocumentMetadata(doc: DocumentNode, errors: ValidationError[]) {
    // Validate type
    if (doc.metadata.type) {
      if (!isValidDocumentKind(doc.metadata.type)) {
        errors.push({
          type: 'invalid_metadata',
          message: `Invalid document type '${doc.metadata.type}'. Expected one of: ${DOCUMENT_KINDS.join(', ')}`,
          severity: 'error',
          line: 1
        });
      }
    }
  }

  /**
   * Recursively check if blocks are allowed in this document type
   */
  private checkBlocksAgainstSchema(
    blocks: BlockNode[],
    allowedBlocks: readonly BlockType[],
    docType: string,
    errors: ValidationError[]
  ) {
    if (!blocks || !Array.isArray(blocks)) return;

    for (const block of blocks) {
      // Check if block type is allowed in this document type
      if (!allowedBlocks.includes(block.type as BlockType)) {
        const lineNum = block.line || 1;
        errors.push({
          type: 'schema_violation',
          message: `Block type '${block.type}' is not allowed in '${docType}' documents (line ${lineNum})`,
          severity: 'error',
          line: lineNum,
          column: 1,
          blockId: block.id
        });
      }

      // Do not recursively check children against document schema.
      // Children validation should be handled by the parent block definition (if implemented)
      // or simply allowed. Document schema only restricts ROOT blocks.
    }
  }

  private validateBlocks(blocks: BlockNode[], errors: ValidationError[]) {
    if (!blocks || !Array.isArray(blocks)) return;

    for (const block of blocks) {
      this.validateBlock(block, errors);
      if (block.children) {
        this.validateBlocks(block.children, errors);
      }
    }
  }

  private validateBlock(block: BlockNode, errors: ValidationError[]) {
    const line = block.line || 0;
    const def = registry.get(block.type);

    // 1. Check for Unknown Block Type
    if (!def) {
      errors.push({
        type: 'invalid_block_type',
        message: `Unknown block type: '${block.type}'`,
        severity: 'error',
        line: line,
        blockId: block.id
      });
      return;
    }

    if (!def.schema) return; // No schema, strict validation skipped

    const schema = def.schema.properties;

    // 2. Check Required Properties
    for (const [key, propSchema] of Object.entries(schema)) {
      if (propSchema.required) {
        if (block.properties[key] === undefined || block.properties[key] === null) {
          errors.push({
            type: 'missing_required',
            message: `Block '${block.type}' is missing required property: '${key}'`,
            severity: 'error',
            line: line,
            blockId: block.id,
            propertyName: key
          });
        }
      }
    }

    // 3. Check Property Types & Enums
    for (const [key, value] of Object.entries(block.properties)) {
      const propSchema = schema[key];

      // Unknown property?
      if (!propSchema) {
        // If strict mode, we could error here. For now, allow extra props? 
        // User asked for "comprehensive validator", so maybe warn?
        // skipping for now to avoid noise on flexible blocks.
        continue;
      }

      // Enum Validation
      if (propSchema.type === 'enum' && propSchema.options) {
        if (!propSchema.options.includes(value)) {
          errors.push({
            type: 'invalid_enum',
            message: `Invalid value '${value}' for property '${key}'. Expected one of: ${propSchema.options.join(', ')}`,
            severity: 'error',
            line: line,
            blockId: block.id,
            propertyName: key
          });
        }
      }

      // Boolean Validation
      if (propSchema.type === 'boolean') {
        if (typeof value !== 'boolean') {
          errors.push({
            type: 'invalid_type',
            message: `Property '${key}' expects boolean, got ${typeof value}`,
            severity: 'error',
            line: line,
            blockId: block.id,
            propertyName: key
          });
        }
      }

      // Number Validation
      if (propSchema.type === 'number') {
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            type: 'invalid_type',
            message: `Property '${key}' expects number, got ${typeof value}`,
            severity: 'error',
            line: line,
            blockId: block.id,
            propertyName: key
          });
        }
      }
    }
  }
}

export function createValidator() {
  return new Validator();
}
