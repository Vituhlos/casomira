import { BUILD_INFO } from '@shared/buildInfo.generated'

// Verze aplikace pro UI. Primárně ji nese generovaný build info soubor,
// který release build doplní o commit, datum a kanál vydání.
export const APP_VERSION: string = BUILD_INFO.version || __APP_VERSION__
export const APP_BUILD_INFO = BUILD_INFO

/** „v0.9.0" — pro decentní zobrazení v UI. */
export const APP_VERSION_LABEL = `v${APP_VERSION}`

/** Veřejný název aplikace (zobrazovaný v patičkách, „O aplikaci" apod.). */
export const APP_NAME = BUILD_INFO.productName
