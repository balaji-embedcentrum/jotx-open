# @jotx-labs/editor

The React and Tiptap editor behind jotx: every block and widget, the insert gallery, the `/` menu and the design tokens. The VS Code extension and the web embed are both built on it.

To show `.jot` files on a web page you do not need this package directly; use [`@jotx-labs/embed`](../embed/README.md), which wraps it in one script tag.

## Use in a React app

The editor works on a Tiptap document. Convert `.jot` text with the core and adapters packages:

```tsx
import { parse } from '@jotx-labs/core'
import { registerStandardBlocks } from '@jotx-labs/standard-lib'
import { TiptapAdapter } from '@jotx-labs/adapters'
import { JotxEditor, EditorModeProvider } from '@jotx-labs/editor'

registerStandardBlocks()
const adapter = new TiptapAdapter()

function Note({ text }: { text: string }) {
  const ast = parse(text)
  const doc = { type: 'doc', content: ast.document.blocks.map(b => adapter.blockToTiptap(b)) }
  return (
    <EditorModeProvider initialMode="edit">
      <JotxEditor
        documentId={ast.document.id}
        documentType="page"
        tiptapDoc={doc}
        onChange={json => { /* Tiptap JSON string; convert back with TiptapAdapter */ }}
      />
    </EditorModeProvider>
  )
}
```

| Prop | Description |
|---|---|
| `documentId` | Id from the document header |
| `documentType` | `page`, `meeting` or `tasklist` |
| `tiptapDoc` | Tiptap JSON document |
| `onChange` | Called with the Tiptap JSON string after each edit |
| `ribbonExpanded` | Shows the formatting toolbar expanded |
| `outline` | The *On this page* rail beside long documents (default on) |

Pass `initialMode="preview"` for a read-only view. Colours come from `--jotx-*` CSS custom properties (see `src/styles/tokens.css`). Mermaid, Chart.js and KaTeX load on demand.

Apache-2.0
