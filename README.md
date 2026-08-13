# MonoLog Personal Collection OS

個人の本・映画・音楽・ゲームなどを記録し、検索できるコレクションOSのMVPです。

## 技術構成

- Next.js App Router / TypeScript / Tailwind CSS
- Supabase Auth、Postgres、Storage、RLS
- Zodによる入力検証

## ローカル起動

1. Supabaseプロジェクトを作成し、SQL EditorまたはSupabase CLIで`supabase/migrations/20260813000100_create_items.sql`を適用します。
2. `.env.example`を`.env.local`へコピーし、SupabaseのProject URLとPublishable keyを設定します。
3. 依存関係をインストールして起動します。

```bash
npm ci
npm run dev
```

Supabase Authでメール確認を有効にする場合は、メール内リンクのリダイレクト先に`http://localhost:3000/auth/callback`を追加してください。本番ではデプロイ先URLも追加します。

## 検証コマンド

```bash
npm run check    # 型検査・lint・単体テスト（反復用）
npm run verify   # check + 本番ビルド（提出前・CI用）

# 個別実行が必要な場合
npm run typecheck
npm run lint
npm test
npm run build
```

## エージェント支援開発

このプロジェクトでは、短い反復（目的 → 最小変更とテスト → `npm run check` → 修正）と、
提出前の `npm run verify` を共通の品質ゲートにしています。作業境界と停止条件は
[`AGENTS.md`](AGENTS.md)、中規模以上の変更のタスク契約は
[`docs/tasks/TEMPLATE.md`](docs/tasks/TEMPLATE.md) を参照してください。

CI は Node 24 で同じ `npm run verify` を実行します。ローカルでも `.nvmrc` に合わせた
Node 24 を使用してください。

画像は非公開の`collection-images`バケットへユーザーID配下のパスで保存され、Storage RLSと署名付きURLで保護されます。
