import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Verze aplikace = jediný zdroj pravdy v package.json. Načteme ji při buildu
// a injektneme jako globální konstantu __APP_VERSION__, kterou UI jen přečte.
// Když zvýšíme `version` v package.json, projeví se to všude bez další editace.
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as {
  version: string
}
const APP_VERSION_DEFINE = {
  __APP_VERSION__: JSON.stringify(pkg.version)
}

// Tři build cíle: hlavní proces (Node), preload most a okno (React).
// `externalizeDepsPlugin` nechá nativní/Node moduly (např. better-sqlite3)
// mimo bundle — musí se načítat jako reálné soubory v Node prostředí.
export default defineConfig({
  main: {
    define: APP_VERSION_DEFINE,
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    define: APP_VERSION_DEFINE,
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    define: APP_VERSION_DEFINE,
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react({ babel: { plugins: ['babel-plugin-react-compiler'] } }), tailwindcss()]
  }
})
