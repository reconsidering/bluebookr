# Bluebookr

A Node.js web app for drafting legal citations from structured source details. Supports cases, statutes, journal articles, books, and websites, with formatted previews, plain-text copying, validation, and review notes. No API keys or external services are needed. Source details are processed in memory and are not saved. URL import contacts the supplied website to read its public metadata.

## Develop

Requires Node.js 22 or newer.

```sh
npm ci
npm test
npm run dev
```

The server listens on port 3000 on loopback by default. `PORT` and `HOST` override these settings. Use `npm start` without file watching.

POST JSON source details to `/api/format`; the `type` is `case`, `statute`, `article`, `book`, or `web`. See `formatter.js` for fields and tests for examples. Responses include plain text, styled text segments, and review warnings. Invalid requests return HTTP 400.

## Scope

This initial version applies common law-review full-citation templates. It can import HTML metadata from public URLs and recognize common pasted full citations. It does not parse uploaded documents, verify sources, automatically abbreviate titles, or generate short forms, id., signals, or jurisdiction-specific variants. Supply published abbreviations yourself. Book and journal typography follows law-review conventions; practitioner documents can differ. Copy produces plain text, so restore typography in your editor. Example journal, book, and website entries are fictional demonstrations.

Verify drafts against the applicable Bluebook edition. This project is not affiliated with or endorsed by its publishers.

## Deploy on Render

Create a Web Service connected to this GitHub repository. Select branch `main`, runtime Node, build command `npm install --ignore-scripts && npm test`, start command `npm start`, and the Free instance type. Leave the root directory empty. The server automatically binds to all interfaces when Render sets `RENDER`; you can also set `HOST=0.0.0.0` explicitly. Render supplies `PORT`. No database or API keys are required. A `render.yaml` blueprint is also included.


## Fast source entry

Paste a public URL or a full citation into the source input. Website imports read title, author, publication date, and site metadata. Journal imports recognize scholarly citation meta tags. Book imports recognize schema.org Book JSON-LD or ISBN citation metadata. Cornell US Code links identify title and section. Case URLs can supply a complete citation through citation_legal_case or dc.identifier metadata; arbitrary court pages are not yet parsed. Pasted full citations support common case, federal statute/regulation, journal article, and book patterns. Review detected type and all fields. The app formats immediately when required fields are available and otherwise lists missing details.

Import is best effort: PDFs, paywalls, JavaScript-only pages, and unsupported metadata may require manual entry. Private network URLs and non-HTTP protocols are rejected. Each redirect is revalidated, DNS addresses are pinned to the request, and imports have size, time, and concurrent-request limits. Outbound website access is needed on the deployment host. No AI service is used. The managed development environment's egress proxy restricts live URL retrieval; extraction fixtures and local API checks do not establish production website reachability.

## Private Microsoft Word add-in

See [WORD-SETUP.md](WORD-SETUP.md) for Windows and browser sideloading instructions and current checking coverage. The installation manifest is served at `/word/manifest.xml`; the sidebar is `/word/taskpane.html`. Selected text and whole-document review run locally, with individual Apply/Edit/Skip actions. Word-host validation is still required in your account.
