import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const config = JSON.parse(
  fs.readFileSync(path.join(root, "config.json"), "utf8"),
);

function parseArgs(argv) {
  const args = {};
  for (const part of argv.slice(2)) {
    const m = part.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) args[m[1]] = m[2] ?? true;
  }
  return args;
}

function jstParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
  };
}

function ymdToUtcNoon(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0)); // JST正午付近
}

function dowFromYmd(ymd) {
  // 0=Sun ... 6=Sat（JSTの暦日）
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone,
    weekday: "short",
  }).format(ymdToUtcNoon(ymd));
  return map[short];
}

/**
 * 日曜20時実行 → 翌日からの週（翌月曜〜）。
 * 月〜土に手動実行 → その週の月曜始まり。
 */
function upcomingMondayYmd(now = new Date(), weekStartOverride) {
  if (weekStartOverride) return weekStartOverride;

  const { ymd } = jstParts(now);
  const dow = dowFromYmd(ymd);
  if (dow === 0) return addDaysYmd(ymd, 1);
  return addDaysYmd(ymd, 1 - dow);
}

function addDaysYmd(ymd, days) {
  const dt = ymdToUtcNoon(ymd);
  dt.setUTCDate(dt.getUTCDate() + days);
  return jstParts(dt).ymd;
}

function weekdayJa(ymd) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: config.timezone,
    weekday: "short",
  }).format(ymdToUtcNoon(ymd));
}

function formatMd(ymd) {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (cols[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function isChildFacing(value) {
  const v = String(value).trim();
  return v === "○" || v === "〇" || v.toLowerCase() === "o" || v === "1" || v.toLowerCase() === "true";
}

function normalizeDate(value) {
  const v = String(value).trim();
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  let m = v.match(/^(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})$/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }

  m = v.match(/^(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }

  // 令和8年8月31日 → 2018+8=2026
  m = v.match(/^令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (m) {
    const year = 2018 + Number(m[1]);
    return `${year}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }

  // R8.8.31 / R8/8/31
  m = v.match(/^R\s*(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{1,2})$/i);
  if (m) {
    const year = 2018 + Number(m[1]);
    return `${year}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }

  // Excel serial date (rough)
  if (/^\d{5}(\.\d+)?$/.test(v)) {
    const serial = Math.floor(Number(v));
    const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    const y = utc.getUTCFullYear();
    const mo = String(utc.getUTCMonth() + 1).padStart(2, "0");
    const d = String(utc.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }

  return v;
}

function pickField(row, aliases) {
  for (const key of aliases) {
    if (row[key] != null && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }
  // partial match on header names
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const found = keys.find((k) => k.includes(alias));
    if (found && String(row[found]).trim() !== "") {
      return String(row[found]).trim();
    }
  }
  return "";
}

function normalizeRow(row) {
  return {
    date: normalizeDate(
      pickField(row, ["日付", "日程", "月日", "実施日", "date", "Date"]),
    ),
    title: pickField(row, ["行事名", "行事", "内容", "事項", "イベント", "title", "Title"]),
    audience: pickField(row, ["対象", "学年", "対象学年", "audience"]),
    child: pickField(row, ["子ども向け", "児童向け", "子供向け"]),
    note: pickField(row, ["メモ", "備考", "备注", "場所", "時程", "note"]),
  };
}

function hasChildColumn(rows) {
  return rows.some((r) => {
    const v = pickField(r, ["子ども向け", "児童向け", "子供向け"]);
    return v !== "";
  });
}

function matchesAny(text, keywords) {
  const t = String(text || "");
  return (keywords || []).some((k) => k && t.includes(k));
}

function isChildFacingEvent(event, opts) {
  // 明示列がある行はそれを優先
  if (event.child) {
    const v = event.child.trim();
    if (v === "×" || v === "x" || v.toLowerCase() === "false" || v === "0") {
      return false;
    }
    return isChildFacing(v);
  }

  const blob = `${event.title} ${event.audience} ${event.note}`;
  if (matchesAny(blob, opts.excludeKeywords)) return false;
  if (matchesAny(event.audience, opts.excludeAudienceKeywords)) return false;
  return Boolean(event.title);
}

function resolveSchoolCsvPath() {
  const primary = path.join(root, config.schoolCsvPath || "data/school-annual.csv");
  if (fs.existsSync(primary)) return { path: primary, label: config.schoolCsvPath };

  const sampleRel = "data/school-annual.sample.csv";
  const sample = path.join(root, sampleRel);
  if (fs.existsSync(sample)) {
    return { path: sample, label: `${sampleRel} (サンプル・本物のCSVを data/school-annual.csv に置いてください)` };
  }

  throw new Error(
    [
      `学校の年間予定CSVが見つかりません: ${config.schoolCsvPath}`,
      "学校のシートから CSV をダウンロードし、 data/school-annual.csv として保存してください。",
    ].join("\n"),
  );
}

async function loadCsv(source) {
  if (source === "local") {
    const p = path.join(root, config.localCsvPath);
    return { text: fs.readFileSync(p, "utf8"), label: config.localCsvPath };
  }

  if (source === "school") {
    const resolved = resolveSchoolCsvPath();
    return {
      text: fs.readFileSync(resolved.path, "utf8"),
      label: resolved.label,
    };
  }

  const url =
    `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}` +
    `/export?format=csv&gid=${config.gid}`;
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  if (!res.ok || text.includes("<!DOCTYPE html>") || text.includes("アカウント")) {
    throw new Error(
      [
        "Googleスプレッドシートを読めませんでした。",
        "共有設定を「リンクを知っている全員」＋「閲覧者」にしてください。",
        "または --source=school で学校CSVから生成できます。",
      ].join("\n"),
    );
  }
  return { text, label: `Google Sheets (${config.spreadsheetId})` };
}

function pickWeekEvents(rows, weekStart) {
  const weekEnd = addDaysYmd(weekStart, 6);
  const useChildColumn = hasChildColumn(rows);
  const filterOpts = {
    excludeKeywords: config.excludeKeywords || [],
    excludeAudienceKeywords: config.excludeAudienceKeywords || [],
  };

  return rows
    .map(normalizeRow)
    .filter((r) => r.date && r.title && /^\d{4}-\d{2}-\d{2}$/.test(r.date))
    .filter((r) => {
      if (useChildColumn) return isChildFacingEvent(r, filterOpts);
      return isChildFacingEvent({ ...r, child: "" }, filterOpts);
    })
    .filter((r) => r.date >= weekStart && r.date <= weekEnd)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderHtml({ weekStart, events, generatedAt, sourceLabel }) {
  const weekEnd = addDaysYmd(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, i) => {
    const ymd = addDaysYmd(weekStart, i);
    return {
      ymd,
      label: `${formatMd(ymd)}（${weekdayJa(ymd)}）`,
      items: events.filter((e) => e.date === ymd),
    };
  });

  const rowsHtml = days
    .map((day) => {
      if (day.items.length === 0) {
        return `<tr>
          <th scope="row">${escapeHtml(day.label)}</th>
          <td class="empty">（なし）</td>
          <td></td>
        </tr>`;
      }
      return day.items
        .map((item, idx) => {
          const dayCell =
            idx === 0
              ? `<th scope="row" rowspan="${day.items.length}">${escapeHtml(day.label)}</th>`
              : "";
          const note = item.note ? escapeHtml(item.note) : "";
          return `<tr>
            ${dayCell}
            <td>
              <span class="event">${escapeHtml(item.title)}</span>
              ${item.audience ? `<span class="audience">${escapeHtml(item.audience)}</span>` : ""}
            </td>
            <td class="note">${note}</td>
          </tr>`;
        })
        .join("\n");
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(config.title)} ${escapeHtml(formatMd(weekStart))}〜</title>
  <style>
    :root {
      --ink: #1c2b33;
      --muted: #5a6d78;
      --line: #c5d4dc;
      --band: #0f5c6e;
      --band-soft: #e6f3f5;
      --paper: #f7fbfc;
      --accent: #c45c26;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      font-family: "Hiragino Maru Gothic ProN", "Yu Gothic UI", "Noto Sans JP", sans-serif;
      background:
        radial-gradient(ellipse 70% 40% at 10% 0%, #d9eef2 0%, transparent 55%),
        linear-gradient(180deg, #eef6f8 0%, var(--paper) 40%, #fff 100%);
      min-height: 100vh;
    }
    .sheet {
      max-width: 820px;
      margin: 0 auto;
      padding: 2rem 1.25rem 3rem;
    }
    header {
      border-bottom: 4px solid var(--band);
      padding-bottom: 1rem;
      margin-bottom: 1.5rem;
    }
    .kicker {
      color: var(--band);
      font-weight: 700;
      letter-spacing: 0.08em;
      font-size: 0.85rem;
      margin: 0 0 0.35rem;
    }
    h1 {
      margin: 0;
      font-size: clamp(1.6rem, 4vw, 2.2rem);
      line-height: 1.25;
      font-weight: 800;
    }
    .range {
      margin: 0.5rem 0 0;
      font-size: 1.25rem;
      font-weight: 700;
    }
    .meta {
      margin: 0.35rem 0 0;
      color: var(--muted);
      font-size: 0.9rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border: 1px solid var(--line);
    }
    th, td {
      border: 1px solid var(--line);
      padding: 0.85rem 0.9rem;
      vertical-align: top;
      text-align: left;
    }
    th[scope="row"] {
      width: 8.5rem;
      background: var(--band-soft);
      font-size: 1.05rem;
      white-space: nowrap;
    }
    td {
      font-size: 1.15rem;
      line-height: 1.45;
    }
    .event { font-weight: 700; }
    .audience {
      display: inline-block;
      margin-left: 0.5rem;
      padding: 0.1rem 0.45rem;
      border: 1px solid var(--band);
      color: var(--band);
      font-size: 0.8rem;
      font-weight: 700;
      vertical-align: middle;
    }
    .note {
      width: 30%;
      color: var(--muted);
      font-size: 0.95rem;
    }
    .empty { color: #9aa8b0; }
    .howto {
      margin-top: 1.25rem;
      padding: 1rem 1.1rem;
      background: #fff;
      border-left: 5px solid var(--accent);
    }
    .howto p { margin: 0; line-height: 1.6; }
    footer {
      margin-top: 1.5rem;
      color: var(--muted);
      font-size: 0.8rem;
    }
    @media print {
      body { background: #fff; }
      .sheet { padding: 0; max-width: none; }
      .howto, footer { display: none; }
      table { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <header>
      <p class="kicker">BLACKBOARD SCHEDULE</p>
      <h1>${escapeHtml(config.title)}</h1>
      <p class="range">${escapeHtml(formatMd(weekStart))}（${escapeHtml(weekdayJa(weekStart))}）〜 ${escapeHtml(formatMd(weekEnd))}（${escapeHtml(weekdayJa(weekEnd))}）</p>
      <p class="meta">子ども向けの予定だけを抜粋しています</p>
    </header>

    <table>
      <thead>
        <tr>
          <th scope="col">日付</th>
          <th scope="col">予定</th>
          <th scope="col">メモ</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <section class="howto">
      <p>月曜にこの表を印刷（または画面表示）して子どもに渡し、黒板へ書いてもらいます。</p>
    </section>

    <footer>
      更新: ${escapeHtml(generatedAt)} ／ ソース: ${escapeHtml(sourceLabel)} ／ 件数: ${events.length}
    </footer>
  </main>
</body>
</html>
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const source =
    args.source ||
    config.defaultSource ||
    "school";
  const weekStart = upcomingMondayYmd(new Date(), args["week-start"]);

  let loaded;
  try {
    loaded = await loadCsv(source);
  } catch (err) {
    if (source !== "school" && source !== "local") {
      console.warn(String(err.message || err));
      console.warn("フォールバック: 学校CSV（またはサンプル）から生成します。");
      loaded = await loadCsv("school");
    } else {
      throw err;
    }
  }

  const rows = parseCsv(loaded.text);
  const events = pickWeekEvents(rows, weekStart);
  const generatedAt = new Intl.DateTimeFormat("ja-JP", {
    timeZone: config.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const html = renderHtml({
    weekStart,
    events,
    generatedAt,
    sourceLabel: loaded.label,
  });
  const outPath = path.join(root, config.outputPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");

  console.log(`週の開始: ${weekStart}`);
  console.log(`件数: ${events.length}`);
  console.log(`出力: ${outPath}`);
  console.log(`ソース: ${loaded.label}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
