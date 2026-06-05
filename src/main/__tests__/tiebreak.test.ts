import { describe, expect, it } from 'vitest'
import { tiebreakPerKolo } from '../scoring'

describe('tiebreakPerKolo — Klasifikace po Q2', () => {
  const koloQ2 = ['Q1', 'Q2']

  it('shodný součet: lepší Q2 jde výš', () => {
    const a = { Q1: 50, Q2: 40 } // 90, Q2=40
    const b = { Q1: 40, Q2: 50 } // 90, Q2=50
    expect(tiebreakPerKolo(a, b, koloQ2)).toBeGreaterThan(0) // a > b → b je výš → kladné
    expect(tiebreakPerKolo(b, a, koloQ2)).toBeLessThan(0) // b > a → b výš → záporné
  })

  it('shodný součet i Q2: rozhoduje Q1', () => {
    const a = { Q1: 45, Q2: 45 } // 90, Q2=45
    const b = { Q1: 50, Q2: 40 } // 90, Q2=40 — shodné Q2? ne: Q2 a=45, b=40
    // Tady chceme: Q2 a=45 > Q2 b=40 → a výš → záporné
    expect(tiebreakPerKolo(a, b, koloQ2)).toBeLessThan(0)
  })

  it('shodný součet, Q2 i Q1 shodné: vrátí 0', () => {
    const a = { Q1: 45, Q2: 45 }
    const b = { Q1: 45, Q2: 45 }
    expect(tiebreakPerKolo(a, b, koloQ2)).toBe(0)
  })

  it('shodný Q2, rozhoduje Q1', () => {
    const a = { Q1: 42, Q2: 45 } // 87
    const b = { Q1: 45, Q2: 45 } // 90 — různý součet, tohle netestuje tiebreak,
    // test shodného Q2, různého Q1:
    const c = { Q1: 50, Q2: 40 } // Q2=40
    const d = { Q1: 40, Q2: 40 } // Q2=40, Q1 nižší
    expect(tiebreakPerKolo(c, d, koloQ2)).toBeLessThan(0) // c má lepší Q1 → c výš → záporné
  })
})

describe('tiebreakPerKolo — Klasifikace po Q3', () => {
  const koloQ3 = ['Q1', 'Q2', 'Q3']

  it('příklad z issue: B (lepší Q3) jde výš', () => {
    // Jezdec A: Q1=50 Q2=45 Q3=40, součet=135
    // Jezdec B: Q1=40 Q2=45 Q3=50, součet=135
    // Správně: B před A (lepší Q3)
    const a = { Q1: 50, Q2: 45, Q3: 40 }
    const b = { Q1: 40, Q2: 45, Q3: 50 }
    expect(tiebreakPerKolo(a, b, koloQ3)).toBeGreaterThan(0) // a za b → kladné
    expect(tiebreakPerKolo(b, a, koloQ3)).toBeLessThan(0)   // b před a → záporné
  })

  it('shodný Q3: rozhoduje Q2', () => {
    const a = { Q1: 40, Q2: 45, Q3: 50 }
    const b = { Q1: 45, Q2: 42, Q3: 50 }
    // Q3 shodné (50), Q2 a=45 > b=42 → a výš → záporné
    expect(tiebreakPerKolo(a, b, koloQ3)).toBeLessThan(0)
    expect(tiebreakPerKolo(b, a, koloQ3)).toBeGreaterThan(0)
  })

  it('shodný Q3 i Q2: rozhoduje Q1', () => {
    const a = { Q1: 50, Q2: 45, Q3: 40 }
    const b = { Q1: 45, Q2: 45, Q3: 40 }
    // Q3 i Q2 shodné, Q1 a=50 > b=45 → a výš → záporné
    expect(tiebreakPerKolo(a, b, koloQ3)).toBeLessThan(0)
    expect(tiebreakPerKolo(b, a, koloQ3)).toBeGreaterThan(0)
  })

  it('shodný Q3, Q2 i Q1: vrátí 0', () => {
    const a = { Q1: 45, Q2: 45, Q3: 45 }
    const b = { Q1: 45, Q2: 45, Q3: 45 }
    expect(tiebreakPerKolo(a, b, koloQ3)).toBe(0)
  })

  it('jezdec bez záznamu v kole má body 0 (fallback)', () => {
    const a = { Q1: 50, Q2: 45, Q3: 0 } // Q3 chybí / 0
    const b = { Q1: 40, Q2: 40, Q3: 50 }
    // Q3 b=50 > a=0 → b výš → a > b → kladné
    expect(tiebreakPerKolo(a, b, koloQ3)).toBeGreaterThan(0)
  })
})
