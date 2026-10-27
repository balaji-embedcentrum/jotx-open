import { DocumentParser } from './DocumentParser';
import { AST } from '../../types/ast';

/**
 * V3 Parser Entry Point
 * Wraps the modular DocumentParser to match the legacy API.
 */
export class Parser {
    private docParser: DocumentParser;

    constructor() {
        this.docParser = new DocumentParser();
    }

    parse(input: string): AST {
        const document = this.docParser.parse(input);

        // V3 Parser delegates validation to a separate step (see Validator class)
        // so we return empty errors here. The consumer should call validate(ast) if they want errors.
        // This is a cleaner 'separation of concerns'.

        return {
            document,
            errors: []
        };
    }
}
