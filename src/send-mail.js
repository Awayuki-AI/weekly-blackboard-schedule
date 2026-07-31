/**
 * Resend で公開URLをメール送信する。
 *
 * 必要な環境変数:
 *   RESEND_API_KEY  … Resend の API キー
 *   MAIL_TO         … 宛先（個人Gmail → あとで学校Gmailに差し替え可）
 *   MAIL_FROM       … 任意。未設定時は onboarding@resend.dev
 *   PAGE_URL        … 任意。未設定時は公開URLのデフォルト
 *   WEEK_LABEL      … 任意。件名用（例: 8/25〜8/31）
 */

const DEFAULT_PAGE_URL =
  "https://awayuki-ai.github.io/weekly-blackboard-schedule/";

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
  const pageUrl = required("PAGE_URL") || DEFAULT_PAGE_URL;
  const weekLabel = required("WEEK_LABEL") || "";

  if (!apiKey || !to) {
    console.log(
      "スキップ: RESEND_API_KEY または MAIL_TO が未設定です（GitHub Secrets を設定してください）。",
    );
    return;
  }

  const subject = weekLabel
    ? `【黒板予定】今週分が更新されました（${weekLabel}）`
    : "【黒板予定】今週分が更新されました";

  const text = [
    "今週の黒板用予定表が更新されました。",
    "",
    "印刷用ページ:",
    pageUrl,
    "",
    "月曜朝にこのURLを開いて印刷し、子どもに渡してください。",
    "",
    "— weekly-blackboard-schedule",
  ].join("\n");

  const html = `
    <p>今週の黒板用予定表が更新されました。</p>
    <p><a href="${pageUrl}">${pageUrl}</a></p>
    <p>月曜朝にこのURLを開いて印刷し、子どもに渡してください。</p>
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
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error("メール送信に失敗しました:", res.status, body);
    process.exit(1);
  }

  console.log("メール送信OK:", to);
  console.log(body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
