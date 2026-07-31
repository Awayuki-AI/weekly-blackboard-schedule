import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function toAsciiDigits(s) {
  return String(s).replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30),
  );
}

function cleanCell(s) {
  return String(s || "")
    .replace(/\r/g, "")
    .replace(/\n+/g, "／")
    .replace(/[ \t　]+/g, " ")
    .replace(/／+/g, "／")
    .trim();
}

function detectYearMonthFromRows(rows) {
  for (const row of rows.slice(0, 8)) {
    const joined = row.map((c) => String(c ?? "")).join(" ");
    let m = joined.match(/令和\s*([0-9０-９]+)年度\s*([0-9０-９]+)月/);
    if (m) {
      return {
        year: 2018 + Number(toAsciiDigits(m[1])),
        month: Number(toAsciiDigits(m[2])),
      };
    }
    m = joined.match(/(20\d{2})\s*年\s*([0-9０-９]+)月/);
    if (m) {
      return { year: Number(m[1]), month: Number(toAsciiDigits(m[2])) };
    }
  }
  return null;
}

function detectYearMonthFromSheetName(name) {
  const m = toAsciiDigits(name).match(/(\d{1,2})\s*月/);
  if (!m) return null;
  return Number(m[1]);
}

function isGyoujiSheet(name) {
  // 「４月行事」「10月行事」など。下校時刻・年間予定は除外
  return /月行事/.test(name) && !/下校/.test(name);
}

function ymdValid(ymd) {
  const [yy, mm, dd] = ymd.split("-").map(Number);
  const check = new Date(Date.UTC(yy, mm - 1, dd, 3, 0, 0));
  return (
    check.getUTCFullYear() === yy &&
    check.getUTCMonth() + 1 === mm &&
    check.getUTCDate() === dd
  );
}

export function parseGyoujiSheetRows(rows, fallbackMonth, fallbackYear) {
  let ym = detectYearMonthFromRows(rows);
  if (!ym && fallbackMonth) {
    ym = {
      year: fallbackYear || new Date().getFullYear(),
      month: fallbackMonth,
    };
  }
  if (!ym) return [];

  let headerIdx = -1;
  let headers = [];
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cols = rows[i].map((c) => String(c ?? "").trim());
    if (cols.includes("日") && cols.includes("行事予定")) {
      headerIdx = i;
      headers = cols;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const dayIdx = headers.indexOf("日");
  const eventIdx = headers.indexOf("行事予定");
  const out = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cols = rows[i].map((c) => String(c ?? ""));
    const dayRaw = toAsciiDigits((cols[dayIdx] || "").trim());
    if (!/^\d{1,2}$/.test(dayRaw)) continue;
    const day = Number(dayRaw);
    if (day < 1 || day > 31) continue;

    const title = cleanCell(cols[eventIdx] || "");
    if (!title) continue;

    const ymd = `${ym.year}-${String(ym.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!ymdValid(ymd)) continue;

    out.push({
      日付: ymd,
      行事名: title,
      対象: "",
      メモ: "",
      子ども向け: "○",
    });
  }
  return out;
}

export function loadEventsFromXlsx(xlsxPath) {
  const wb = XLSX.readFile(xlsxPath);
  const all = [];
  let yearHint = null;

  for (const name of wb.SheetNames) {
    if (!isGyoujiSheet(name)) continue;
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });
    const ym = detectYearMonthFromRows(rows);
    if (ym?.year) yearHint = ym.year;
    const month = ym?.month || detectYearMonthFromSheetName(name);
    const events = parseGyoujiSheetRows(rows, month, yearHint || ym?.year);
    all.push(...events);
  }

  all.sort((a, b) => (a.日付 < b.日付 ? -1 : a.日付 > b.日付 ? 1 : 0));
  return all;
}

export function writeSanitizedEventsJson(events, outPath) {
  const slim = events.map((e) => ({
    date: e.日付,
    title: e.行事名,
  }));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(slim, null, 2)}\n`, "utf8");
  return slim.length;
}

// CLI: node src/import-xlsx.js [path]
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input =
    process.argv[2] ||
    path.join(root, "data", "school-annual.xlsx");
  if (!fs.existsSync(input)) {
    console.error(`Excelが見つかりません: ${input}`);
    process.exit(1);
  }
  const events = loadEventsFromXlsx(input);
  const out = path.join(root, "data", "school-events.json");
  const n = writeSanitizedEventsJson(events, out);
  console.log(`sheets events: ${n}`);
  console.log(`wrote: ${out}`);
  console.log(`xlsx (staff names含む) は git に上げず、json だけ push してください`);
}
