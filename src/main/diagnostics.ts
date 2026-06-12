import { app } from 'electron'
import { join } from 'node:path'
import { BUILD_INFO } from '../shared/buildInfo.generated'
import type { AppDiagnostics } from '../shared/types'
import { dbPath, getDb } from './db/connection'
import { SCHEMA_VERSION } from './db/migrate'

function databaseUserVersion(): number | null {
  try {
    const row = getDb().prepare('PRAGMA user_version').get() as { user_version: number } | undefined
    return row?.user_version ?? null
  } catch {
    return null
  }
}

export function getDiagnostics(): AppDiagnostics {
  const userData = app.getPath('userData')

  return {
    build: BUILD_INFO,
    runtime: {
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      node: process.versions.node,
      chrome: process.versions.chrome,
      v8: process.versions.v8,
      appPackaged: app.isPackaged
    },
    paths: {
      userData,
      database: dbPath(),
      startupLog: join(userData, 'startup.log')
    },
    database: {
      schemaVersion: SCHEMA_VERSION,
      userVersion: databaseUserVersion()
    }
  }
}
