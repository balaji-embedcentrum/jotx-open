# @jotx-labs/embed

Show `.jot` documents on any web page with one script tag. Every block and widget renders the way it does in the jotx editor for VS Code, read-only, in light or dark.

```html
<script src="https://cdn.jsdelivr.net/npm/@jotx-labs/embed@3.2.0/dist/jotx.min.js"></script>

<jotx-doc src="notes/launch-plan.jot"></jotx-doc>
```

That is the whole setup. The script defines a `<jotx-doc>` element; put one wherever a document should appear. It works on GitHub Pages, Netlify, a blog, or a plain HTML file served from any static host.

## Writing jot inside the page

Leave out `src` and put the text inside the element. A `<script type="text/jot">` wrapper keeps the browser from touching it; indentation is removed for you, and the `hdef` header line is optional.

```html
<jotx-doc>
  <script type="text/jot">
    def heading "Release checklist"

    def checklist
      items """[x] Tag the release
    [ ] Publish the notes"""
  </script>
</jotx-doc>
```

## Attributes

| Attribute | Values | Default | What it does |
|---|---|---|---|
| `src` | URL | none | The `.jot` file to show. Relative links resolve against the page. Change it to load another document. |
| `theme` | `auto`, `light`, `dark` | `auto` | `auto` follows the reader's system setting and updates when it changes. |
| `outline` | boolean | off | Shows the *On this page* rail next to long documents. |

Images and other media with relative paths load next to the `.jot` file, not the page, so a folder of notes and attachments can be published as it is.

## Events and methods

```js
const doc = document.querySelector('jotx-doc')

// After each document renders: the title from its header and any validation errors
doc.addEventListener('jotx:load', e => console.log(e.detail.title, e.detail.errors))

// A link to another note was clicked. By default the element loads it in place.
doc.addEventListener('jotx:navigate', e => {
  e.preventDefault()             // handle it yourself instead
  location.href = `view.html?src=${encodeURIComponent(e.detail.url)}`
})

// Show text you already have, for example from a file input
doc.setText('def heading "Hello"')
```

Links to websites open in a new tab. Links to other `.jot` files go through `jotx:navigate`.

## Styling

The element takes the width of its container. Colours come from `--jotx-*` custom properties, and an ordinary rule overrides them:

```css
jotx-doc .jotx-embed { --jotx-primary: #6d28d9; --jotx-background: transparent; }
jotx-doc .jotx-embed[data-theme="dark"] { --jotx-primary: #a78bfa; }
```

The tokens are `background`, `backgroundSecondary`, `backgroundTertiary`, `text`, `textSecondary`, `textMuted`, `border`, `borderHover`, `primary`, `primaryHover`, `success`, `warning`, `error`, `info` and `editor-maxWidth`, each prefixed with `--jotx-`.

## Size and loading

`jotx.min.js` is about 430 KB compressed and holds the parser, the editor engine and every widget. Mermaid, Chart.js and KaTeX are fetched only when a document contains a diagram, chart or formula. They are separate files next to `jotx.min.js` and load from wherever it was loaded, so self-hosting means copying the whole `dist` folder.

## Fetching from other sites

`src` is fetched by the reader's browser, so the other site has to allow it (CORS). GitHub raw links (`raw.githubusercontent.com`), GitHub Pages and most CDNs do. Files on the same site always work.

## Safety

A `.jot` file is data: it has no scripts and cannot run code. Text is rendered through the same escaping as the editor, and links to `javascript:` and other non-web schemes are not followed. Rendering a document someone else wrote is as safe as rendering their Markdown.

## Building from source

```bash
npm install
npm run build              # from the repository root: core, adapters, editor, …
cd packages/embed && npm run build
```

The output is `dist/jotx.min.js` plus `dist/chunks/` and `dist/assets/`.

Apache-2.0
