/// <reference types="vite/client" />

// Verze appky injektovaná z package.json přes Vite (`define`). Nahrazuje se
// při buildu — v runtime je to obyčejný string.
declare const __APP_VERSION__: string
