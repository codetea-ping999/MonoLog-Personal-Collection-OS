# MonoLog Roadmap

## Phase 1 — Local-first MVP

- [x] Collection CRUD
- [x] Flexible field schema
- [x] Item CRUD
- [x] Image storage in IndexedDB
- [x] Search and tags
- [x] JSON backup / restore
- [x] PWA baseline

## Phase 2 — Ownership lifecycle

- [ ] Maintenance Center
- [ ] Item timeline / event log
- [ ] Wishlist and purchase candidates
- [ ] Purchase / sale transactions
- [ ] Warranty and receipt metadata
- [ ] Category and spending analytics

## Phase 3 — Optional cloud sync

- [ ] Supabase Auth
- [ ] PostgreSQL schema and migrations
- [ ] Local-first sync strategy
- [ ] Conflict resolution
- [ ] Multi-device backup and restore

## Phase 4 — AI assistance

- [ ] Photo-based item identification
- [ ] AI field suggestions with user approval
- [ ] Receipt parsing
- [ ] Duplicate / overlapping purchase warnings
- [ ] Maintenance suggestions
- [ ] Purchase decision assistant

## Engineering guardrails

- Local-first remains a supported mode.
- AI suggestions must not silently overwrite user data.
- Destructive actions require explicit UI confirmation.
- Backup data should remain portable and inspectable.
