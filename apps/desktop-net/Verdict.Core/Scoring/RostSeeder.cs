using Verdict.Core.Model;

namespace Verdict.Core.Scoring;

// Čisté pomocné funkce pro nasazování roštů (§6). Bez databáze.
// Port z src/main/repo.ts (porovnejLos, rovneVelikosti, pocetJizd).
public static class RostSeeder
{
    public const int MaxNaJizdu = 8;

    /// <summary>Sekundární klíč: startovní číslo (chybějící až nakonec) — kvůli determinismu.</summary>
    public static int PorovnejCislo(Jezdec a, Jezdec b) =>
        (a.StCislo ?? int.MaxValue).CompareTo(b.StCislo ?? int.MaxValue);

    /// <summary>
    /// Porovnání podle losu. Jezdci BEZ losu jdou vždy ZA ty s losem; při shodě
    /// (i mezi bezlosými) rozhoduje startovní číslo.
    /// </summary>
    public static int PorovnejLos(Jezdec a, Jezdec b, bool vzestupne)
    {
        if (a.Los is null && b.Los is null) return PorovnejCislo(a, b);
        if (a.Los is null) return 1;
        if (b.Los is null) return -1;
        if (a.Los != b.Los) return vzestupne ? a.Los.Value - b.Los.Value : b.Los.Value - a.Los.Value;
        return PorovnejCislo(a, b);
    }

    /// <summary>
    /// Rovnoměrné velikosti skupin: N jezdců do `h` jízd (zbytek do prvních jízd).
    /// Příklady: 9,2→[5,4] · 17,3→[6,6,5] · 15,3→[5,5,5].
    /// </summary>
    public static int[] RovneVelikosti(int n, int h)
    {
        int baze = n / h;
        int zbytek = n % h;
        var result = new int[h];
        for (int i = 0; i < h; i++)
            result[i] = baze + (i < zbytek ? 1 : 0);
        return result;
    }

    /// <summary>
    /// Výchozí (vyrovnaný) počet jízd: ceil(N/8), ale když by vznikla „nečistá"
    /// jízda s 8 a N není násobek 8, přidá jízdu navíc. (15→3 ⇒ 5+5+5, 16→2 ⇒ 8+8.)
    /// </summary>
    public static int PocetJizd(int n)
    {
        if (n <= MaxNaJizdu) return 1;
        int h = (int)Math.Ceiling(n / (double)MaxNaJizdu);
        if (n % MaxNaJizdu != 0 && (int)Math.Ceiling(n / (double)h) == MaxNaJizdu) h += 1;
        return h;
    }
}
