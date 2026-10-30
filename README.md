# Bluebookr

A dependency-free Node.js web app for drafting legal citations from structured source details. Supports cases, statutes, journal articles, books, and websites, with formatted previews, plain-text copying, validation, and review notes. No API keys or external services are needed. Source details are processed in memory and are not saved.

## Develop

Requires Node.js 22 or newer.

```sh
npm test
npm run dev
```

The server listens on port 3000 on loopback by default. `PORT` and `HOST` override these settings. Use `npm start` without file watching.

POST JSON source details to `/api/format`; the `type` is `case`, `statute`, `article`, `book`, or `web`. See `formatter.js` for fields and tests for examples. Responses include plain text, styled text segments, and review warnings. Invalid requests return HTTP 400.

## Scope

This initial version applies common law-review full-citation templates. It does not fetch URLs, parse uploaded documents, verify sources, automatically abbreviate titles, or generate short forms, id., signals, or jurisdiction-specific variants. Supply published abbreviations yourself. Book and journal typography follows law-review conventions; practitioner documents can differ. Copy produces plain text, so restore typography in your editor. Example journal, book, and website entries are fictional demonstrations.

Verify drafts against the applicable Bluebook edition. This project is not affiliated with or endorsed by its publishers.

## Deploy on Render

Create a Web Service connected to this GitHub repository. Select branch `main`, runtime Node, build command `npm install --ignore-scripts && npm test`, start command `npm start`, and the Free instance type. Leave the root directory empty. The server automatically binds to all interfaces when Render sets `RENDER`; you can also set `HOST=0.0.0.0` explicitly. Render supplies `PORT`. No database or API keys are required. A `render.yaml` blueprint is also included.
