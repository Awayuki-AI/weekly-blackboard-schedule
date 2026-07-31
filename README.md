# 今週の予定（黒板用）自動生成ツール

学校の年間予定CSVから、子ども向けの予定だけを抜き出し、月曜に渡す印刷用HTMLを自動更新します。

AI-Driven School 2ヶ月目課題「面倒な報告を自動化するツール」用。

## 4つのパーツ

| パーツ | このツールでの中身 |
|--------|-------------------|
| トリガー | 毎週日曜 20:00（GitHub Actions）／手動実行も可 |
| ソース元 | 学校の年間予定Excel（またはそこから書き出したJSON） |
| 処理 | 全月の「行事予定」列から翌月曜〜日曜を抽出 → HTML生成 |
| 届ける先 | 同じURLの印刷用ページ（GitHub Pages） |

## 公開URL

https://awayuki-ai.github.io/weekly-blackboard-schedule/

- 毎週日曜 20:00（JST）に自動更新
- リポジトリ: https://github.com/Awayuki-AI/weekly-blackboard-schedule

## 学校Excelの置き方（おすすめ）

CSVは月ごとですが、**Excelなら年間まとめて**ダウンロードできます。

1. 学校の年間予定を Excel（.xlsx）でダウンロード  
2. `data/school-annual.xlsx` として保存  
3. 公開用データに変換（日直名などを除く）

```bash
npm install
npm run import:xlsx
```

4. 今週分を生成

```bash
npm run generate
```

5. GitHubへ反映（**xlsxは上げない**。jsonだけ上げる）

```bash
git add data/school-events.json public/index.html
git commit -m "Update school schedule from annual Excel"
git push
```

優先順位: `school-annual.xlsx` → `school-events.json` → CSV

`school-annual.xlsx` は日直名などが入るため `.gitignore` 済みです。自動更新（GitHub Actions）は `school-events.json` を読みます。

### CSVでも可（月ごと）

月ごとのCSVしかない場合は、従来どおり `data/school-annual.csv` や「行事」付きファイル名でも動きます。

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
