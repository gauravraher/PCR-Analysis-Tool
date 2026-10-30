# Scan tests

Tests for the local keyword scan (`ruleBasedExtract` in `../index.html`). They load the scan
code straight out of `index.html`, so they always test what the live page runs.

```
cd tests
npm install          # pdfjs-dist 3.11.174, the same version index.html loads
npm test             # quick checks of individual mechanics, no PDF needed
node scan-regression.js <path/to/document.pdf>
```

## Real-PDF regression

`fixtures/` holds, for each tested document, the requirements a person found by reading every
page. A fixture contains **no document text**: each requirement is a page number, a character
range in that page's text and a SHA-256 of the text in that range. The PDFs are not in this
repo (they come with the publisher's terms of use), so keep your own copies and pass one in;
the matching fixture is picked by the PDF's hash.

| Fixture | Document | Must be found locally | Needs the AI pass |
|---|---|---|---|
| `c-pcr-008-lifts-v2.0.0.json` | PCR 2019:14 c-PCR-008 Lifts (elevators) v2.0.0 | 105 | 12 |

The test fails if a requirement is missing, has the wrong obligation, or is hidden as
programme admin.

To add a document: write a private list of verbatim snippets (see the header of
`make-fixture.js` for the format; keep it out of the repo), then run
`node make-fixture.js <pdf> <snippets.json> fixtures/<name>.json "<document name>"`.

To check that a change really is an improvement, run the same test against an older copy of
the page: `SCAN_HTML=/path/to/old-index.html node scan-regression.js <pdf>`.
