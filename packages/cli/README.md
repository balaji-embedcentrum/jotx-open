# @jotx-labs/cli

Check, convert and migrate `.jot` files from the command line or in CI.

```bash
npm install -g @jotx-labs/cli
```

| Command | What it does |
|---|---|
| `jotx validate notes.jot` | Checks the file against the block schemas; exits with 1 on errors. |
| `jotx migrate notes/ --to compact` | Rewrites files (folders are searched recursively) in compact or classic syntax. Each rewrite is verified by re-parsing; a file that would change meaning is left alone. |
| `jotx migrate notes/ --to compact --check` | Writes nothing; exits with 1 if any file is not in the target syntax. Useful in CI. |
| `jotx migrate notes/ --to compact --dry-run` | Lists the files that would change. |
| `jotx convert notes.jot -o notes.html` | Renders a file to static HTML. |
| `jotx parse notes.jot` | Prints the syntax tree as JSON. |
| `jotx info notes.jot` | Shows the header and block counts. |

## In CI

```yaml
- run: npx @jotx-labs/cli migrate docs/ --to compact --check
- run: find docs -name '*.jot' -print0 | xargs -0 -n1 npx @jotx-labs/cli validate
```

## Development

```bash
npm run build
node dist/cli.js validate ../../jotx-help/JOTX_FOR_HUMANS.jot
```

Apache-2.0
