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

校務の年間予定は **月ごとの行事予定表** 形式です（列: 日 / 曜 / 行事予定 / 諸会議等）。

1. 学校のスプレッドシートを開く  
2. **ファイル → ダウンロード → カンマ区切り形式（.csv）**  
3. 次のどちらかで置く  

- いちばん簡単: `data/school-annual.csv` という名前で保存（上書き差し替え）  
- 月ごと: `data/` に「行事」を含む名前のまま置く（`school-annual.csv` が無いとき、それらを全部読みます）

4. 生成する

```bash
cd weekly-blackboard-schedule
npm run generate
```

5. GitHubへ反映する

```bash
git add data/
git commit -m "Update school schedule CSV"
git push
```

### 読み方のポイント

- **行事予定** 列だけを黒板用に使う（**諸会議等** は使いません）  
- タイトルの「令和8年度４月」から年月を判定し、日付列の「日」と組み合わせます  
- 学校側が更新されたら、同じ手順でCSVを差し替えて push してください（自動追従はしません）

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
