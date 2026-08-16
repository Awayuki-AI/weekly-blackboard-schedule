# 今週の予定（黒板用）

教室の横に、1週間のスケジュールが書き込める黒板があります。毎週月曜日に、1週間の予定をピックアップした紙を係の児童に渡して、黒板に書いてもらっています。これが地味に面倒で、よく忘れてしまいます。

1週間の予定の紙を、できるだけ楽に自動で用意する方法はないか考えて作りました。**私だけの、私が便利になるツール**です。

日曜の夜に今週分が更新され、印刷用のページがメールで届きます。月曜朝は、その紙を子どもに渡すだけです。

## 動いているもの

- 印刷ページ: https://awayuki-ai.github.io/weekly-blackboard-schedule/
- 仕組みの図解: https://weekly-blackboard-diagram.vercel.app
- リポジトリ: https://github.com/Awayuki-AI/weekly-blackboard-schedule

## 4つのパーツ

| パーツ | 中身 |
|--------|------|
| トリガー | 毎週日曜 20:00（GitHub Actions） |
| ソース元 | 学校の年間予定Excel（行事予定の列） |
| 処理 | 翌月曜〜日曜を抜き出し、印刷用HTMLにする |
| 届ける先 | GitHub Pages の同じURL ＋ メール通知 |

校務の掲示板はログイン必須だったので、掲示板直結はしませんでした。閲覧のみの年間Excelをダウンロードし、子ども向けの行だけ使います。原本には日直名などが入るので、公開するのは行事だけです。

## 使い方（教員としての運用）

1. 学校の年間予定を Excel でダウンロードする（変わるたびに差し替え）
2. このリポジトリの `data/school-annual.xlsx` に置く
3. `npm run import:xlsx` で公開用データにする
4. GitHub に push する
5. 日曜 20:00 にページが更新され、メールが届く
6. 月曜に印刷して、係の児童に渡す

## 技術メモ

```bash
npm install
npm run import:xlsx
npm run generate
```

- 自動更新: `.github/workflows/weekly.yml`（日曜 20:00 JST）
- メール: Resend。宛先は GitHub Secrets の `MAIL_TO`
- Excelは git に上げない（`.gitignore`）。Actions は `data/school-events.json` を読む
- 特定の週を見る: `node src/generate.js --source=school --week-start=2026-08-25`

AI-Driven School 2ヶ月目課題「面倒な報告を自動化するツール」から始まり、いまも毎週使っています。
