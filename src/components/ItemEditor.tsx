import { useState } from 'react'
import type { Collection, Item, ItemValue } from '../types'
import { makeId } from '../lib/id'
import { readImageAsDataUrl } from '../lib/image'

export function ItemEditor({ collection, initial, onSave, onCancel }: {
  collection: Collection
  initial?: Item
  onSave: (item: Item) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [values, setValues] = useState<Record<string, ItemValue>>(initial?.values ?? {})
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [photo, setPhoto] = useState(initial?.photo ?? '')
  const [imageBusy, setImageBusy] = useState(false)

  const setValue = (fieldId: string, value: ItemValue) => setValues((prev) => ({ ...prev, [fieldId]: value }))
  const submit = () => {
    if (!name.trim()) return
    const missing = collection.fields.some((field) => field.required && (values[field.id] === undefined || values[field.id] === '' || values[field.id] === null))
    if (missing) return alert('必須項目を入力してください')
    const now = new Date().toISOString()
    onSave({
      id: initial?.id ?? makeId('item'), collectionId: collection.id, name: name.trim(), values,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), notes: notes.trim(), photo: photo || undefined,
      createdAt: initial?.createdAt ?? now, updatedAt: now,
    })
  }

  const upload = async (file?: File) => {
    if (!file) return
    setImageBusy(true)
    try { setPhoto(await readImageAsDataUrl(file)) } finally { setImageBusy(false) }
  }

  return (
    <div className="form-stack">
      <label>名前 *<input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: ESP Bricoleur" autoFocus /></label>
      <div className="image-input">
        {photo ? <img src={photo} alt="登録画像プレビュー" /> : <div className="image-placeholder">PHOTO</div>}
        <div><label className="file-button">{imageBusy ? '処理中…' : '画像を選択'}<input type="file" accept="image/*" disabled={imageBusy} onChange={(e) => upload(e.target.files?.[0])} /></label>{photo && <button className="danger-ghost" onClick={() => setPhoto('')}>画像を削除</button>}</div>
      </div>
      <div className="form-grid two">
        {collection.fields.map((field) => {
          const value = values[field.id]
          if (field.type === 'boolean') return <label className="inline-check input-label" key={field.id}><input type="checkbox" checked={Boolean(value)} onChange={(e) => setValue(field.id, e.target.checked)} />{field.name}{field.required ? ' *' : ''}</label>
          if (field.type === 'textarea') return <label className="span-two" key={field.id}>{field.name}{field.required ? ' *' : ''}<textarea value={String(value ?? '')} onChange={(e) => setValue(field.id, e.target.value)} /></label>
          if (field.type === 'select') return <label key={field.id}>{field.name}{field.required ? ' *' : ''}<select value={String(value ?? '')} onChange={(e) => setValue(field.id, e.target.value)}><option value="">選択してください</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select></label>
          const inputType = field.type === 'date' ? 'date' : field.type === 'url' ? 'url' : ['number','money'].includes(field.type) ? 'number' : 'text'
          return <label key={field.id}>{field.name}{field.required ? ' *' : ''}<input type={inputType} value={value === null || value === undefined ? '' : String(value)} onChange={(e) => setValue(field.id, ['number','money'].includes(field.type) ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)} /></label>
        })}
      </div>
      <label>タグ<input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="例: メイン, ライブ用（カンマ区切り）" /></label>
      <label>メモ<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="購入理由、思い出、状態など" /></label>
      <div className="modal-actions"><button className="secondary" onClick={onCancel}>キャンセル</button><button className="primary" disabled={!name.trim()} onClick={submit}>保存</button></div>
    </div>
  )
}
