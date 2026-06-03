/**
 * Ošetří zamítnutý Promise: vždy zaloguje do konzole a volitelně zavolá
 * onError handler (toast / setter chybového stavu).
 */
export function safeCall(
  promise: Promise<unknown>,
  onError?: (msg: string) => void
): void {
  promise.catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API]', msg)
    onError?.(msg)
  })
}
