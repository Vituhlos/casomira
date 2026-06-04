export interface SportityEventItem {
  id: string
  name: string
  password?: string
  [key: string]: unknown
}

export interface SportityEventsResponse {
  events?: SportityEventItem[]
  series?: SportityEventItem[]
  channels?: SportityEventItem[]
}

export interface SportityDocument {
  id: string
  name: string
  type: 'Folder' | 'PDF' | 'Text' | 'Image' | 'Link'
  parent_id?: string | null
  [key: string]: unknown
}

export interface CreateDocumentPayload {
  name: string
  password: string
  type: string
  event_id?: string
  parent_id?: string
  body?: string
  filename?: string
  text?: string
}

export interface UpdateDocumentPayload {
  document_id: string
  password: string
  type: string
  name?: string
  body?: string
  filename?: string
  text?: string
}
