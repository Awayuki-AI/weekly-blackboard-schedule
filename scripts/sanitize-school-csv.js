import fs from "node:fs";

function parseCsvRecords(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      if (inQuotes && src[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cur);
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((c) => String(c).trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cur += ch;
  }
  row.push(cur);
  if (row.some((c) => String(c).trim() !== "")) rows.push(row);
  return rows;
}

function esc(s) {
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function clean(s) {
  return String(s || "")
    .replace(/\r/g, "")
    .replace(/\n+/g, "／")
    .replace(/[ \t　]+/g, " ")
    .replace(/／+/g, "／")
    .trim();
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/sanitize-school-csv.js <raw.csv>");
  process.exit(1);
}

const text = fs.readFileSync(inputPath, "utf8");
const records = parseCsvRecords(text);
const ym = text.match(/令和[^,\n]*行事予定表/);

let headerIdx = -1;
let headers = [];
for (let i = 0; i < Math.min(records.length, 15); i++) {
  const cols = records[i].map((c) => c.trim());
  if (cols.includes("日") && cols.includes("行事予定")) {
    headerIdx = i;
    headers = cols;
    break;
  }
}
if (headerIdx < 0) {
  console.error("header not found");
  process.exit(1);
}

const dayIdx = headers.indexOf("日");
const youbiIdx = headers.indexOf("曜");
const eventIdx = headers.indexOf("行事予定");

const out = [];
out.push(ym ? `,,${ym[0]},` : ",,行事予定表,");
out.push("日,曜,行事予定");

for (let i = headerIdx + 1; i < records.length; i++) {
  const cols = records[i];
  const day = (cols[dayIdx] || "").trim();
  if (!/^[0-9０-９]{1,2}$/.test(day)) continue;
  const event = clean(cols[eventIdx] || "");
  if (!event) continue;
  const youbi = (cols[youbiIdx] || "").trim();
  out.push([day, youbi, esc(event)].join(","));
}

fs.writeFileSync("data/school-annual.csv", `${out.join("\n")}\n`, "utf8");
console.log(`sanitized: ${out.length - 2} event days -> data/school-annual.csv`);
