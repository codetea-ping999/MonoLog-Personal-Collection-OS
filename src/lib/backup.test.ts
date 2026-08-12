import { describe, expect, it } from 'vitest'
import { makeBackup, parseBackup } from './backup'

describe('backup', () => {
  it('round-trips MonoLog v1 data', () => {
    const payload = makeBackup([], [])
    expect(parseBackup(JSON.stringify(payload))).toMatchObject({ version: 1, collections: [], items: [] })
  })

  it('rejects unsupported payloads', () => {
    expect(() => parseBackup('{"version":2,"collections":[],"items":[]}')).toThrow()
  })
})
