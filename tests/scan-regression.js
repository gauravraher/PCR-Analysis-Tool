// Real-PDF regression test for the local keyword scan.
//
//   node scan-regression.js <pdf> [fixture.json]
//
// A fixture lists the requirements a human reviewer found in one specific PDF. It stores no
// document text — each requirement is a page, a character range in that page's text, and a
// hash of the text in that range — so fixtures can live in this public repo while the PDFs
// (which carry the publisher's terms of use) stay on your machine. With no fixture argument,
// the fixture whose pdfSha256 matches the PDF is picked from ./fixtures.
const fs = require("fs");
const path = require("path");
const { loadScan, readPdfPages, sha256, norm } = require("./scan-lib");

(async () => {
  const [pdfFile, fixtureArg] = process.argv.slice(2);
  if (!pdfFile){ console.error("usage: node scan-regression.js <pdf> [fixture.json]"); process.exit(2); }
  const pdfHash = sha256(fs.readFileSync(pdfFile));
  const fixtureFile = fixtureArg || fs.readdirSync(path.join(__dirname, "fixtures"))
    .map(f => path.join(__dirname, "fixtures", f))
    .find(f => JSON.parse(fs.readFileSync(f, "utf8")).pdfSha256 === pdfHash);
  if (!fixtureFile){ console.error("No fixture in ./fixtures matches this PDF (sha256 " + pdfHash + ")."); process.exit(2); }
  const fx = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  if (fx.pdfSha256 !== pdfHash) console.warn("Warning: this PDF differs from the one the fixture was made from.");

  const pages = await readPdfPages(pdfFile);
  const found = loadScan()(pages);
  const fails = [], unreadable = [];
  let ok = 0;
  for (const it of fx.requirements){
    const page = pages.find(p => p.n === it.page);
    const want = page && norm(page.text).slice(it.start, it.start + it.length);
    if (!want || sha256(want) !== it.sha256){ unreadable.push(it); continue; }
    const hit = found.find(r => r.page === it.page && norm(r.quote).includes(want));
    const label = `p${it.page} #${it.id} (${it.kind})`;
    if (!hit) fails.push(`${label}: not found`);
    else if (it.obligation && hit.obligation !== it.obligation) fails.push(`${label}: obligation ${hit.obligation}, expected ${it.obligation}`);
    else if (hit.scope === "admin") fails.push(`${label}: wrongly hidden as programme admin`);
    else ok++;
  }
  console.log(`${fx.document}: ${ok}/${fx.requirements.length} requirements found by the local scan (${found.length} candidates in total)`);
  if (unreadable.length) console.log(`${unreadable.length} fixture entries don't match this PDF's text (different pdf.js version or file?)`);
  fails.forEach(f => console.log("  FAIL " + f));
  process.exit(fails.length || unreadable.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
