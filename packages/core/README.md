# @jotx-labs/core

Parser, serializer and validator for `.jot` files. No editor, browser or VS Code dependencies, so it runs anywhere JavaScript does.

```bash
npm install @jotx-labs/core @jotx-labs/standard-lib
```

```ts
import { parse, serialize, validate, convertSyntax } from '@jotx-labs/core'
import { registerStandardBlocks } from '@jotx-labs/standard-lib'

registerStandardBlocks()        // block definitions: heading, table, kanban, …

const ast = parse(`hdef jotx plan
  title Launch plan

def heading "Goals"

def checklist
  items """[x] Compact syntax
[ ] Launch post"""
`)

validate(ast.document)                       // [] when the file is valid
serialize(ast, { style: 'compact' })         // back to text
convertSyntax(text, 'classic')               // { text, changed, ok }, verified by re-parsing
```

| Export | What it does |
|---|---|
| `parse(text)` | Text → AST. Reads both compact and classic syntax. |
| `serialize(ast, { style })` | AST → text, `compact` or `classic`. |
| `validate(document)` | Schema errors and warnings, each with a line number. |
| `convertSyntax(text, style)` | Rewrites a file in the other syntax and checks the content is unchanged. |
| `detectSyntaxStyle(text)` | Tells whether a file is written in compact or classic syntax. |
| `jotToMarkdown`, `markdownToJot` | Markdown conversion. |

The syntax itself is described in [JOTX_FOR_HUMANS.jot](../../jotx-help/JOTX_FOR_HUMANS.jot) and, compactly, in [JOTX_FOR_AI.jot](../../jotx-help/JOTX_FOR_AI.jot).

```bash
npm run build
npm test
```

Apache-2.0
