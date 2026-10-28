# @jotx-labs/cli

Check, convert and migrate `.jot` files, and publish a folder of them as a website.

```bash
npm install -g @jotx-labs/cli
```

| Command | What it does |
|---|---|
| `jotx validate notes.jot` | Checks the file against the block schemas; exits with 1 on errors. |
| `jotx migrate notes/ --to compact` | Rewrites files (folders are searched recursively) in compact or classic syntax. Each rewrite is verified by re-parsing; a file that would change meaning is left alone. |
| `jotx migrate notes/ --to compact --check` | Writes nothing; exits with 1 if any file is not in the target syntax. Useful in CI. |
| `jotx migrate notes/ --to compact --dry-run` | Lists the files that would change. |
| `jotx convert notes.jot -o notes.html` | Renders a file to one self-contained HTML page. |
| `jotx site build [folder]` | Builds a website from a folder of `.jot` files into `_site/`. Give it one `.jot` file to publish a one-file site. |
| `jotx site serve [folder]` | Previews the site at http://localhost:4000 and reloads on every save. |
| `jotx parse notes.jot` | Prints the syntax tree as JSON. |
| `jotx info notes.jot` | Shows the header and block counts. |

## Publishing a site

A site is a folder. `site.jot` holds the settings and the menu; every other `.jot` file becomes a page at a clean address.

```
my-site/
  site.jot               title, address, menu and footer
  index.jot              the home page, at /
  guides/start.jot       a page at /guides/start/
  attachments/logo.svg   copied as is
```

```jot
hdef jotx site

  title Systems Notes
  url https://example.github.io/notes/
  description Practical notes on requirements, safety and architecture.
  logo attachments/logo.svg
  accent "#6d28d9"

  def menu
    items """Home | index.jot
Guides | guides/index.jot
  Getting started | guides/start.jot
GitHub | https://github.com/example/notes"""

  def paragraph "Everything after the menu becomes the footer."
```

| `site.jot` field | Meaning |
|---|---|
| `title` | Site name, shown in the header and page titles. |
| `url` | Public address. Needed for the RSS feed, sitemap and canonical links; its path (such as `/notes/`) is where the site is served from. |
| `description`, `logo`, `accent` | Shown in search results and link previews; `logo` is a file in the site; `accent` is a hex colour. |
| `language` | Page language, `en` by default. |
| `script` | Where the jotx script comes from (default: jsDelivr). Point it at a copy in the site to self-host. |

Each page describes itself in its header:

| Page field | Meaning |
|---|---|
| `title`, `description` | Page title and summary; default to the first heading and paragraph. |
| `date` | `2026-11-10`. Dated pages are listed newest first and appear in the RSS feed. |
| `tags` | `safety, iso-26262`. Each tag gets a page listing everything tagged with it. |
| `order` | A number to order pages in listings and the generated menu. |
| `draft` | `true` leaves the page out (include drafts with `--drafts`). |
| `listing` | `false` hides the list of a folder's pages under its `index.jot`; `true` adds one to the home page. |

A blog needs nothing more: give posts a `date`, and the home page shows the six newest as cards with their title, summary and tags. Folder pages such as `/blog/` list their posts the same way.

What you get:

- Every page as finished HTML: it reads without a script and search engines see all of it, every tab included.
- Pages with diagrams, charts, maths or widgets also load the jotx script, which replaces the static version with the live view once it has drawn.
- Links between `.jot` files and paths to images keep working at the new addresses.
- A page for every folder, tag pages, `feed.xml`, `sitemap.xml`, `robots.txt` and a not-found page.
- Search across the whole site with [Pagefind](https://pagefind.app), running in the reader's browser. Press `/` or Cmd/Ctrl+K.

Folders and files starting with `.` or `_` are skipped. A small example lives in [examples/site](examples/site).

### One-file sites

A note that starts with tabs is a whole site in one file: its tabs become the top navigation, each tab is a page, and a tab that holds tabs gets a dropdown of them. A `menu` block just before the tabs adds its links to the right of the navigation.

```jot
hdef jotx mbse_site

  title MBSE Notes

  def menu
    items """GitHub | https://github.com/example/notes"""

  def tab "Home"
    def heading "Model-based systems engineering, in practice"
  def tab "Safety"
    def heading "Functional safety"
    def tab "HARA"
      def paragraph "..."
    def tab "FMEA"
      def paragraph "..."
```

Publish it with `jotx site build notes.jot`. Links such as `#safety` or `#fmea` open a page, search covers every page, and on narrow screens the navigation folds into a Menu button. The same file looks the same in VS Code and with the jotx script. A complete example ships with the extension: `jotx-help/examples/mbse-site-example.jot`.

Use `--script <url>` to load the jotx script from your own copy instead of jsDelivr.

### On GitHub Pages

```yaml
# .github/workflows/site.yml
name: Site
on: { push: { branches: [main] } }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npx @jotx-labs/cli site build
      - uses: actions/upload-pages-artifact@v3
        with: { path: _site }
      - uses: actions/deploy-pages@v4
```

## In CI

```yaml
- run: npx @jotx-labs/cli migrate docs/ --to compact --check
- run: find docs -name '*.jot' -print0 | xargs -0 -n1 npx @jotx-labs/cli validate
```

## Development

```bash
npm run build
node dist/cli.js validate ../../jotx-help/JOTX_FOR_HUMANS.jot
node dist/cli.js site serve examples/site
```

Apache-2.0
