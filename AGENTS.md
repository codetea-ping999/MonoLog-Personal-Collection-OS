# MonoLog agent guide

このリポジトリでは、人が優先順位・受け入れ条件・リリース判断を担い、
エージェントは小さく検証可能な変更を実装します。ここは索引と作業契約です。
詳細なタスクは `docs/tasks/` に、日々の反復手順は
[`docs/engineering-loop.md`](docs/engineering-loop.md) に記録します。

## 最初に読むもの

1. `README.md` — ローカル環境と検証コマンド
2. `docs/engineering-loop.md` — タスクの分解、停止条件、証跡
3. 変更に対応する `app/`、`components/`、`lib/`、`supabase/migrations/`
4. 中規模以上の作業では `docs/tasks/TEMPLATE.md` を複製してタスク契約を作る

## リポジトリ地図

- `app/` — Next.js App Router の画面・APIルート
- `components/` — 画面・フォームのUI
- `lib/item-schema.ts` — アイテム入力とドメイン値の正規化の正本
- `lib/api-utils.ts` / `lib/request-parser.ts` — 認証済みAPIの共通処理と入力境界
- `lib/supabase/` — Supabaseクライアントと生成済みDB型
- `supabase/migrations/` — Postgres・RLS・Storageのスキーマ変更の正本

## 変更時の不変条件

- 既存の未コミット変更を上書き、破棄、無関係に整形しない。最初に
  `git status --short` を確認する。
- 外部入力は境界で検証する。アイテム関連の値は既存の Zod schema と
  正規化関数を優先して使う。
- DBの変更は新しい migration として追加する。適用済み migration は編集しない。
- Auth、RLS、Storage は所有者分離を弱めない。秘密情報をコード、ログ、テスト、
  ドキュメントに書かない。
- 仕様が曖昧で Auth、データ削除、課金、外部送信、または本番環境に影響する場合は、
  推測して実行せず人に相談する。

## 開発ループ

1. 目的・非目標・受け入れ条件・検証方法を明確にする。
2. 影響範囲を読み、最小の変更と対応するテストを作る。
3. 変更に近いテストを実行し、反復のたびに `npm run check` を通す。
4. 失敗は原因と修正を確認してから再試行する。同じ停止理由が2回続く、または
   契約外へ広がる場合は停止して証跡とともに相談する。
5. 完了前に `git diff --check` と `npm run verify` を実行し、結果を引き継ぐ。

## 完了の定義

完了と報告できるのは、受け入れ条件を満たし、必要なテストを追加または更新し、
`npm run verify` が成功し、既知の制約・未検証範囲を明示したときだけです。
API、認可、DB、Storageに触れる変更は、独立した確認者または人のレビューを
要求します。CI成功は人によるリリース判断を置き換えません。
