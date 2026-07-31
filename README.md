# 今週の予定（黒板用）自動生成ツール

年間予定のスプレッドシートから、「子ども向け」の予定だけを抜き出し、月曜に渡す印刷用HTMLを自動更新します。

AI-Driven School 2ヶ月目課題「面倒な報告を自動化するツール」用。

## 4つのパーツ

| パーツ | このツールでの中身 |
|--------|-------------------|
| トリガー | 毎週日曜 20:00（GitHub Actions）／手動実行も可 |
| ソース元 | Googleスプレッドシート（年間予定） |
| 処理 | 翌月曜〜日曜 × 子ども向け＝○ を抽出 → HTML生成 |
| 届ける先 | 同じURLの印刷用ページ（GitHub Pages） |

## 公開URL

https://awayuki-ai.github.io/weekly-blackboard-schedule/

- 毎週日曜 20:00（JST）に自動更新
- リポジトリ: https://github.com/Awayuki-AI/weekly-blackboard-schedule

## いちばん短い使い方（今すぐ見る）

```bash
cd weekly-blackboard-schedule
npm run generate:sample
```

生成物: `public/index.html` をブラウザで開く（印刷も可）。

## Googleスプレッドシートをソースにする

1. テンプレCSV（`data/annual-schedule.sample.csv`）をシートに取り込む  
2. 共有 → **リンクを知っている全員** → **閲覧者**  
3. `config.json` の `spreadsheetId` を自分のシートIDにする（設定済みならそのままでOK）  
4. 実行:

```bash
npm run generate
```

読めないときは、まだ共有が「制限付き」のままです。上記の共有設定を確認してください。

### 列の意味

| 列 | 例 | 説明 |
|----|----|------|
| 日付 | 2026-09-01 | `YYYY-MM-DD` |
| 曜日 | 火 | 任意（表示は日付から計算） |
| 行事名 | 朝会 | 黒板に書く内容 |
| 対象 | 全校 / 3年 | 参考表示 |
| 子ども向け | ○ / × | ○だけ抽出 |
| メモ | 雨天延期 | 任意 |

## 日曜20時の自動更新（GitHub Pages）

1. このフォルダを GitHub リポジトリとして公開する  
2. リポジトリ Settings → Pages → Source を **GitHub Actions** にする  
3. スプレッドシートを「リンクを知っている全員が閲覧可」にする  
4. 日曜 20:00 JST に Actions が走り、Pages のURLが更新される  

手動で動かしたいとき: Actions タブ → `Weekly blackboard schedule` → Run workflow

## 週の決まり方

- **日曜に実行** → 翌日（月曜）からの1週間  
- **月〜土に実行** → その週の月曜からの1週間  
- 特定週を指定: `node src/generate.js --source=local --week-start=2026-09-07`

## 図解

発表用の4パーツ図解: `diagram/index.html`
