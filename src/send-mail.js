/**
 * Resend で今週分の予定PDFをメール添付する。
 *
 * 必要な環境変数:
 *   RESEND_API_KEY
 *   MAIL_TO
 *   MAIL_FROM     任意。未設定時は onboarding@resend.dev
 *   WEEK_LABEL    任意。件名用
 *   PDF_PATH      任意。未設定時は public/weekly-schedule.pdf
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function required(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    return null;
  }
  return String(v).trim();
}

async function main() {
  const apiKey = required("RESEND_API_KEY");
  const to = required("MAIL_TO");
  const from = required("MAIL_FROM") || "黒板予定 <onboarding@resend.dev>";
  const weekLabel = required("WEEK_LABEL") || "";
  const pdfPath =
    required("PDF_PATH") || path.join(root, "public", "weekly-schedule.pdf");

  if (!apiKey || !to) {
    console.log(
      "スキップ: RESEND_API_KEY または MAIL_TO が未設定です（GitHub Secrets を設定してください）。",
    );
    return;
  }

  if (!fs.existsSync(pdfPath)) {
    console.error(`PDFがありません: ${pdfPath}\n先に node src/html-to-pdf.js を実行してください。`);
    process.exit(1);
  }

  const pdfBase64 = fs.readFileSync(pdfPath).toString("base64");
  const subject = weekLabel
    ? `【黒板予定】今週分（${weekLabel}）`
    : "【黒板予定】今週分を送ります";

  const text = [
    "今週の黒板用予定表です。",
    "",
    "PDFを添付しました。印刷して、係の児童に渡してください。",
    "",
    "— weekly-blackboard-schedule",
  ].join("\n");

  const html = `
    <p>今週の黒板用予定表です。</p>
    <p>PDFを添付しました。印刷して、係の児童に渡してください。</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
      attachments: [
        {
          filename: "weekly-schedule.pdf",
          content: pdfBase64,
        },
      ],
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error("メール送信に失敗しました:", res.status, body);
    process.exit(1);
  }

  console.log("メール送信OK（PDF添付）");
  console.log(body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
