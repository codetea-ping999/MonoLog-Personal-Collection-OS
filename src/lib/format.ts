import type { FieldDefinition, ItemValue } from '../types'

export const formatValue = (value: ItemValue, field: FieldDefinition) => {
  if (value === null || value === '' || value === undefined) return '—'
  if (field.type === 'money' && typeof value === 'number') {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value)
  }
  if (field.type === 'boolean') return value ? 'はい' : 'いいえ'
  return String(value)
}

export const yen = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value)
