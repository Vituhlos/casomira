import type { CasomiraApi } from '../shared/types'

// Aby TypeScript v okně věděl, že `window.api` existuje a co umí.
declare global {
  interface Window {
    api: CasomiraApi
  }
}

export {}
