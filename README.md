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
npm install
npm run dev
```

Supabase Authでメール確認を有効にする場合は、メール内リンクのリダイレクト先に`http://localhost:3000/auth/callback`を追加してください。本番ではデプロイ先URLも追加します。

## 検証コマンド

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

画像は非公開の`collection-images`バケットへユーザーID配下のパスで保存され、Storage RLSと署名付きURLで保護されます。
