# Use Bluebookr privately in Word

The add-in is hosted at https://bluebookr.onrender.com/word/taskpane.html. Download https://bluebookr.onrender.com/word/manifest.xml and save it as `manifest.xml`. No marketplace publication is necessary. Only install after Render deploys this revision.

## Word in a browser

Open a document in Word with your personal Microsoft account. Look under Home or Insert → Add-ins → More Add-ins / My Add-ins for **Upload My Add-in**, then choose the manifest. Microsoft's menu names and custom-upload availability vary by account and Word version. If upload is absent, that account/client may not support this sideloading route; it is not a Bluebookr login problem.

## Word on Windows

For desktop sideloading, use Microsoft's trusted network-share catalog method. Put `manifest.xml` in a folder, share the folder with your own Windows account (avoid granting Everyone access), and note the UNC path, such as `\\YOUR-PC\Bluebookr`. In Word open File → Options → Trust Center → Trust Center Settings → Trusted Add-in Catalogs. Add that UNC path, select **Show in Menu**, and restart Word. Open Insert → My Add-ins → Shared Folder and select Bluebookr. These steps may require Windows sharing permissions. If your Word edition lacks these settings, use Word in a browser if it offers custom upload. Desktop Word needs modern Office add-in support; this is not a VBA/COM plug-in.

Microsoft's current platform guidance: https://learn.microsoft.com/office/dev/add-ins/testing/sideload-office-add-ins-for-testing and https://learn.microsoft.com/office/dev/add-ins/testing/create-a-network-shared-folder-catalog-for-task-pane-and-content-add-ins . Installation has not been verified in the owner's Office account.

## Use and limits

Choose Selected text or Whole document, then Check citations. Review each item and Apply, edit its suggested citation, or Skip. Edits must still match a supported citation pattern. Whole-document checking reads main-body paragraphs plus footnotes/endnotes on WordApi 1.5 clients. Older clients explicitly report that notes were not scanned. Headers, comments, and text boxes are excluded. At most 200 review items are displayed. Standalone supported full citations receive formatting suggestions; candidate inline/short-form citations receive manual-review notices. This is not a complete Bluebook audit and does not verify source accuracy or typography already present in the document.

Checking and formatting run in the sidebar locally. URL lookup sends only the entered URL to Bluebookr. Review imported fields, preview, place the cursor at an empty insertion point, and insert. Document changes happen only after clicking Apply or Insert; Word Undo reverses them. Re-scan after document edits: changed ranges are rejected rather than overwritten. No automatic full-document replacement is performed.

## Developer validation still needed in Word

Automated tests cover recognition and safe citation HTML. Verify in both Windows and browser Word: selection review; body scan; footnote/endnote scan; Apply/Skip/edit; range-change rejection; insertion with italics/small caps; Undo. Office.js host integration cannot be proven by Node tests or HTTP checks. Free Render instances can take time to wake up.

## Automatic replacement

Choose the scope, then **Fix automatically**. This authorizes immediate replacement within that scope; no per-item confirmation is required. Supported standalone full citations receive formatted typography. Bare HTTP/HTTPS URLs and labeled hyperlinks are imported and replaced with full-citation drafts when the required metadata exists. Surrounding text remains in place. Link labels (e.g., “this article”) are replaced with citation text. Website addresses are sent to Bluebookr, not the document text. Missing or failed metadata, unsupported patterns, and text changed during lookup are reported instead of replaced. Website dates/authors may remain absent where optional under the current formatter. Up to 200 replacement candidates are processed per run. Repeat runs do not establish compliance with all Bluebook rules; inline legal citation parsing and cross-reference resolution remain limited. Word may group Undo actions differently by client; keep a saved copy for long documents. This feature has mock-host tests but still needs real Word testing for selection boundaries, hyperlinks, notes, formatting, and Undo.

**Individual URL/link corrections:** Review suggestions now prepares the same citation, bare-URL, and hyperlink candidates as automatic mode without changing document text. Each resolved item displays its original text, proposed citation, and **Apply / Replace** and **Skip** buttons. Applying checks that both the text and hyperlink target still match the scan. Unresolved lookups appear as manual-review items. The same installation manifest works; reopen the sidebar after deployment.

## Markup and navigation

Each correction card includes a text comparison: deletions are struck through and additions are underlined. Editing the suggested citation updates that comparison immediately. The formatted final citation appears separately; the comparison does not inspect original Word character formatting and does not enable Word Track Changes. **Go to citation** selects the tracked citation range in Word, allowing the host to bring it into view. Changed ranges require a re-scan; navigation is disabled after applying a correction until the next scan. The browser preview simulates navigation because no Word document is attached. Actual scrolling behavior depends on the Word host and still needs verification in Windows and browser Word.

## Supra short forms

Run **Review suggestions** on the whole document (or a selection containing repeated full citations). Identical supported book or journal sources are grouped by author, title, year, and edition/publication details while preserving differing pinpoint pages. In the repeated-source card, enter the actual note number containing the first full citation and the desired short author name, then choose **Prepare supra replacements**. Review the markup and apply each later occurrence. The first matched full citation is retained. Ensure it really precedes the replacements in footnote order: scanning traverses body, then footnotes, then endnotes, which is not a global reading order.

This initial feature does not generate supra for cases, statutes, imported website citations, inline citations, or unmatched variants. The supplied note number is confirmed manually rather than inferred from collection position (which may differ from displayed numbering). Pinpoint pages refer to the source's page, not a document page. References are literal text, not Word cross-reference fields, and do not automatically update on renumbering. Comprehensive source disambiguation, note-number extraction, live cross-reference fields, and page-based cross-references remain future work. Real Word host validation remains necessary.

## Citation preferences

Choose **Academic / law review** or **Legal brief**, and **Italics** or **Underline** at the top of the sidebar (also available on the website). Preferences are saved in that browser's local storage when available; they are not stored in the Word document or synced across devices. Changing them clears old suggestions so you can scan again. Brief mode uses regular type for authors, journal names, and site names, and emphasizes book titles instead of using small caps. The emphasis choice affects case names, article/website titles, brief book titles, and supra. Academic book small caps are retained regardless of the emphasis choice. These are supported-source typography conventions, not a complete implementation of the Bluepages or court-local rules. Plain-text copying cannot retain emphasis. Word rendering still needs host verification.

## Document-link imports

PDF, DOCX, and plain-text links now use the same import path as webpage links. This includes bare document URLs and hyperlinks discovered by Review suggestions or Fix automatically. Files are downloaded and parsed on the Bluebookr server. Extracted metadata can identify a title and author, while publisher/site, source type, and publication details often require manual confirmation in Cite a URL. Automatic mode reports incomplete records without replacing them. PDF/DOCX imported records currently default to the editable website template, not an inferred case/book/report type. Up to 50 MB per download; English first-page OCR and legacy Word `.doc` extraction are supported; local file uploads are not provided. A title inferred from document text is flagged as provisional. No reinstall is necessary.


### Expanded document extraction

Scanned PDFs now receive English OCR of the first page when no usable title metadata or initial text is available. OCR uses bundled language data and bounded image resolution; provisional OCR titles must be checked. Older OLE-based Word `.doc` files are extracted directly without requiring Microsoft Word or LibreOffice. Damaged or password-protected files can still fail.

The download cap defaults to **50 MiB**, adjustable using `MAX_DOWNLOAD_MB` (integer 1–200). The free Render instance may not have enough memory for the largest setting: the cap is not a guarantee every file at that size can be parsed. Up to three imports run concurrently, with one document parser/OCR worker at a time, a 60-second download budget per active import, and a 90-second parsing budget per active worker. No unlimited download mode is provided. DOCX expanded-content limits remain separate. OCR is intended to recover initial citation metadata, not transcribe the entire document. Real Render/Word behavior still requires deployment validation.

## Wayback recovery and permalinks

A source returning HTTP 404 can be recovered from an existing successful Wayback snapshot if available. Captured versions are labeled with their archive timestamp and the original URL is retained in response metadata. Other access denials are not routed to Wayback automatically. Exact snapshot URLs are validated against the requested source.

Use **Use permalink** beside the source URL to prefer a DOI (direct DOI links or verified ResearchGate/Crossref matches) or otherwise an existing Wayback snapshot. This changes the URL input; import it to prepare a citation. In Word, **Replace selected URL / hyperlink with permalink** changes a selected bare URL or a single hyperlink target while retaining the label. It checks for document changes before replacement and supports Word Undo. If no verified link is available, the original remains unchanged. These controls do not create new snapshots, create Perma.cc records, or guarantee perpetual availability. Links are sent to archive.org and, for scholarly matching, api.crossref.org. Service availability, archival coverage, and live Word-host behavior remain external dependencies.


### Concurrent imports and minimal extraction

Word review/automatic scans fetch up to three unique source URLs concurrently and reuse lookup results within that scan. Word edits remain serial and are checked against their original text before each replacement. The server accepts up to three active imports with a bounded pending queue. A separate single-worker queue serializes document parsing and OCR, leaving other imports free to handle webpages. Download buffers may still be held while awaiting the document worker; file size and queue limits remain necessary.

PDF parsing uses existing title/author metadata first without reading pages when the title is available. Otherwise it stops at the first readable page among the first three. OCR of the first page runs only after these initial pages produce no usable text. DOCX imports read core metadata first, skipping body decompression when a title exists; otherwise only the initial 20 paragraphs are used after bounded XML decompression. Legacy `.doc` extraction still requires the library to read the binary body before taking its initial text. These improvements do not eliminate downloads of full file bytes or the hosting provider's cold-start delay. No measured production speedup is claimed.
