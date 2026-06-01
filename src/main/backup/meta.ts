import { app } from 'electron'
import { getDb } from '../db/connection'
import { SCHEMA_VERSION } from '../db/migrate'
import { BACKUP_FORMAT, BACKUP_FORMAT_VERSION } from './types'

export function getAppVersion(): string {
  return app.getVersion() || '0.0.0'
}

export function getSchemaVersion(): number {
  const v = getDb().pragma('user_version', { simple: true })
  return typeof v === 'number' ? v : SCHEMA_VERSION
}

export function backupEnvelopeBase(scope: 'zavod' | 'database') {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: getAppVersion(),
    schemaVersion: getSchemaVersion(),
    exportedAt: new Date().toISOString(),
    scope
  }
}
