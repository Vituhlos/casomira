// Verze aplikace pro UI. Hodnotu plní Vite z `package.json` přes `define`
// (viz electron.vite.config.ts) — jeden zdroj pravdy, žádné natvrdo opsané
// číslo. Po změně `version` v package.json se přepíše všude sama.

export const APP_VERSION: string = __APP_VERSION__

/** „v0.9.0" — pro decentní zobrazení v UI. */
export const APP_VERSION_LABEL = `v${APP_VERSION}`

/** Veřejný název aplikace (zobrazovaný v patičkách, „O aplikaci" apod.). */
export const APP_NAME = 'Časomíra'
