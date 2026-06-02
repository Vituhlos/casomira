import { useEffect, useRef } from 'react'

// Globální klávesové zkratky hlavního okna. Jeden posluchač na `window`, který
// volá předané akce. Pravidla:
//   • Holé klávesy (R, V, ?, Alt+šipky) NEFUNGUJÍ, když uživatel píše do pole
//     (input/textarea/select/contenteditable) — ať nezasahují do psaní.
//   • Kombinace s modifikátorem (⌘/Ctrl) fungují vždy (negenerují text).
//   • Modifikátor je platformový: na macOS ⌘ (metaKey), jinde Ctrl (ctrlKey).

export interface HotkeyHandlers {
  /** Když false, žádná zkratka se neodpálí (mimo závod / otevřený dialog). */
  enabled: boolean
  isMac: boolean
  onPrevPhase: () => void
  onNextPhase: () => void
  /** i = index fáze (0-based). */
  onPhaseIndex: (i: number) => void
  onRost: () => void
  onVysledky: () => void
  onPdf: () => void
  onPdfSaveAs: () => void
  onStopky: () => void
  onGenerateRost: () => void
  onToggleHelp: () => void
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function useHotkeys(handlers: HotkeyHandlers): void {
  // Ref drží vždy nejnovější callbacky → posluchač registrujeme jen jednou.
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const h = ref.current
      if (!h.enabled) return

      const mod = h.isMac ? e.metaKey : e.ctrlKey
      const opacnyMod = h.isMac ? e.ctrlKey : e.metaKey // druhý modifikátor → nezachytávat
      const typing = isTypingTarget(e.target)

      // Nápověda: ? (Shift+/) nebo ⌘/Ctrl+/.
      if (e.key === '?' || (mod && e.key === '/')) {
        if (e.key === '?' && typing) return // ? při psaní nech projít
        e.preventDefault()
        h.onToggleHelp()
        return
      }

      // Kombinace s modifikátorem (fungují i při psaní — negenerují text).
      if (mod && !e.altKey && !opacnyMod) {
        // ⌘/Ctrl + P (Shift = uložit jako). preventDefault zruší tisk prohlížeče.
        if (e.key.toLowerCase() === 'p') {
          e.preventDefault()
          if (e.shiftKey) h.onPdfSaveAs()
          else h.onPdf()
          return
        }
        if (e.shiftKey) return // ostatní Shift+mod nechytat
        // ⌘/Ctrl + 1..9 → skok na fázi
        if (e.code >= 'Digit1' && e.code <= 'Digit9') {
          e.preventDefault()
          h.onPhaseIndex(Number(e.code.slice(-1)) - 1)
          return
        }
        if (e.key.toLowerCase() === 't') {
          e.preventDefault()
          h.onStopky()
          return
        }
        if (e.key.toLowerCase() === 'g') {
          e.preventDefault()
          h.onGenerateRost()
          return
        }
        return
      }

      // Dále už jen zkratky bez ⌘/Ctrl — ty při psaní do pole ignorujeme.
      if (typing || mod || opacnyMod) return

      // Alt + ← / → → předchozí / další fáze.
      if (e.altKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          h.onPrevPhase()
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          h.onNextPhase()
        }
        return
      }

      // Holé klávesy R / V → přepínač Rošt / Výsledky.
      if (!e.shiftKey) {
        if (e.key.toLowerCase() === 'r') {
          e.preventDefault()
          h.onRost()
        } else if (e.key.toLowerCase() === 'v') {
          e.preventDefault()
          h.onVysledky()
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
