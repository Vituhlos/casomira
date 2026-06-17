import { describe, expect, it } from 'vitest'
import { BACKUP_FORMAT, LEGACY_BACKUP_FORMAT } from './types'
import { BackupValidationError, parseBackupJson } from './validate'

function backupJson(format: string): string {
  return JSON.stringify({
    format,
    formatVersion: 1,
    appVersion: '0.9.13-beta',
    schemaVersion: 1,
    exportedAt: '2026-06-17T00:00:00.000Z',
    scope: 'zavod',
    zavody: [
      {
        zavod: {
          id: 1,
          nazev: 'Test',
          datum: '2026-06-17',
          misto: 'Kotlina',
          typ: 'RAC'
        },
        kategorie: [],
        skupiny: [],
        jezdci: [],
        kola: [],
        jizdy: [],
        rost_pozice: [],
        vysledky: [],
        mereni: [],
        uprava_log: []
      }
    ]
  })
}

describe('parseBackupJson', () => {
  it('přijme nový formát Verdictu', () => {
    const parsed = parseBackupJson(backupJson(BACKUP_FORMAT))

    expect(parsed.format).toBe('verdict-backup')
    expect(parsed.zavody).toHaveLength(1)
  })

  it('přijme legacy formát Časomíry', () => {
    const parsed = parseBackupJson(backupJson(LEGACY_BACKUP_FORMAT))

    expect(parsed.format).toBe('casomira-backup')
    expect(parsed.zavody[0].zavod.nazev).toBe('Test')
  })

  it('odmítne neznámý formát s čitelnou chybou', () => {
    expect(() => parseBackupJson(backupJson('unknown-backup'))).toThrow(BackupValidationError)
    expect(() => parseBackupJson(backupJson('unknown-backup'))).toThrow('verdict-backup')
    expect(() => parseBackupJson(backupJson('unknown-backup'))).toThrow('casomira-backup')
  })
})
