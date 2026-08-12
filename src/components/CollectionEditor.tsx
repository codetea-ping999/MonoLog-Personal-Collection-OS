import { useMemo, useState } from 'react'
import type { Collection, FieldDefinition, FieldType } from '../types'
import { makeId } from '../lib/id'
import { collectionTemplates } from '../lib/templates'

const typeOptions: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'テキスト' }, { value: 'textarea', label: '複数行テキスト' },
  { value: 'number', label: '数値' }, { value: 'money', label: '金額' },
  { value: 'date', label: '日付' }, { value: 'url', label: 'URL' },
  { value: 'select', label: '選択肢' }, { value: 'boolean', label: 'チェック' },
]

export function CollectionEditor({ initial, onSave, onCancel }: {
  initial?: Collection
  onSave: (collection: Collection) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '📦')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [fields, setFields] = useState<FieldDefinition[]>(initial?.fields ?? [])
  const [template, setTemplate] = useState('blank')

  const canSave = useMemo(() => name.trim().length > 0, [name])

  const applyTemplate = (key: string) => {
    setTemplate(key)
    const selected = collectionTemplates.find((item) => item.key === key)
    if (!selected || key === 'blank') return
    setName(selected.name)
    setIcon(selected.icon)
    setDescription(selected.description)
    setFields(selected.fields.map((field) => ({ ...field, id: makeId('field') })))
  }

  const addField = () => setFields((prev) => [...prev, { id: makeId('field'), name: '', type: 'text' }])
  const updateField = (id: string, patch: Partial<FieldDefinition>) => setFields((prev) => prev.map((field) => field.id === id ? { ...field, ...patch } : field))
  const removeField = (id: string) => setFields((prev) => prev.filter((field) => field.id !== id))

  const submit = () => {
    if (!canSave) return
    const now = new Date().toISOString()
    onSave({
      id: initial?.id ?? makeId('collection'),
      name: name.trim(), icon: icon.trim() || '📦', description: description.trim(),
      fields: fields.filter((f) => f.name.trim()).map((f) => ({ ...f, name: f.name.trim() })),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    })
  }

  return (
    <div className="form-stack">
      {!initial && <label>スターターテンプレート
        <select value={template} onChange={(e) => applyTemplate(e.target.value)}>
          {collectionTemplates.map((item) => <option key={item.key} value={item.key}>{item.icon} {item.name}</option>)}
        </select>
      </label>}
      <div className="form-grid two">
        <label>アイコン<input value={icon} maxLength={4} onChange={(e) => setIcon(e.target.value)} /></label>
        <label>コレクション名 *<input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: ギター" /></label>
      </div>
      <label>説明<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="何を管理するコレクションか" /></label>
      <div className="section-title-row"><h3>カスタム項目</h3><button className="secondary" onClick={addField}>＋ 項目追加</button></div>
      <div className="field-list">
        {fields.length === 0 && <p className="muted">まだ項目がありません。必要な項目を自由に追加できます。</p>}
        {fields.map((field) => (
          <div className="field-row" key={field.id}>
            <input aria-label="項目名" value={field.name} onChange={(e) => updateField(field.id, { name: e.target.value })} placeholder="項目名" />
            <select aria-label="項目タイプ" value={field.type} onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}>
              {typeOptions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            {field.type === 'select' && <input aria-label="選択肢" value={field.options?.join(',') ?? ''} onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} placeholder="選択肢をカンマ区切り" />}
            <label className="inline-check"><input type="checkbox" checked={!!field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} />必須</label>
            <button className="danger-ghost" onClick={() => removeField(field.id)}>削除</button>
          </div>
        ))}
      </div>
      <div className="modal-actions"><button className="secondary" onClick={onCancel}>キャンセル</button><button className="primary" disabled={!canSave} onClick={submit}>保存</button></div>
    </div>
  )
}
