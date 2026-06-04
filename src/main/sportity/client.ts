import { net } from 'electron'
import type {
  SportityDocument,
  SportityEventsResponse,
  CreateDocumentPayload,
  UpdateDocumentPayload
} from './types'

const BASE = 'https://admin.sportity.com/api'

export class SportityClient {
  constructor(private readonly apiKey: string) {}

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'X-Sportity-ApiKey': this.apiKey }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const res = await net.fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Sportity ${res.status}: ${txt.slice(0, 200)}`)
    }
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  async testConnection(): Promise<SportityEventsResponse> {
    return this.req<SportityEventsResponse>('GET', '/events')
  }

  async listEvents(): Promise<SportityEventsResponse> {
    return this.req<SportityEventsResponse>('GET', '/events')
  }

  async listDocuments(password: string, eventId?: string | null): Promise<SportityDocument[]> {
    const path = eventId ? `/documents/${password}/${eventId}` : `/documents/${password}`
    return this.req<SportityDocument[]>('GET', path)
  }

  async createDocument(payload: CreateDocumentPayload): Promise<SportityDocument> {
    return this.req<SportityDocument>('POST', '/document/create', payload)
  }

  async updateDocument(id: string, payload: UpdateDocumentPayload): Promise<SportityDocument> {
    return this.req<SportityDocument>('PUT', `/document/${id}`, payload)
  }

  async deleteDocument(id: string): Promise<void> {
    return this.req('DELETE', `/document/delete/${id}`)
  }
}
