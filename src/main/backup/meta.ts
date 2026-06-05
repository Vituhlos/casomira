import { app } from 'electron'
import { getDb } from '../db/connection'
import { SCHEMA_VERSION } from '../db/migrate'
import { BACKUP_FORMAT, BACKUP_FORMAT_VERSION } from './types'

export function getAppVersion(): string {
  return app.getVersion() || '0.0.0'
}

export function getSchemaVersion(): number {
  // node:sqlite nemá .pragma() — čteme přes PRAGMA query.
  const row = getDb().prepare('PRAGMA user_version').get() as { user_version: number } | undefined
  return row?.user_version ?? SCHEMA_VERSION
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
