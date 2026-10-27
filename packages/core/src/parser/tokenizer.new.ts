/**
 * Tokenizer (Lexer) for jotx 3.0
 * Converts raw string into strict tokens for the parser
 */

export enum TokenType {
  HEADER_DEF = 'HEADER_DEF',   // hdef <type> <id>
  BLOCK_START = 'BLOCK_START', // def heading1 id
  INDENT = 'INDENT',           // "  " (2 spaces)
  DEDENT = 'DEDENT',           // Return to previous indent
  PROPERTY = 'PROPERTY',       // key "value"
  REF_KEYWORD = 'REF_KEYWORD', // ref <type> <id> (for jotxlink)
  TEXT_START = 'TEXT_START',   // text """
  TEXT_CONTENT = 'TEXT_CONTENT', // ... content ...
  TEXT_END = 'TEXT_END',       // """
  COMMENT = 'COMMENT',         // # comment
  NEWLINE = 'NEWLINE'          // Empty line
}

export interface Token {
  type: TokenType;
  value?: string;     // Generic value (e.g. key name, or partial text)
  params?: string[];  // For block start: [type, id]
  inline?: string;    // For block start: quoted value on the def line (compact syntax)
  line: number;       // For error reporting
}

export class Tokenizer {
  private tokens: Token[] = [];
  private indentStack: number[] = [0]; // Tack indentation levels (spaces)
  private currentLine: number = 0;

  // State for multiline text
  private inMultilineText: boolean = false;
  private currentMultilineDelimiter: string = '"""'; // Default, but will be overwritten

  tokenize(input: string): Token[] {
    this.tokens = [];
    this.indentStack = [0];
    this.currentLine = 0;
    this.inMultilineText = false;

    const lines = input.split('\n');

    for (let i = 0; i < lines.length; i++) {
      this.currentLine = i + 1;
      const rawLine = lines[i];

      // 1. Handle Multiline Text Mode
      if (this.inMultilineText) {
        const trimmedRight = rawLine.trimEnd();

        if (rawLine.trim() === this.currentMultilineDelimiter) {
          // Standard closing on own line
          this.tokens.push({ type: TokenType.TEXT_END, line: this.currentLine });
          this.inMultilineText = false;
        } else if (trimmedRight.endsWith(this.currentMultilineDelimiter)) {
          // Content + delimiter on same line
          // Preserve indentation/whitespace on left, strip delimiter from right
          const content = trimmedRight.slice(0, -this.currentMultilineDelimiter.length);
          this.tokens.push({ type: TokenType.TEXT_CONTENT, value: content, line: this.currentLine });
          this.tokens.push({ type: TokenType.TEXT_END, line: this.currentLine });
          this.inMultilineText = false;
        } else {
          // Just content
          this.tokens.push({ type: TokenType.TEXT_CONTENT, value: rawLine, line: this.currentLine });
        }
        continue;
      }

      // 2. Skip empty lines (but maybe meaningful for block separation?)
      // For now, ignore purely empty lines
      if (!rawLine.trim()) {
        continue;
      }

      // 3. Handle Indentation
      const indent = rawLine.search(/\S/);
      if (indent === -1) continue; // Should be handled by empty check, but safety

      const currentIndent = this.indentStack[this.indentStack.length - 1];

      if (indent > currentIndent) {
        this.indentStack.push(indent);
        this.tokens.push({ type: TokenType.INDENT, line: this.currentLine });
      } else if (indent < currentIndent) {
        while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indent) {
          this.indentStack.pop();
          this.tokens.push({ type: TokenType.DEDENT, line: this.currentLine });
        }
        if (this.indentStack[this.indentStack.length - 1] !== indent) {
          throw new Error(`Line ${this.currentLine}: Invalid indentation level`);
        }
      }

      const trimmed = rawLine.trim();

      // 4. Tokenize Line Content

      // Header Definition: hdef <type> <id>
      if (trimmed.startsWith('hdef ')) {
        const parts = trimmed.substring(5).split(/\s+/); // Remove "hdef " and split
        this.tokens.push({
          type: TokenType.HEADER_DEF,
          params: parts, // [docType, docId]
          line: this.currentLine
        });
        continue;
      }

      // Block Start: def <type> [id] ["inline value"]
      //   def heading h1          (classic: id, properties follow)
      //   def heading "Goals"     (compact: primary value inline, id optional)
      if (trimmed.startsWith('def ')) {
        const rest = trimmed.substring(4).trim();
        const quote = rest.indexOf('"');
        const head = (quote >= 0 ? rest.slice(0, quote) : rest).trim();
        const parts = head.split(/\s+/).filter(Boolean);
        let inline: string | undefined;
        if (quote >= 0) {
          const end = rest.lastIndexOf('"');
          if (end <= quote) throw new Error(`Line ${this.currentLine}: Unterminated quoted value on def line`);
          inline = rest.slice(quote + 1, end);
        }
        this.tokens.push({
          type: TokenType.BLOCK_START,
          params: parts,
          inline,
          line: this.currentLine
        });
        continue;
      }

      // Multiline Text Start: text """ or text """"
      // Regex to capture key and the opening delimiter (3 or more quotes), allowing optional content after
      const multiLineMatch = trimmed.match(/^([a-zA-Z_]+)\s+("{3,})(.*)$/);
      if (multiLineMatch) {
        const key = multiLineMatch[1];
        const delimiter = multiLineMatch[2];
        const initialContent = multiLineMatch[3];

        this.tokens.push({ type: TokenType.TEXT_START, value: key, line: this.currentLine });

        // Store the specific delimiter
        this.currentMultilineDelimiter = delimiter;

        // Check if it's a one-liner: key """value"""
        if (initialContent && initialContent.trimEnd().endsWith(delimiter)) {
          const content = initialContent.trimEnd().slice(0, -delimiter.length);
          if (content) {
            this.tokens.push({ type: TokenType.TEXT_CONTENT, value: content, line: this.currentLine });
          }
          this.tokens.push({ type: TokenType.TEXT_END, line: this.currentLine });
          this.inMultilineText = false;
        } else {
          // Multiline mode
          this.inMultilineText = true;
          // If there's content immediately after the delimiter, add it
          if (initialContent) {
            this.tokens.push({ type: TokenType.TEXT_CONTENT, value: initialContent, line: this.currentLine });
          }
        }
        continue;
      }

      // Property: key "value" or key 123 or key true

      // Ref Keyword: ref <type> <id> (for jotxlink)
      if (trimmed.startsWith('ref ')) {
        const parts = trimmed.substring(4).split(/\s+/);
        if (parts.length !== 2) {
          throw new Error(`Line ${this.currentLine}: ref keyword requires exactly 2 arguments: ref <type> <id>`);
        }
        this.tokens.push({
          type: TokenType.REF_KEYWORD,
          params: parts,
          line: this.currentLine
        });
        continue;
      }
      // Regex: ^key "value"$ or ^key 123$
      // Simple property parser
      // Property: key "value" or key 123
      const propMatch = trimmed.match(/^([a-zA-Z_]+)\s+(.+)$/);
      if (propMatch) {
        const key = propMatch[1];
        let value = propMatch[2];

        // Strip inline comments if present (only if # is preceded by whitespace)
        // This preserves # in identifiers like "DocID#blockId". Fully quoted values are
        // never truncated, so strings like "Bug #42" or "Brand | #14b8a6" survive.
        const isQuoted = value.length >= 2 && value.startsWith('"') && value.endsWith('"');
        const commentMatch = isQuoted ? null : value.match(/\s+#/);
        if (commentMatch) {
          value = value.substring(0, commentMatch.index).trim();
        }

        // Strip quotes if string
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }

        this.tokens.push({
          type: TokenType.PROPERTY,
          value: key,
          params: [value],
          line: this.currentLine
        });
        continue;
      }

      // Fallback/Comment
      if (trimmed.startsWith('#')) {
        this.tokens.push({ type: TokenType.COMMENT, value: trimmed, line: this.currentLine });
        continue;
      }

      throw new Error(`Line ${this.currentLine}: Syntax error: ${trimmed}`);
    }

    // Close remaining indentation
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      this.tokens.push({ type: TokenType.DEDENT, line: this.currentLine });
    }

    return this.tokens;
  }
}
