import { useEffect, useMemo, useRef, useState } from 'react'
import type { BackupPayload, Collection, Item } from './types'
import { db } from './lib/db'
import { makeBackup, parseBackup } from './lib/backup'
import { formatValue, yen } from './lib/format'
import { Modal } from './components/Modal'
import { CollectionEditor } from './components/CollectionEditor'
import { ItemEditor } from './components/ItemEditor'
import './styles.css'

type ModalState =
  | { kind: 'collection-new' }
  | { kind: 'collection-edit'; collection: Collection }
  | { kind: 'item-new'; collection: Collection }
  | { kind: 'item-edit'; collection: Collection; item: Item }
  | null

export default function App() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const restoreInput = useRef<HTMLInputElement>(null)

  const reload = async () => {
    const [nextCollections, nextItems] = await Promise.all([db.getCollections(), db.getItems()])
    setCollections(nextCollections.sort((a, b) => a.name.localeCompare(b.name, 'ja')))
    setItems(nextItems.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
    setLoading(false)
  }

  useEffect(() => { reload().catch((error) => { console.error(error); setLoading(false) }) }, [])
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 2500); return () => clearTimeout(id) }, [toast])

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId)
  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      if (selectedCollectionId !== 'all' && item.collectionId !== selectedCollectionId) return false
      if (!q) return true
      return [item.name, item.notes ?? '', item.tags.join(' '), ...Object.values(item.values).map(String)].join(' ').toLowerCase().includes(q)
    })
  }, [items, query, selectedCollectionId])

  const totalValue = useMemo(() => items.reduce((sum, item) => {
    const collection = collections.find((c) => c.id === item.collectionId)
    if (!collection) return sum
    const moneyIds = collection.fields.filter((f) => f.type === 'money').map((f) => f.id)
    return sum + moneyIds.reduce((s, id) => s + (typeof item.values[id] === 'number' ? Number(item.values[id]) : 0), 0)
  }, 0), [collections, items])

  const saveCollection = async (collection: Collection) => { await db.putCollection(collection); await reload(); setModal(null); setSelectedCollectionId(collection.id); setToast('コレクションを保存しました') }
  const saveItem = async (item: Item) => { await db.putItem(item); await reload(); setModal(null); setToast('アイテムを保存しました') }
  const deleteItem = async (item: Item) => { if (!confirm(`「${item.name}」を削除しますか？`)) return; await db.deleteItem(item.id); await reload(); setToast('アイテムを削除しました') }
  const deleteCollection = async (collection: Collection) => { if (!confirm(`「${collection.name}」と、その中のアイテムをすべて削除しますか？`)) return; await db.deleteCollection(collection.id); setSelectedCollectionId('all'); await reload(); setToast('コレクションを削除しました') }

  const exportBackup = () => {
    const data = JSON.stringify(makeBackup(collections, items), null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `monolog-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url); setToast('バックアップを書き出しました')
  }

  const restore = async (file?: File) => {
    if (!file) return
    try {
      const payload: BackupPayload = parseBackup(await file.text())
      if (!confirm(`コレクション ${payload.collections.length} 件・アイテム ${payload.items.length} 件で現在のデータを置き換えますか？`)) return
      await db.replaceAll(payload.collections, payload.items); setSelectedCollectionId('all'); await reload(); setToast('バックアップを復元しました')
    } catch (error) { alert(error instanceof Error ? error.message : '復元に失敗しました') }
    finally { if (restoreInput.current) restoreInput.current.value = '' }
  }

  if (loading) return <div className="loading">MonoLog を読み込んでいます…</div>

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">M</span><div><strong>MonoLog</strong><small>Personal Collection OS</small></div></div>
        <nav>
          <button className={selectedCollectionId === 'all' ? 'nav-active' : ''} onClick={() => setSelectedCollectionId('all')}><span>◫</span>すべて<span className="count">{items.length}</span></button>
          <div className="nav-label">COLLECTIONS</div>
          {collections.map((collection) => <button key={collection.id} className={selectedCollectionId === collection.id ? 'nav-active' : ''} onClick={() => setSelectedCollectionId(collection.id)}><span>{collection.icon}</span>{collection.name}<span className="count">{items.filter((i) => i.collectionId === collection.id).length}</span></button>)}
        </nav>
        <button className="new-collection" onClick={() => setModal({ kind: 'collection-new' })}>＋ コレクション</button>
        <div className="sidebar-footer"><button onClick={exportBackup}>↓ Backup</button><button onClick={() => restoreInput.current?.click()}>↑ Restore</button><input ref={restoreInput} hidden type="file" accept="application/json" onChange={(e) => restore(e.target.files?.[0])} /></div>
      </aside>

      <main>
        <header className="topbar"><div><p className="eyebrow">LOCAL-FIRST INVENTORY</p><h1>{selectedCollection ? `${selectedCollection.icon} ${selectedCollection.name}` : 'My Collection'}</h1><p className="subtitle">{selectedCollection?.description || '好きなモノの購入・所有・履歴を、自分のルールで残す。'}</p></div><div className="top-actions">{selectedCollection && <button className="secondary" onClick={() => setModal({ kind: 'collection-edit', collection: selectedCollection })}>設定</button>}<button className="primary" disabled={!selectedCollection} onClick={() => selectedCollection && setModal({ kind: 'item-new', collection: selectedCollection })}>＋ アイテム</button></div></header>

        <section className="stats"><article><span>ITEMS</span><strong>{visibleItems.length}</strong><small>{selectedCollection ? 'このコレクション' : '登録アイテム'}</small></article><article><span>COLLECTIONS</span><strong>{collections.length}</strong><small>自由スキーマ</small></article><article><span>RECORDED VALUE</span><strong>{yen(totalValue)}</strong><small>金額フィールド合計</small></article></section>

        {collections.length === 0 ? (
          <section className="empty-state"><div className="empty-icon">✦</div><p className="eyebrow">START HERE</p><h2>最初のコレクションを作成</h2><p>ギター、自転車、PC、クルマ。テンプレートから始めることも、完全に自由な項目で作ることもできます。</p><button className="primary" onClick={() => setModal({ kind: 'collection-new' })}>コレクションを作る</button></section>
        ) : (
          <>
            <div className="toolbar"><div className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名前・タグ・メモ・項目から検索" /></div>{selectedCollection && <div className="collection-menu"><button className="secondary danger-text" onClick={() => deleteCollection(selectedCollection)}>コレクション削除</button></div>}</div>
            {visibleItems.length === 0 ? <section className="empty-list"><h3>{query ? '一致するアイテムがありません' : 'まだアイテムがありません'}</h3><p>{selectedCollection ? '「＋ アイテム」から最初の1件を登録できます。' : '左側からコレクションを選択してください。'}</p></section> : <section className="item-grid">{visibleItems.map((item) => {
              const collection = collections.find((c) => c.id === item.collectionId)
              if (!collection) return null
              return <article className="item-card" key={item.id}>
                <div className="item-photo">{item.photo ? <img src={item.photo} alt="" /> : <span>{collection.icon}</span>}<div className="item-badge">{collection.name}</div></div>
                <div className="item-body"><div className="item-title-row"><h3>{item.name}</h3><button className="icon-button" onClick={() => setModal({ kind: 'item-edit', collection: collection, item })}>•••</button></div>
                  <div className="item-values">{collection.fields.filter((f) => item.values[f.id] !== undefined && item.values[f.id] !== '' && item.values[f.id] !== null).slice(0, 3).map((field) => <div key={field.id}><span>{field.name}</span><strong>{formatValue(item.values[field.id], field)}</strong></div>)}</div>
                  {item.tags.length > 0 && <div className="tags">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
                  <div className="item-footer"><small>更新 {new Date(item.updatedAt).toLocaleDateString('ja-JP')}</small><button className="danger-ghost" onClick={() => deleteItem(item)}>削除</button></div>
                </div>
              </article>
            })}</section>}
          </>
        )}
      </main>

      {modal?.kind === 'collection-new' && <Modal title="コレクションを作成" wide onClose={() => setModal(null)}><CollectionEditor onSave={saveCollection} onCancel={() => setModal(null)} /></Modal>}
      {modal?.kind === 'collection-edit' && <Modal title="コレクション設定" wide onClose={() => setModal(null)}><CollectionEditor initial={modal.collection} onSave={saveCollection} onCancel={() => setModal(null)} /></Modal>}
      {modal?.kind === 'item-new' && <Modal title={`${modal.collection.icon} ${modal.collection.name} に追加`} wide onClose={() => setModal(null)}><ItemEditor collection={modal.collection} onSave={saveItem} onCancel={() => setModal(null)} /></Modal>}
      {modal?.kind === 'item-edit' && <Modal title="アイテムを編集" wide onClose={() => setModal(null)}><ItemEditor collection={modal.collection} initial={modal.item} onSave={saveItem} onCancel={() => setModal(null)} /></Modal>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
