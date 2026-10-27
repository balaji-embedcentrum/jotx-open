# Security policy

## Reporting a vulnerability

Please report security problems privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability** ([direct link](https://github.com/balaji-embedcentrum/jotx-open/security/advisories/new)). Do not open a public issue.

Include the jotx version, where it runs (VS Code extension, `<jotx-doc>` on a web page, or the CLI), and the smallest `.jot` file or steps that show the problem. You can expect a first reply within a week. We will agree a disclosure date with you once a fix is ready, and credit you in the release notes unless you prefer otherwise.

## Supported versions

Fixes go into the latest 3.x release.

## What we treat as a vulnerability

A `.jot` file is meant to be data that is safe to open, whoever wrote it. These are in scope:

- A `.jot` file that runs script, loads a frame, or reaches a non-web link when opened in the editor or rendered by `<jotx-doc>`.
- A `.jot` file that makes the VS Code extension read or write files, or run commands, without the user acting.
- Anything that leaks a reader's data to a third party when a document is rendered.

Links that a reader clicks on purpose, and images loaded from addresses written in the file, work as they do in Markdown and are not vulnerabilities on their own.
