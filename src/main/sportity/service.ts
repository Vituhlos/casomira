import { safeStorage } from 'electron'
import { SportityClient } from './client'
import type { SportityDocument } from './types'
import * as repo from '../repo'
import { generatePdfBuffer } from '../pdf'
import type { ListKey } from '../../shared/types'

const API_KEY_NASTAVENI = 'sportity.apikey.enc'

// ---------------------------------------------------------------------------
// API key management (encrypted via Electron safeStorage)
// ---------------------------------------------------------------------------

export function hasApiKey(): boolean {
  return repo.getNastaveni(API_KEY_NASTAVENI) !== null
}

export function getApiKeyHint(): string | null {
  if (!hasApiKey()) return null
  const key = getApiKey()
  if (!key || key.length < 4) return '...????'
  return `...${key.slice(-4)}`
}

export function getApiKey(): string | null {
  const enc = repo.getNastaveni(API_KEY_NASTAVENI)
  if (!enc) return null
  try {
    return safeStorage.decryptString(Buffer.from(enc, 'base64'))
  } catch {
    return null
  }
}

export function setApiKey(apiKey: string): void {
  const enc = safeStorage.encryptString(apiKey).toString('base64')
  repo.setNastaveni(API_KEY_NASTAVENI, enc)
}

export function clearApiKey(): void {
  repo.deleteNastaveni(API_KEY_NASTAVENI)
}

function getClient(): SportityClient {
  const key = getApiKey()
  if (!key) throw new Error('Sportity API klíč není nastaven.')
  return new SportityClient(key)
}

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const client = getClient()
    await client.testConnection()
    return { ok: true, message: 'Spojení OK.' }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Chyba spojení.' }
  }
}

// ---------------------------------------------------------------------------
// Events/channels list
// ---------------------------------------------------------------------------

export async function listEvents(): Promise<Array<{ id: string; name: string; password: string }>> {
  const client = getClient()
  const data = await client.listEvents()
  const items: Array<{ id: string; name: string; password: string }> = []

  for (const ev of data.events ?? []) {
    items.push({ id: ev.id, name: ev.name, password: ev.password ?? '' })
  }
  for (const ch of data.channels ?? []) {
    items.push({ id: ch.id, name: ch.name, password: ch.password ?? '' })
  }
  for (const s of data.series ?? []) {
    items.push({ id: s.id, name: s.name, password: s.password ?? '' })
  }
  return items
}

// ---------------------------------------------------------------------------
// Documents tree
// ---------------------------------------------------------------------------

export async function listDocuments(
  password: string,
  eventId?: string | null
): Promise<SportityDocument[]> {
  const client = getClient()
  return client.listDocuments(password, eventId)
}

// ---------------------------------------------------------------------------
// Zavod mapping
// ---------------------------------------------------------------------------

export function getZavodMap(
  zavodId: number
): { channelPassword: string; eventId: string | null; resultsFolderId: string; resultsFolderName: string } | null {
  return repo.getSportityZavodMap(zavodId)
}

export function setZavodMap(
  zavodId: number,
  channelPassword: string,
  eventId: string | null,
  resultsFolderId: string,
  resultsFolderName: string
): void {
  repo.setSportityZavodMap(zavodId, channelPassword, eventId, resultsFolderId, resultsFolderName)
}

// ---------------------------------------------------------------------------
// Category mapping
// ---------------------------------------------------------------------------

export function getKategorieMapForZavod(
  zavodId: number
): Array<{ kategorieId: number; kategorieNazev: string; folderId: string | null; folderName: string | null }> {
  return repo.getKategorieMapForZavod(zavodId)
}

export function setKategorieMap(kategorieId: number, folderId: string, folderName: string): void {
  repo.setSportityKategorieMap(kategorieId, folderId, folderName)
}

export function clearKategorieMap(kategorieId: number): void {
  repo.clearSportityKategorieMap(kategorieId)
}

// Auto-match categories to Sportity folders by name (case-insensitive)
export async function autoMapCategories(
  zavodId: number
): Promise<Array<{ kategorieId: number; kategorieNazev: string; folderId: string | null; folderName: string | null }>> {
  const zavodMap = repo.getSportityZavodMap(zavodId)
  if (!zavodMap) throw new Error('Závod není namapovaný na Sportity kanál.')

  const client = getClient()
  const docs = await client.listDocuments(zavodMap.channelPassword, zavodMap.eventId)

  // Children of the results folder
  const subFolders = docs.filter(
    (d) => d.type === 'Folder' && d.parent_id === zavodMap.resultsFolderId
  )

  const kategorie = repo.getKategorieMapForZavod(zavodId)

  for (const kat of kategorie) {
    const match = subFolders.find(
      (f) => f.name.trim().toLowerCase() === kat.kategorieNazev.trim().toLowerCase()
    )
    if (match) {
      repo.setSportityKategorieMap(kat.kategorieId, match.id, match.name)
    }
  }

  return repo.getKategorieMapForZavod(zavodId)
}

// ---------------------------------------------------------------------------
// Lists to publish per category
// ---------------------------------------------------------------------------

const PUBLISH_LISTS: { listKey: ListKey; nazev: string }[] = [
  { listKey: 'start', nazev: 'Startovní listina' },
  { listKey: 'grid_q1', nazev: 'Rošty Q1' },
  { listKey: 'res_q1', nazev: 'Výsledky Q1' },
  { listKey: 'grid_q2', nazev: 'Rošty Q2' },
  { listKey: 'res_q2', nazev: 'Výsledky Q2' },
  { listKey: 'class_q2', nazev: 'Celkově po Q2' },
  { listKey: 'grid_q3', nazev: 'Rošty Q3' },
  { listKey: 'res_q3', nazev: 'Výsledky Q3' },
  { listKey: 'class_q3', nazev: 'Celkově po Q3' },
  { listKey: 'sf_rost', nazev: 'Rošty semifinále' },
  { listKey: 'sf_res', nazev: 'Výsledky semifinále' },
  { listKey: 'final_rost', nazev: 'Rošty finále' },
  { listKey: 'final_res', nazev: 'Výsledky finále' },
  { listKey: 'overall', nazev: 'Celkové výsledky' },
]

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export async function publishList(
  kategorieId: number,
  listKey: string
): Promise<{ status: 'created' | 'updated' | 'skipped' | 'failed'; message?: string }> {
  const kat = repo.getKategorieById(kategorieId)
  if (!kat) return { status: 'failed', message: 'Kategorie nenalezena.' }

  const katMap = repo.getSportityKategorieMap(kategorieId)
  if (!katMap) return { status: 'failed', message: 'Kategorie není namapována na Sportity složku.' }

  const zavodMap = repo.getSportityZavodMap(kat.zavod_id)
  if (!zavodMap) return { status: 'failed', message: 'Závod není namapovaný na Sportity kanál.' }

  const client = getClient()

  // Generate PDF buffer
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generatePdfBuffer(kategorieId, listKey as ListKey, repo.getLogo())
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'PDF se nepodařilo vygenerovat.'
    repo.addSportityPublishLog(kat.zavod_id, kategorieId, listKey, 'publish', 'error', msg)
    return { status: 'skipped', message: msg }
  }

  const pdfBase64 = pdfBuffer.toString('base64')
  const listItem = PUBLISH_LISTS.find((p) => p.listKey === listKey)
  const docName = listItem?.nazev ?? listKey
  const filename = `${docName.replace(/\s+/g, '_')}.pdf`

  try {
    // Check if we already have a document ID for this list
    const existingDocId = repo.getSportityDocumentId(kategorieId, listKey)

    if (existingDocId) {
      // Update existing document
      await client.updateDocument(existingDocId, {
        document_id: existingDocId,
        password: zavodMap.channelPassword,
        type: 'PDF',
        name: docName,
        body: pdfBase64,
        filename
      })
      repo.setSportityDocumentId(kategorieId, listKey, existingDocId)
      repo.addSportityPublishLog(kat.zavod_id, kategorieId, listKey, 'update', 'ok')
      return { status: 'updated' }
    }

    // No stored ID — check Sportity folder for existing document by name
    const folderDocs = await client.listDocuments(zavodMap.channelPassword, zavodMap.eventId)
    const existing = folderDocs.find(
      (d) => d.parent_id === katMap.folderId &&
             d.type === 'PDF' &&
             d.name.trim().toLowerCase() === docName.trim().toLowerCase()
    )

    if (existing) {
      // Found by name — update it and save the ID
      await client.updateDocument(existing.id, {
        document_id: existing.id,
        password: zavodMap.channelPassword,
        type: 'PDF',
        name: docName,
        body: pdfBase64,
        filename
      })
      repo.setSportityDocumentId(kategorieId, listKey, existing.id)
      repo.addSportityPublishLog(kat.zavod_id, kategorieId, listKey, 'update', 'ok')
      return { status: 'updated' }
    }

    // Create new document in the category folder
    const created = await client.createDocument({
      name: docName,
      password: zavodMap.channelPassword,
      event_id: zavodMap.eventId ?? undefined,
      type: 'PDF',
      body: pdfBase64,
      filename,
      parent_id: katMap.folderId
    })
    repo.setSportityDocumentId(kategorieId, listKey, created.id)
    repo.addSportityPublishLog(kat.zavod_id, kategorieId, listKey, 'create', 'ok')
    return { status: 'created' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Chyba při publikování.'
    repo.addSportityPublishLog(kat.zavod_id, kategorieId, listKey, 'publish', 'error', msg)
    return { status: 'failed', message: msg }
  }
}

export async function publishCategory(kategorieId: number): Promise<{
  ok: boolean
  created: number
  updated: number
  skipped: number
  failed: number
  items: Array<{ listKey: string; nazev: string; status: string; message?: string }>
}> {
  let created = 0, updated = 0, skipped = 0, failed = 0
  const items: Array<{ listKey: string; nazev: string; status: string; message?: string }> = []

  for (const item of PUBLISH_LISTS) {
    const result = await publishList(kategorieId, item.listKey)
    items.push({ listKey: item.listKey, nazev: item.nazev, ...result })
    if (result.status === 'created') created++
    else if (result.status === 'updated') updated++
    else if (result.status === 'skipped') skipped++
    else failed++
  }

  return { ok: failed === 0, created, updated, skipped, failed, items }
}
