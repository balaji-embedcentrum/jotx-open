# Releasing jotx

A release ships three things from the same version number: the VS Code extension, the npm packages under `@jotx-labs/`, and the website.

## 1. Set the version

1. Change `JOTX_VERSION` in `version.ts`.
2. Run `npm run sync-versions`. This updates every `package.json`, including `packages/embed`.
3. Update the version shown in `site/jotx.jot` (badge and CDN snippet), `README.md` and `packages/embed/README.md`.
4. Add the release notes to `packages/vscode-extension/CHANGELOG.md`.

## 2. Check

```bash
npm ci
npm run build
npm test
npm run build:site        # then open _site/ with any static server
```

Open a few notes in the packaged extension, in both a light and a dark theme, before publishing.

## 3. Publish

The extension needs a Marketplace publisher token (`vsce login`); npm needs an account with access to the `@jotx-labs` organisation (`npm login`).

```bash
cd packages/vscode-extension && npx vsce package && npx vsce publish
cd ../.. && npm run publish:all          # registry, core, standard-lib, adapters, react-renderer, language, cli, embed
```

`publish:all` swaps the local `file:` links for version ranges, publishes in dependency order, and restores the links afterwards.

Once `@jotx-labs/embed` is on npm, jsDelivr and unpkg serve it automatically at `https://cdn.jsdelivr.net/npm/@jotx-labs/embed@<version>/dist/jotx.min.js`.

## 4. Tag

```bash
git tag v<version> && git push origin v<version>
```

Create a GitHub release from the tag with the changelog entry and attach the `.vsix`.

The website deploys by itself when `main` changes (see `.github/workflows/pages.yml`).
