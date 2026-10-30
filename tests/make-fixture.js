// Turns a private list of requirement snippets into a text-free fixture.
//
//   node make-fixture.js <pdf> <snippets.json> <out-fixture.json> "<document name>"
//
// snippets.json (keep it out of the repo — it quotes the PDF) is an array of
// {"p": page, "k": kind, "s": "verbatim snippet from that page", "ob": optional obligation}.
// Kinds: modal / phrase / can / list = the local scan must find it; llm = needs the AI pass
// (recorded in the fixture's "needsAi" count only, not tested).
const fs = require("fs");
const { readPdfPages, sha256, norm } = require("./scan-lib");

(async () => {
  const [pdfFile, snipFile, outFile, name] = process.argv.slice(2);
  if (!name){ console.error('usage: node make-fixture.js <pdf> <snippets.json> <out.json> "<document name>"'); process.exit(2); }
  const pages = await readPdfPages(pdfFile);
  const snippets = JSON.parse(fs.readFileSync(snipFile, "utf8"));
  const requirements = [];
  let needsAi = 0;
  snippets.forEach((g, i) => {
    if (g.k === "llm"){ needsAi++; return; }
    const text = norm(pages.find(p => p.n === g.p).text), s = norm(g.s), start = text.indexOf(s);
    if (start < 0) throw new Error(`snippet ${i} not found on page ${g.p}`);
    requirements.push({ id: i + 1, page: g.p, kind: g.k, start, length: s.length, sha256: sha256(s), ...(g.ob ? { obligation: g.ob } : {}) });
  });
  fs.writeFileSync(outFile, JSON.stringify({ document: name, pdfSha256: sha256(fs.readFileSync(pdfFile)),
    pdfjs: "3.11.174", needsAi, requirements }, null, 1) + "\n");
  console.log(`${requirements.length} requirements written, ${needsAi} AI-only items counted`);
})().catch(e => { console.error(e.message); process.exit(1); });
