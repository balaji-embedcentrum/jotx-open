# jotx architecture

How a `.jot` file becomes an editable page, and where to change things.

## The pipeline

```
 .jot text ──tokenize/parse──▶ AST (BlockNode tree) ──TiptapAdapter──▶ Tiptap JSON ──▶ editor (React NodeViews)
     ▲                                                                                     │
     └────────── serialize ◀── AST ◀── TiptapAdapter.tiptapToBlocks ◀── Tiptap JSON ◀──────┘  (on every edit)
```

1. **`packages/core`** — `tokenizer.new.ts` turns indentation-based text into tokens; `parser/v3/DocumentParser.ts` builds the AST; `parser/serializer.ts` writes it back; `parser/validator.ts` checks it against the registry.
2. **`packages/registry` + `packages/standard-lib`** — every block type is a `BlockDefinition` (keyword, whether it has children, property schema, label/icon). `registerStandardBlocks()` must run before parsing: unregistered keywords become `custom` and fail validation.
3. **`packages/adapters`** — `TiptapAdapter` maps AST blocks to Tiptap nodes and back. Widgets need no case here (see below).
4. **`packages/editor`** — the Tiptap editor, node views, design tokens, widgets, menus and toolbar. Consumed by the VS Code webview and the web app.
5. **`packages/language`** — diagnostics, completions and hovers for the text editor (all registry-driven) and the TextMate grammar.
6. **`packages/vscode-extension`** — the custom editor provider (`NoteEditorProvider.ts`): reads the file, sends Tiptap JSON to the webview, converts edits back to text and writes the file.

## File format rules worth knowing

The full syntax reference is `jotx-help/JOTX_FOR_AI.jot`. Two syntaxes exist and the parser reads both:

- **Classic**: `def <keyword> <id>`, then one property per line, every value quoted.
- **Compact** (3.1+): `def <keyword> [id] ["main value"]`, ids only on link targets, defaults omitted, unambiguous text unquoted, and one line per item in `items` (lists, checklists), `rows` (tables) and `data` (charts).

Compact forms are expanded into the classic block tree in `core/src/parser/v3/normalize.ts`, so adapters, the editor and validation see one shape. The serializer writes either style (`serialize(ast, { style })`); `convertSyntax` converts and refuses any result that would not read back with identical content (`core/src/parser/compare.ts`).

- Two-space indentation defines nesting.
- Property names are **letters only** (`[a-zA-Z_]+`) — digits make the line a syntax error.
- No line starts with `-`.
- Multi-line values use `"""…"""` (or a longer run of quotes if the content contains `"""`) and are kept verbatim.
- A ` #` outside quotes starts a comment; inside a quoted value it is kept.

## Design system

`packages/editor/src/styles/tokens.css` defines every `--jx-*` token: surfaces and text derived from the host theme (VS Code variables, or the web host's palette), the brand accent, status and categorical colors, radii, shadows and motion. Components read **only** `--jx-*` tokens, so a new theme is a change to the host's `--jotx-*` variables.

`Page.css` lays a note out like a web page: prose in a reading column (`--jx-measure`), rich blocks breaking out to the page width, the hero heading, heading rhythm and the backdrop. `OutlineRail.tsx` is the *On this page* navigation.

## Widgets

A widget is an atom block whose whole state is flat string properties. The adapter maps properties ⇄ node attributes 1:1 for any type in `WIDGET_BLOCK_TYPES`, so adding one never touches the parser, serializer or adapter.

Each block definition may name a `syntax.primary` property: the value written inline on the def line in compact syntax (`text` for text blocks, `title` for widgets, tables and diagrams).

To add a widget:

1. **Declare it** — add the name to `WIDGET_BLOCK_TYPES` in `packages/core/src/types/enums.ts`, and its properties to `packages/standard-lib/src/blocks/Widgets.ts` (this drives validation, completions and hovers).
2. **Build it** — create `packages/editor/src/widgets/kinds/<Name>.tsx` exporting a `WidgetSpec` (label, icon, category, sample `defaults`, settings `fields`, and a `View`), plus `styles/widgets/<name>.css`. Register it in `widgets/index.ts`.

The shared frame (`WidgetFrame.tsx`) provides the header, drag handle, settings panel and preview-mode handling. The widget appears in the `/` menu and the Insert gallery automatically. List data should be readable multi-line text (one item per line, fields separated by ` | `) so files stay diff-friendly.

## Building and releasing

```bash
npm install
npm run build              # registry → core → standard-lib → adapters → react-renderer → editor → language → extension
node scripts/sync-versions.js   # after editing version.ts: syncs every package.json, internal ranges and core's VERSION
cd packages/vscode-extension && npx vsce package
```

See [RELEASING.md](RELEASING.md) for npm and Marketplace publishing.
