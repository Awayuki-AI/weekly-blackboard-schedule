# 今週の予定（黒板用）自動生成ツール

学校の年間予定CSVから、子ども向けの予定だけを抜き出し、月曜に渡す印刷用HTMLを自動更新します。

AI-Driven School 2ヶ月目課題「面倒な報告を自動化するツール」用。

## 4つのパーツ

| パーツ | このツールでの中身 |
|--------|-------------------|
| トリガー | 毎週日曜 20:00（GitHub Actions）／手動実行も可 |
| ソース元 | 学校の年間予定をダウンロードしたCSV（`data/school-annual.csv`） |
| 処理 | 翌月曜〜日曜を抽出。教員・保護者向けなどはキーワードで除外 → HTML生成 |
| 届ける先 | 同じURLの印刷用ページ（GitHub Pages） |

## 公開URL

https://awayuki-ai.github.io/weekly-blackboard-schedule/

- 毎週日曜 20:00（JST）に自動更新
- リポジトリ: https://github.com/Awayuki-AI/weekly-blackboard-schedule

## 学校CSVの置き方（メインの使い方）

1. 校務の年間予定スプレッドシートを開く  
2. **ファイル → ダウンロード → カンマ区切り形式（.csv）**  
3. ダウンロードしたファイルを次の名前で保存する  

`weekly-blackboard-schedule/data/school-annual.csv`

4. 生成する

```bash
cd weekly-blackboard-schedule
npm run generate
```

5. GitHubへ反映する（自動更新でも同じCSVを使う）

```bash
git add data/school-annual.csv
git commit -m "Update school annual schedule CSV"
git push
```

学校側の予定が変わったら、同じ手順でCSVを差し替えて push してください（自動追従はしません）。

### 子ども向けの絞り込み

学校CSVに「子ども向け」列がなくても動きます。

- 行事名・備考に「職員会議」「校内研究会」などが含まれる → 除外  
- 対象が「教員」「保護者」など → 除外  
- それ以外（全校・○年の行事など）→ 黒板用に残す  

キーワードは `config.json` の `excludeKeywords` / `excludeAudienceKeywords` で調整できます。

## いちばん短い確認（サンプル）

```bash
npm run generate:sample
```

`data/school-annual.csv` がまだ無いときは、同梱の `data/school-annual.sample.csv` を使います。

## 週の決まり方

- **日曜に実行** → 翌日（月曜）からの1週間  
- **月〜土に実行** → その週の月曜からの1週間  
- 特定週を指定: `node src/generate.js --source=school --week-start=2026-09-07`

## 図解

発表用の4パーツ図解: `diagram/index.html`
