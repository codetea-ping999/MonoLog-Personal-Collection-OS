# MonoLog — Personal Collection OS

好きなモノの「買う → 所有する → 使う → メンテする → 思い出を残す → 手放す」を管理するための、Local-firstな個人向けコレクションOSです。

## MVP features

- コレクション作成・編集・削除
- コレクションごとの自由スキーマ
  - text / textarea / number / money / date / URL / select / boolean
- Guitar / Cycling / Car / Computer のスターターテンプレート
- アイテムCRUD
- 画像登録（縮小後にIndexedDBへ保存）
- タグ、メモ
- 名前・タグ・メモ・カスタム項目を横断検索
- 金額フィールドの合計表示
- JSONバックアップ / リストア
- Local-first IndexedDB
- PWA manifest / Service Worker
- レスポンシブUI

## Stack

- React 19
- TypeScript
- Vite
- IndexedDB (no database dependency)
- Vitest

## Run

```bash
npm install
npm run dev
```

Build & test:

```bash
npm test
npm run build
```

## Architecture

```text
UI (React)
  ├─ CollectionEditor
  ├─ ItemEditor
  └─ Dashboard / Search
       ↓
Application state
       ↓
lib/db.ts
       ↓
IndexedDB

Backup: lib/backup.ts → JSON
Image: lib/image.ts → resized JPEG Data URL → IndexedDB
```

`Collection.fields` がスキーマ定義、`Item.values` が `fieldId -> value` の値を持ちます。新しい趣味ジャンルを追加してもDBスキーマ変更を必要としません。

## Roadmap

詳細は [`ROADMAP.md`](./ROADMAP.md) を参照してください。

## Next

1. Maintenance / Timeline
2. Wishlist / purchase decision
3. Supabase optional sync + Auth
4. AI-assisted photo recognition & field suggestions
5. Receipt / warranty attachment handling
6. CSV import/export and richer analytics
