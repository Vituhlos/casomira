import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // integration.test.ts a transaction.test.ts jsou standalone skripty (spouštěné přes
    // `npx tsx`), ne vitest testy — nemají describe/test/expect a integration.test.ts
    // volá process.exit(). Vyloučíme je z vitest discovery; testování DB vrstvy
    // zůstává dostupné přes `npx tsx src/main/db/integration.test.ts`.
    exclude: [
      'src/main/db/integration.test.ts',
      'src/main/db/transaction.test.ts',
      '**/node_modules/**'
    ],
    environment: 'node'
  }
})
