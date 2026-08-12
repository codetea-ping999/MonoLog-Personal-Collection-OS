import type { BackupPayload, Collection, Item } from '../types'

export const makeBackup = (collections: Collection[], items: Item[]): BackupPayload => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  collections,
  items,
})

export const parseBackup = (text: string): BackupPayload => {
  const data: unknown = JSON.parse(text)
  if (!data || typeof data !== 'object') throw new Error('バックアップ形式が不正です')
  const payload = data as Partial<BackupPayload>
  if (payload.version !== 1 || !Array.isArray(payload.collections) || !Array.isArray(payload.items)) {
    throw new Error('MonoLog v1 のバックアップではありません')
  }
  return payload as BackupPayload
}
