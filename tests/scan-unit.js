// Fast checks of individual scan mechanics on small hand-made page texts. These guard the
// specific behaviours; scan-regression.js is what proves recall on a real PDF.
//   node scan-unit.js
const assert = require("assert");
const { loadScan } = require("./scan-lib");
const scan = loadScan();

const HDR = "PRODUCT CATEGORY RULES (PCR) TO PCR 2019:14 DATE 2025 - 11 - 27 © EPD INTERNATIONAL AB 2025 PAGE ";
const doc = bodies => bodies.map((b, i) => ({ n: i + 1, text: `${HDR}${i + 1} / ${bodies.length} ${b}` }));
const find = (res, s) => res.find(r => r.quote.includes(s));
let n = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { console.error("FAIL " + name + "\n  " + e.message); process.exitCode = 1; } };

t("running header is skipped: not a clause, not in quotes", () => {
  const r = scan(doc(["The EPD shall state the declared unit of the product.", "Results shall be declared per module for the product.", "Nothing to see here at all today."]));
  assert.strictEqual(r.length, 2);
  r.forEach(x => { assert.strictEqual(x.clause, null); assert(!x.quote.includes("PAGE")); });
});

t("module codes and dates are not read as clause numbers", () => {
  const r = scan(doc(["4.7.1 DATA QUALITY FOR MODULES A1 AND A3 For these modules specific data shall be used everywhere.", "", ""]));
  assert.strictEqual(r[0].clause, "4.7.1");
});

t("clause carries over a page break", () => {
  const r = scan(doc(["6.4.5 CONTENT DECLARATION See PCR 2019:14.", "Moreover, the EPD shall include a declaration of the composition.", ""]));
  assert.strictEqual(find(r, "declaration of the composition").clause, "6.4.5");
});

t("sentence-case deep subheading, but not a cross-reference", () => {
  const r = scan(doc(["4.3.1 PRODUCT STAGE See PCR. 4.3.1.1 Information requirements for suppliers The supplier shall provide the data in full. As described in Section 4.3.3 The supplier shall also keep records of it.", "", ""]));
  assert.strictEqual(find(r, "provide the data").clause, "4.3.1.1");
  assert.strictEqual(find(r, "keep records").clause, "4.3.1.1");
});

t("words split by pdf.js still match", () => {
  const r = scan(doc(["Furthermore , the EPD sh ould also state the reference flow of the system.", "If so, the manufacturer shal l follow the rules of this PCR exactly.", ""]));
  assert.strictEqual(find(r, "reference flow").obligation, "recommended");
  assert.strictEqual(find(r, "follow the rules").obligation, "conditional");
});

t("bulleted list: items inherit the lead-in's obligation", () => {
  const r = scan(doc(["The EPD shall include the composition grouped as follows: ▪ Ferrous metals ▪ Plastics and rubbers ▪ Other materials. The values are given in kg.", "", ""]));
  ["Ferrous metals", "Plastics and rubbers"].forEach(s => assert.strictEqual(find(r, s).obligation, "mandatory", s));
  assert(!find(r, "values are given"), "prose after the list must not inherit");
});

t("long passage is clipped, not dropped", () => {
  const long = "Regarding lifts with express zones the travel distance " + "x ".repeat(300) + "shall be derived from the amendment " + "y ".repeat(300) + ".";
  const r = scan(doc([long, "", ""]));
  assert.strictEqual(r.length, 1);
  assert(r[0].quote.length <= 400 && r[0].quote.includes("shall be derived"));
});

t("a keyword quoted as a term doesn't count", () => {
  const r = scan(doc(["The term “shall” is used to indicate what is obligatory in this text.", "", ""]));
  assert.strictEqual(r.length, 0);
});

t("'can' is an option only when the document defines it", () => {
  const plain = scan(doc(["Results of different usage categories can be declared in the same EPD.", "", ""]));
  assert.strictEqual(plain.length, 0);
  const defined = scan(doc(["The terms “may” or “can” are used to indicate an option that is permissible.", "Results of different usage categories can be declared in the same EPD.", ""]));
  assert.strictEqual(find(defined, "usage categories").obligation, "optional");
});

t("prohibitions and conditionals", () => {
  const r = scan(doc(["In no case shall the contribution of generic data exceed 10% of the total. In case of modernization, the EPD shall describe the replaced parts.", "", ""]));
  assert.strictEqual(find(r, "In no case").obligation, "prohibited");
  assert.strictEqual(find(r, "modernization").obligation, "conditional");
});

t("programme admin is tagged; EPD rules in admin sections are not", () => {
  const r = scan(doc(["2.1 ADMINISTRATIVE INFORMATION Name: Lifts. The validity may change at short notice. When the PCR is about to expire, the PCR Moderator shall initiate a review. When there is an update, the new version should be used to develop EPDs.", "", ""]));
  assert.strictEqual(find(r, "validity may change").scope, "admin");
  assert.strictEqual(find(r, "PCR Moderator").scope, "admin");
  assert.strictEqual(find(r, "develop EPDs").scope, "epd");
});

t("every quote is a literal substring of its page", () => {
  const pages = doc(["4.2 FUNCTIONAL UNIT EPDs shall use a functional unit. ▪ Item one ▪ Item two shall apply.", "Data shall be primary where possible; generic data may be used otherwise.", ""]);
  scan(pages).forEach(r => assert(pages[r.page - 1].text.includes(r.quote), r.quote));
});

console.log(`${n} scan checks passed` + (process.exitCode ? " (some failed, see above)" : ""));
