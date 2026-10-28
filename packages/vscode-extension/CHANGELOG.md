# Changelog

All notable changes to this project will be documented in this file.

## [3.2.0] - 2026-10-27

Tabs and menus turn one note into several pages, and a folder of notes becomes a website.

### Added
- **Tabs**: `def tab "Overview"` holds ordinary blocks, and consecutive tabs share one tab bar under the title. Add, rename, reorder, give an icon to and delete tabs from the bar; tabs inside a tab become a compact card. Links such as `#tasks` open a tab, the outline lists tabs with their headings, and search opens the tab that holds a match. Markdown export turns each tab into a heading; printing shows every tab.
- **One-file sites**: a note that starts with tabs uses them as its top navigation, with the note's title, dropdowns for tabs inside tabs, the links of a menu block placed just before them, and search. Each tab is a full page; on narrow screens the navigation becomes a Menu button. Example: `mbse-site-example.jot`.
- **Menu block**: a navigation bar of links to notes and web pages, with dropdowns from indented lines, that folds into one Menu button on narrow pages.
- **`jotx site build` and `jotx site serve`**: publish a folder of `.jot` files as a website with clean addresses, a site menu and footer from `site.jot`, folder and tag pages, an RSS feed, a sitemap, a not-found page and Pagefind search. Pages are complete HTML; pages with diagrams, charts, maths or widgets load the jotx script, which takes over once it has drawn.
- Blog home pages: dated posts appear on the home page as cards, newest first; folder pages list their posts as cards. `jotx site build notes.jot` publishes a one-file site; `--script` loads the jotx script from your own copy.
- `jotx convert` writes a styled, self-contained page with working tabs.
- Cards are clickable as a whole while reading, and links such as `#safety` on cards, buttons and menus open a tab.

### Changed
- Text, tables, diagrams and widgets share one column, so every block lines up on both edges. The page width setting controls all of them.

### Fixed
- **Saving no longer loses content.** Opening a note and saving it could empty table cells written as `text` values, turn header cells into ordinary cells, split column names containing a comma, drop table titles, turn checklist items into bullets (losing their ticks and priorities), drop `showsource`, and add default values to images, videos and cards. Every shipped note now opens and saves without change, and a test keeps it that way.
- **Saving no longer writes your local folders into notes.** An attached image shown in VS Code was saved with the address VS Code uses to display it, which contains the full path on your machine; it is saved as `attachments/…` again.
- **Blocks the editor cannot edit are kept as written.** Link cards, and blocks from a newer version of jotx, were replaced by an empty paragraph when a note was opened, and lost on save. Link cards now show as cards; other blocks show a note and are saved back unchanged.
- A toggle without a `collapsed` setting opened expanded and was saved that way; toggles are closed unless the file says otherwise.
- Videos without a `controls` setting opened with their controls hidden.
- Links from one note to another (such as `[next](next.jot)`) did nothing; they now open the note in jotx, and on the web they open the published page.
- Grid cards overflowed the screen on phones; they now shrink and stack.
- Embedded documents could scroll sideways on pages that do not set `box-sizing`.

## [3.1.4] - 2026-10-27

### Fixed
- `<jotx-doc>` with the jot text written inside it showed an empty document when the script tag came before the element, as in the documented example.
- The web script could fail to start on pages that do not declare a character set; it is now plain ASCII.
- Publishing `@jotx-labs/core` warned about a `jotx` command it does not ship; the command comes from `@jotx-labs/cli`.

## [3.1.3] - 2026-10-27

jotx goes public: documents can now be shown on any web page, and the project has a website built from a `.jot` file.

### Added
- **`@jotx-labs/embed`**: one script tag and a `<jotx-doc src="note.jot">` element show any `.jot` file on a web page, read-only, in light or dark. Mermaid, Chart.js and KaTeX load only when a document uses them.
- **Website and viewer** on GitHub Pages: the home page is a `.jot` file, and the viewer opens any `.jot` link, file or pasted text in the browser.
- Contributing guide, code of conduct, security policy, issue templates, and CI that builds, tests and validates every shipped `.jot` file.

### Fixed
- The CLI failed to start on Node 18 and 20; `jotx validate` reported an error for every file, and `jotx convert` crashed.
- `@jotx-labs/language` did not include its syntax-highlighting grammar.
- Empty paragraphs (blank lines) were reported as missing their text.
- In read-only mode, a block could keep its selection ring.
- Mermaid diagrams in read-only mode could mix light and dark colours.
- The guide's quick-start list had a step nested under the one before it.
- Web pages showed nothing when a document failed to render or the script could not start; they now show the reason. The web build no longer prints debug logs.
- On some machines a document failed with "The editor view is not available" because parts of the editor read the page before the editor was attached; they now wait for it, and a document that fails once is retried.

### Removed
- About 80 source files and 75 dependencies left over from the pre-3.0 interface; the extension installs and builds with far fewer packages.

## [3.1.0] - 2026-10-27

jotx 3.1 introduces **compact syntax**: the same documents in about 40% fewer tokens, so AI assistants write, read and edit notes for less. jotx reads both the classic and the compact syntax, and converts in either direction on request.

### Added
- **Compact syntax**: the main value sits on the def line (`def heading "Goals"`), block ids only where links and the knowledge graph use them, default values left out, plain text unquoted where unambiguous, and one line per list item (`items`), table row (`rows`) and chart row (`data`). Keywords stay full words, and no line starts with `-`.
- **`jotx.syntax` setting**: `preserve` (default: each file keeps its style, new files are compact), `compact` or `classic`
- **Commands**: Convert File to Compact Syntax, Convert File to Classic Syntax, Convert Workspace Syntax… Every conversion re-reads its result and only writes files whose content is unchanged.
- **CLI**: `jotx migrate <paths> --to compact|classic [--check] [--dry-run]`
- **Animated flow widget** (`def animation`): a token travels step by step between labelled nodes, with play, pause and stepping; respects reduced-motion settings
- Completions follow the chosen syntax; the grammar highlights inline values and unquoted text

### Changed
- `JOTX_FOR_AI.jot` rewritten for compact syntax: every block and widget, all examples validated, 55% shorter
- Help files, templates and examples use compact syntax
- Kanban cards are stored one per line without a leading `- ` (older boards still read)
- Charts no longer require `charttype` (bar is the default)

### Removed
- **Properties block**: use a table. Existing properties blocks open as a Key | Value table and are saved as one.

### Fixed
- Block ids for new blocks are short ids instead of timestamps
- Parser no longer logs a warning for every custom property
- Table rows, cells and headers were registered twice

## [3.0.0] - 2026-10-27

jotx 3 is a redesign from the page up: notes read like a modern web page, 19 live widgets join the block library, and the text editor finally understands the format.

### Highlights
- **A page, not a form** — prose sits in a reading column while tables, diagrams, media and widgets break out to full width; the opening heading and lead paragraph form a hero; an *On this page* rail tracks your position and reading progress.
- **19 widgets** — Kanban board, Habit tracker, Progress, Countdown, Focus timer, Rating, Priority matrix, Pros & cons, Decision record, Table of contents, Steps, Timeline, Terminal, API endpoint, File tree, Diff, Color palette, Badges, Keyboard shortcuts — plus 2- and 3-column layouts.
- **Insert gallery** — a floating glass toolbar with a searchable gallery of every block and widget; the `/` menu is grouped by category and ranks results.
- **Theme-native design system** — one token layer (`tokens.css`); colors follow the active VS Code theme (light, dark, high contrast, custom) with a single teal accent.
- **Every block redesigned** — Mermaid, Chart, Math, Code, Code reference, Date/Time, Image, Video, Attach, Properties, Grid cards, Buttons, Toggle, Section, jotx links, dialogs, search, template picker, graph view and the app shell.
- **Text-editor intelligence** — new TextMate grammar for every block and widget (including markers inside multi-line values), completions with property snippets, enum value completion, hover docs, and diagnostics on the correct line.

### Added
- Widget framework: one file per widget (`packages/editor/src/widgets/kinds/`), properties map 1:1 to `.jot` properties, shared frame with drag handle and settings panel
- `examples/widgets-showcase-example.jot`, a widget reference in `JOTX_FOR_AI.jot`, and `docs/ARCHITECTURE.md`

### Fixed
- Header lock (preview mode) had no effect in VS Code
- Quoted values containing ` #` (e.g. `"Bug #42"`, hex colors) were truncated by the parser
- Diagnostics were reported one line below the problem; parse errors always pointed at line 1
- Chart and Mermaid colors broke when theme variables were CSS expressions
- Header, ribbon and several dialogs used theme variables that are undefined in VS Code
- Margins beside the page did not scroll (the scroll container was resized with the page width)
- Checklist styles never matched Tiptap 3 markup
- Callout toolbar showed while the editor was not focused; the block menu showed in preview mode
- Theme did not switch back to light after a dark theme
- Root `npm run build` skipped `packages/editor`; versions were tracked in three disagreeing places

### Removed
- Stale architecture reviews, proposals, PDFs, duplicate " 2" files, `.bak` files, packaged `.tgz` builds and other repository clutter

## [2.0.0] - 2025-01-XX

### Added
- Template system: Insert pre-built document structures with `/template` command
- Code reference blocks: Link to and embed code from your workspace
- Enhanced image support: Paste images from URLs or local files
- Interactive block features: Show/hide source for mermaid and charts, zoom/pan for diagrams
- Validation improvements: All validation errors now include line numbers for easier debugging

### Fixed
- Chart show/hide source button now works immediately without requiring other interactions
- Template picker respects VS Code theme (dark/light mode)
- Improved modal sizing and typography for better UX

### Changed
- License updated to Apache 2.0
- Improved documentation and help files

## [1.9.11] - 2024-12-XX

### Added
- Initial release with block editor
- Support for 26+ block types
- Mermaid diagrams and charts
- Export to Markdown, DOCX, and PDF

