# @jotx-labs/language

Language support for `.jot` files: a TextMate grammar for syntax highlighting, diagnostics that report schema errors on the right line, and completions and hovers for every block and property. The VS Code extension uses it for the text view of a note; it also works with Monaco in a web app.

```bash
npm install @jotx-labs/language
```

## VS Code

```ts
import * as vscode from 'vscode'
import { setupJotxLanguageForVSCode } from '@jotx-labs/language'

export function activate(context: vscode.ExtensionContext) {
  setupJotxLanguageForVSCode(vscode, context)   // diagnostics, completions and hovers
}
```

The grammar ships at `src/grammar/jotx.tmLanguage.json`; reference it from your extension's `contributes.grammars`.

## Monaco

```ts
import * as monaco from 'monaco-editor'
import { setupJotxLanguageForMonaco } from '@jotx-labs/language'

const language = setupJotxLanguageForMonaco(monaco)
const editor = monaco.editor.create(element, { value: 'def heading "Hello"', language: 'jotx' })

editor.onDidChangeModelContent(() => {
  const model = editor.getModel()!
  monaco.editor.setModelMarkers(model, 'jotx', language.validate(model.getValue()))
})
```

## Anywhere else

```ts
import { DiagnosticProvider } from '@jotx-labs/language'

const result = new DiagnosticProvider().validate(text)
result.isValid       // false if there is any error
result.diagnostics   // { message, severity, startLine, startColumn, endLine, endColumn }
```

Diagnostics cover unknown block types, missing required properties, invalid values and syntax errors, in both compact and classic syntax.

Apache-2.0
