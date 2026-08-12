export type FieldType = 'text' | 'number' | 'date' | 'money' | 'url' | 'textarea' | 'select' | 'boolean'

export interface FieldDefinition {
  id: string
  name: string
  type: FieldType
  required?: boolean
  options?: string[]
}

export interface Collection {
  id: string
  name: string
  icon: string
  description?: string
  fields: FieldDefinition[]
  createdAt: string
  updatedAt: string
}

export type ItemValue = string | number | boolean | null

export interface Item {
  id: string
  collectionId: string
  name: string
  values: Record<string, ItemValue>
  tags: string[]
  notes?: string
  photo?: string
  createdAt: string
  updatedAt: string
}

export interface BackupPayload {
  version: 1
  exportedAt: string
  collections: Collection[]
  items: Item[]
}

export interface CollectionTemplate {
  key: string
  name: string
  icon: string
  description: string
  fields: Omit<FieldDefinition, 'id'>[]
}
