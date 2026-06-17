import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKUP_FORMAT } from './types'

vi.mock('electron', () => ({
  app: {
    getVersion: () => '0.9.13-beta'
  }
}))

vi.mock('../db/connection', () => ({
  getDb: () => ({
    prepare: () => ({
      get: () => ({ user_version: 42 })
    })
  })
}))

describe('backupEnvelopeBase', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('vytváří nové exporty ve formátu Verdictu', async () => {
    const { backupEnvelopeBase } = await import('./meta')

    expect(backupEnvelopeBase('database')).toMatchObject({
      format: BACKUP_FORMAT,
      appVersion: '0.9.13-beta',
      schemaVersion: 42,
      scope: 'database'
    })
  })
})
