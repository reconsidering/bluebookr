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

This initial version applies common law-review full-citation templates. It can import HTML metadata from public URLs and recognize common pasted full citations. It does not accept file uploads, verify sources, automatically abbreviate titles, or generate short forms, id., signals, or jurisdiction-specific variants. Supply published abbreviations yourself. Book and journal typography follows law-review conventions; practitioner documents can differ. Copy produces plain text, so restore typography in your editor. Example journal, book, and website entries are fictional demonstrations.

Verify drafts against the applicable Bluebook edition. This project is not affiliated with or endorsed by its publishers.

## Deploy on Render

Create a Web Service connected to this GitHub repository. Select branch `main`, runtime Node, build command `npm install --ignore-scripts && npm test`, start command `npm start`, and the Free instance type. Leave the root directory empty. The server automatically binds to all interfaces when Render sets `RENDER`; you can also set `HOST=0.0.0.0` explicitly. Render supplies `PORT`. No database or API keys are required. A `render.yaml` blueprint is also included.


## Fast source entry

Paste a public URL or a full citation into the source input. Website imports read title, author, publication date, and site metadata. Journal imports recognize scholarly citation meta tags. Book imports recognize schema.org Book JSON-LD or ISBN citation metadata. Cornell US Code links identify title and section. Case URLs can supply a complete citation through citation_legal_case or dc.identifier metadata; arbitrary court pages are not yet parsed. Pasted full citations support common case, federal statute/regulation, journal article, and book patterns. Review detected type and all fields. The app formats immediately when required fields are available and otherwise lists missing details.

Import is best effort: Paywalls, JavaScript-only pages, and unsupported metadata may require manual entry. Private network URLs and non-HTTP protocols are rejected. Each redirect is revalidated, DNS addresses are pinned to the request, and imports have size, time, and concurrent-request limits. Outbound website access is needed on the deployment host. No AI service is used. The managed development environment's egress proxy restricts live URL retrieval; extraction fixtures and local API checks do not establish production website reachability.

## Private Microsoft Word add-in

See [WORD-SETUP.md](WORD-SETUP.md) for Windows and browser sideloading instructions and current checking coverage. The installation manifest is served at `/word/manifest.xml`; the sidebar is `/word/taskpane.html`. Selected text and whole-document review run locally, with individual Apply/Edit/Skip actions. Word-host validation is still required in your account.


## Document links

The same URL input and `/api/import` now accept PDF, DOCX, and plain-text links (50 MB download cap). PDF/DOCX formats are detected by signatures, so extensionless download links work. PDF extraction reads metadata and up to the first three pages of text; DOCX reads core metadata and initial paragraphs. Title fallback from extracted text is explicitly provisional. Publisher/site and publication date are not invented from hostnames, file timestamps, or PDF creation dates. Review those fields and choose the correct source type before formatting. Scanned PDFs receive English first-page OCR when needed; encrypted PDFs need an accessible copy. Legacy OLE Word `.doc` is supported; RTF and standalone image formats still need conversion. No local file-upload interface is provided.

Parsing runs in a disposable worker with a time limit, memory limit, and bounded DOCX expanded content. The shared import API also covers document URLs found during Word scans; missing required citation details are reported instead of automatically replacing them. Document bodies are not treated as bibliographic records: citations quoted inside a file are not assumed to identify the file itself.


### Expanded document extraction

Scanned PDFs now receive English OCR of the first page when no usable title metadata or initial text is available. OCR uses bundled language data and bounded image resolution; provisional OCR titles must be checked. Older OLE-based Word `.doc` files are extracted directly without requiring Microsoft Word or LibreOffice. Damaged or password-protected files can still fail.

The download cap defaults to **50 MiB**, adjustable using `MAX_DOWNLOAD_MB` (integer 1–200). The free Render instance may not have enough memory for the largest setting: the cap is not a guarantee every file at that size can be parsed. Up to three imports run concurrently, with one document parser/OCR worker at a time, a 60-second download budget per active import, and a 90-second parsing budget per active worker. No unlimited download mode is provided. DOCX expanded-content limits remain separate. OCR is intended to recover initial citation metadata, not transcribe the entire document. Real Render/Word behavior still requires deployment validation.

## Restricted-source recovery

Source access failures now report the HTTP status. Known OpenSecrets/BLS pages can return explicitly marked, previously verified title/publisher details when live retrieval is blocked; opaque POLITICO and Morning Consult asset links return publisher identity with title left blank. Such partial results require review and never trigger automatic Word replacement. The content is not represented as successfully retrieved. Missing `.pdf` suffixes on extensionless Morning Consult assets are tried only after HTTP 404. POLITICO download UUIDs copied with a trailing colon are normalized.

For blocked ResearchGate publication links, a Crossref title search may recover journal metadata only when exactly one result matches both the full normalized title and the profile author's surname. The response names Crossref as the metadata source; it does not claim the protected PDF was read. This uses the public api.crossref.org service and needs outbound access to it. General HTML publisher discovery now also reads publisher meta tags and schema.org publisher/organization names. Document publisher identities can be supplied for verified official asset hosts such as assets.morningconsult.com. Access restrictions, missing files, and paywalls are not bypassed.

## Permalinks and dead links

POST `/api/permalink` with `{ "url": "https://..." }` returns an existing verified DOI or Wayback snapshot and identifies its kind. It never saves a new archive or promises perpetual availability. The website and Word sidebar have permalink lookup controls; Word additionally supports replacing the selected bare URL or hyperlink target. Original 404 imports check archive.org's availability API and validate that any returned snapshot belongs to the exact requested URL. Retrieved snapshots retain their capture timestamp and original URL in response metadata. Failed archive lookups leave the normal source error/review fallback in place. Outbound archive.org and web.archive.org access is required. No Perma.cc credentials are configured.


### Concurrent imports and minimal extraction

Word review/automatic scans fetch up to three unique source URLs concurrently and reuse lookup results within that scan. Word edits remain serial and are checked against their original text before each replacement. The server accepts up to three active imports with a bounded pending queue. A separate single-worker queue serializes document parsing and OCR, leaving other imports free to handle webpages. Download buffers may still be held while awaiting the document worker; file size and queue limits remain necessary.

PDF parsing uses existing title/author metadata first without reading pages when the title is available. Otherwise it stops at the first readable page among the first three. OCR of the first page runs only after these initial pages produce no usable text. DOCX imports read core metadata first, skipping body decompression when a title exists; otherwise only the initial 20 paragraphs are used after bounded XML decompression. Legacy `.doc` extraction still requires the library to read the binary body before taking its initial text. These improvements do not eliminate downloads of full file bytes or the hosting provider's cold-start delay. No measured production speedup is claimed.


### Access restrictions and publisher evidence

HTTP 403/429 now attempt retrieval of an existing exact-URL public archive, alongside 404 recovery. The capture is labeled as archived, not a current successful origin fetch. Archives can also be missing or blocked; this does not bypass authentication, paywalls, or anti-bot challenges. If the page opens in your browser, use **Cannot read this source? Paste a copy** in the website or Word sidebar. This accepts up to 40,000 characters of source text/HTML, labels the record as user-provided and review-required, and fills editable citation fields. Pasted content is sent to the Bluebookr server but not executed.

Document publisher discovery now checks explicit XMP publisher metadata, initial text lines identifying “Publisher:” or “Published by”, and supported co-branded poll headings. Generic CDNs do not become publishers. The supplied econTabReport.pdf was downloaded and locally verified to identify YouGov through its “The Economist /YouGov Poll” heading. Unknown publishers remain blank. When title metadata exists but the host publisher is unknown, an initial page is read to look for publisher evidence; otherwise metadata-first short-circuiting remains in place. Other document dates and authors still require validation.

### Journal PDFs and URL evidence

PDF extraction now reads embedded article DOI metadata (including WPS-ARTICLEDOI) or an unambiguous initial-page DOI. Crossref records are used only when DOI and normalized document title agree and the record is a journal article. The citation then uses authors, journal, volume, initial page, and year rather than a publisher address and file-host URL. Missing/mismatched records are flagged for review. Supplement/issue metadata is disclosed for review; journal abbreviation and special issue formatting remain limited. Publisher extraction strips postal-address tails such as “, 350 Main Street”; these are not publication names.

Complete calendar dates in URL paths can fill an otherwise missing website date, with provenance and a review warning. Existing metadata is preserved. Single historical years, event-folder years, file dates, author filename fragments, and ambiguous slugs do not become automatic publication facts. Explicit author path segments and descriptive title slugs are shown only as review suggestions when the corresponding field is missing. Roper Center's exact official host supplies its institutional identity, with the page-title site suffix removed.

Direct requests retain an identifying Bluebookr User-Agent and standard language preferences. Access failures are not addressed through spoofed sessions, CAPTCHA solvers, or rotating proxy identities. A successful request from a user's browser or development host does not establish Render access.

### Reducing avoidable source blocks

Downloads are serialized per hostname and spaced at least 300 ms apart, while different hosts retain bounded concurrency. Successful verified imports are cached in memory for 10 minutes (maximum 100 records); identical in-flight imports share one lookup. Returned retrieval metadata identifies cached results and their original fetch timestamp. Review-required partial results and failures are not retained as successful cache entries. Cache is process-local, public-source metadata only, and is cleared on restart. This reduces request pressure; it does not overcome an IP-wide block or demonstrate a measured change in 403 frequency.

Render confirms default outbound IP ranges are shared across services in a region: https://render.com/docs/outbound-ip-addresses . Dedicated outbound IP sets require a Pro workspace or higher plus an additional fee: https://render.com/docs/dedicated-ips . Dedicated IPs can be supplied to source owners for allowlisting, but do not independently grant access. Moving to a paid web-service instance alone does not establish that outbound IP identity changes. No paid hosting settings were changed.
