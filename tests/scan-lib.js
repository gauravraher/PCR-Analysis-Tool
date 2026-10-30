// Shared helpers: load the scan code straight out of ../index.html (so the tests always run
// the shipped code) and read a PDF's text the same way readPdf() does in the browser.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// SCAN_HTML points the tests at another copy of the page (e.g. an older version, to check
// that the regression test really catches a regression).
function loadScan(){
  const html = fs.readFileSync(process.env.SCAN_HTML || path.join(__dirname, "..", "index.html"), "utf8");
  const a = html.indexOf("/* ============================ local rule-based extraction");
  const b = html.indexOf("function chunkPages");
  if (a < 0 || b < a) throw new Error("Could not find the local scan section in index.html");
  return new Function(html.slice(a, b) + "\nreturn ruleBasedExtract;")();
}

// Same text as readPdf() in index.html: items joined with spaces, whitespace collapsed.
async function readPdfPages(file){
  // pdf.js warns that it can't polyfill canvas APIs in Node; those are only for rendering.
  const { log, warn } = console; console.log = console.warn = () => {};
  let pdfjs; try { pdfjs = require("pdfjs-dist/legacy/build/pdf.js"); } finally { Object.assign(console, { log, warn }); }
  const data = new Uint8Array(fs.readFileSync(file));
  const pdf = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++){
    const tc = await (await pdf.getPage(i)).getTextContent();
    pages.push({ n: i, text: tc.items.map(it => it.str).join(" ").replace(/\s+/g, " ").trim() });
  }
  return pages;
}

const sha256 = buf => crypto.createHash("sha256").update(buf).digest("hex");
const norm = s => s.replace(/\s+/g, " ").trim();

module.exports = { loadScan, readPdfPages, sha256, norm };
