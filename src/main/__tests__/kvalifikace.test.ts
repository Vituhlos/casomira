import { describe, expect, it } from 'vitest'
import { jeKvalifikovan } from '../zaver'

// Tabulka testovacích scénářů z issue 004.
// dokoncil = počet Q jízd se stavem OK + čas
// odstartoval = počet Q jízd se stavem OK nebo DNF (bez DNS/DQ)

describe('jeKvalifikovan', () => {
  it('OK + DNF + DNS → kvalifikován (1 dokončeno, 2 nastoupeno)', () => {
    expect(jeKvalifikovan(1, 2)).toBe(true)
  })

  it('OK + DNS + DNS → nekvalifikován (jen 1 nastoupeno)', () => {
    expect(jeKvalifikovan(1, 1)).toBe(false)
  })

  it('OK + DQ + DNS → nekvalifikován (DQ nepočítá jako nastoupení)', () => {
    // DQ → odstartoval = 1 (jen OK)
    expect(jeKvalifikovan(1, 1)).toBe(false)
  })

  it('DNF + DNF + DNS → nekvalifikován (0 dokončeno)', () => {
    expect(jeKvalifikovan(0, 2)).toBe(false)
  })

  it('OK + OK + DNS → kvalifikován (1 dokončeno, 2 nastoupeno)', () => {
    expect(jeKvalifikovan(1, 2)).toBe(true)
  })

  it('OK + DNF + DQ → kvalifikován (DQ nepočítá, ale OK+DNF = 2 nastoupeno)', () => {
    expect(jeKvalifikovan(1, 2)).toBe(true)
  })

  it('OK + OK + OK → kvalifikován (3 nastoupeno)', () => {
    expect(jeKvalifikovan(3, 3)).toBe(true)
  })

  it('DNS + DNS + DNS → nekvalifikován (0 nastoupeno)', () => {
    expect(jeKvalifikovan(0, 0)).toBe(false)
  })
})
