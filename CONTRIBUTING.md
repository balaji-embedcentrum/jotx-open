# Contributing to jotx

Thanks for helping. Bug reports, examples, widgets and fixes are all welcome.

## Before you start

- **Bugs:** open an issue with the `.jot` text that shows the problem (trim it to the smallest file that still does), what you expected, and your VS Code version.
- **New blocks or widgets:** open an issue first so we can agree on the syntax. The file format is a public contract: once a block ships, files written with it have to keep opening.
- **Security problems:** do not open an issue. See [SECURITY.md](SECURITY.md).

## Set up

You need Node.js 20 or later and VS Code.

```bash
git clone https://github.com/balaji-embedcentrum/jotx-open.git
cd jotx
npm install
npm run build          # every package and the extension
npm test               # parser, serializer and adapter tests
```

To try the extension, open the repository in VS Code and press F5, or package it:

```bash
cd packages/vscode-extension && npx vsce package
code --install-extension jotx-*.vsix
```

To work on the web embed and the website:

```bash
npm run build:site     # builds packages/embed and writes _site/
npx serve _site        # or any static server
```

## How the code fits together

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) walks through the pipeline (text → tokens → AST → editor document and back) and shows how to add a widget in two files.

| Package | What lives there |
|---|---|
| `core` | Tokenizer, parser, serializer, validator, compact/classic conversion |
| `registry`, `standard-lib` | Block definitions and property schemas |
| `adapters` | AST ⇄ Tiptap document |
| `editor` | React and Tiptap editor, design tokens, widgets |
| `language` | Diagnostics, completions, hovers, syntax highlighting |
| `vscode-extension` | The extension host |
| `embed` | `<jotx-doc>` for web pages |
| `cli` | `jotx validate`, `jotx migrate` and friends |

## Pull requests

- Keep each pull request to one change, and describe what a user will notice.
- Add or update tests in `packages/core` or `packages/adapters` when you touch parsing, serializing or conversion. Every syntax change needs a round-trip test: parse, serialize, parse again, same document.
- If you change how a block looks, include a light and a dark screenshot.
- If you change the format, update `jotx-help/JOTX_FOR_HUMANS.jot` and `jotx-help/JOTX_FOR_AI.jot`.
- Run `npm run build && npm test` before you push.

By contributing you agree that your work is released under the [Apache-2.0 licence](LICENSE).

## Code of conduct

Everyone taking part is expected to follow the [code of conduct](CODE_OF_CONDUCT.md).
