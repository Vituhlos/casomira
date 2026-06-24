// ScoringEngine.cs — BODOVÁ LOGIKA (srdce závodu). Čistá funkce, žádná databáze.
// Port z src/main/scoring.ts — 1:1. Viz CLAUDE.md §4–§5.

using Verdict.Core.Model;

namespace Verdict.Core.Scoring;

/// <summary>Jeden jezdec vstupující do výpočtu jízdy.</summary>
public record JizdaVstup(int JezdecId, int? CasMs, Stav Stav);

/// <summary>Výsledek výpočtu pro jednoho jezdce v jízdě.</summary>
public record JizdaVypocet(int JezdecId, int? Poradi, int? Body);

/// <summary>
/// Penalizační pravidla dle rulesetu (CLAUDE.md §5).
/// STANDARD: offset od bodů za POSLEDNÍ místo (DNF −1, DNS −5, DQ −10).
/// Pevné body (dnf_body/dns_body/dq_body) se použijí, pokud offset je null.
/// </summary>
public record Penalizace(
    int? DnfOffset,
    int? DnsOffset,
    int? DqOffset,
    int? DnfBody,
    int? DnsBody,
    int? DqBody);

public static class ScoringEngine
{
    // Pořadí nedojezdů mezi sebou (za platné časy): DNF, pak DNS, pak DQ.
    // CLAUDE.md §5 + scoring.ts: STAV_RANK = { OK:3, DNF:0, DNS:1, DQ:2 }
    private static readonly Dictionary<Stav, int> StavRank = new()
    {
        [Stav.OK]  = 3,
        [Stav.DNF] = 0,
        [Stav.DNS] = 1,
        [Stav.DQ]  = 2,
    };

    private static int PenalizacniBody(Stav stav, int bodyZaPosledni, Penalizace p) => stav switch
    {
        Stav.DNF => p.DnfOffset is not null ? bodyZaPosledni + p.DnfOffset.Value : (p.DnfBody ?? 0),
        Stav.DNS => p.DnsOffset is not null ? bodyZaPosledni + p.DnsOffset.Value : (p.DnsBody ?? 0),
        Stav.DQ  => p.DqOffset  is not null ? bodyZaPosledni + p.DqOffset.Value  : (p.DqBody  ?? 0),
        _        => 0,
    };

    /// <summary>
    /// Spočítá pořadí a body pro JEDNU jízdu.
    /// </summary>
    /// <param name="vstupy">Všichni jezdci přiřazení do jízdy.</param>
    /// <param name="bodyZaPozici">Žebříček: pozice (1..) → body (z tabulky zebricek).</param>
    /// <param name="penalizace">Pravidla pro DNF/DNS/DQ (z tabulky pravidla).</param>
    public static List<JizdaVypocet> SpocitejJizdu(
        IReadOnlyList<JizdaVstup> vstupy,
        Func<int, int> bodyZaPozici,
        Penalizace penalizace)
    {
        // Dokončili s platným časem → řadí se podle času (nejrychlejší = 1.).
        var dojeli = vstupy
            .Where(v => v.Stav == Stav.OK && v.CasMs is not null)
            .OrderBy(v => v.CasMs)
            .ToList();

        // Základ pro penalizace = body za POSLEDNÍ místo (§5: celkový počet jezdců v jízdě).
        int bodyZaPosledni = bodyZaPozici(Math.Max(1, vstupy.Count));

        // DNF/DNS/DQ → řadí se ZA platné časy. Pořadí: DNF < DNS < DQ (dle StavRank).
        var nedojeli = vstupy
            .Where(v => v.Stav != Stav.OK)
            .OrderBy(v => StavRank[v.Stav])
            .ThenBy(v => v.JezdecId)
            .ToList();

        // OK bez zadaného času = zatím nezadáno → bez pořadí a bodů.
        var cekajici = vstupy
            .Where(v => v.Stav == Stav.OK && v.CasMs is null)
            .ToList();

        var out_ = new List<JizdaVypocet>();
        int poradi = 0;

        foreach (var v in dojeli)
        {
            poradi++;
            out_.Add(new JizdaVypocet(v.JezdecId, poradi, bodyZaPozici(poradi)));
        }
        foreach (var v in nedojeli)
        {
            poradi++;
            out_.Add(new JizdaVypocet(v.JezdecId, poradi, PenalizacniBody(v.Stav, bodyZaPosledni, penalizace)));
        }
        foreach (var v in cekajici)
        {
            out_.Add(new JizdaVypocet(v.JezdecId, null, null));
        }

        return out_;
    }

    /// <summary>
    /// STANDARD tiebreak pro klasifikaci (CLAUDE.md §7): při shodě celkových bodů
    /// rozhoduje poslední uvedené kolo, pak předposlední atd.
    /// Vrací záporné číslo pokud a > b (a má být výš), kladné pokud b > a.
    /// </summary>
    public static int TiebreakPerKolo(
        IReadOnlyDictionary<string, int> a,
        IReadOnlyDictionary<string, int> b,
        IReadOnlyList<string> koloTypy)
    {
        for (int i = koloTypy.Count - 1; i >= 0; i--)
        {
            int av = a.TryGetValue(koloTypy[i], out int aval) ? aval : 0;
            int bv = b.TryGetValue(koloTypy[i], out int bval) ? bval : 0;
            if (av != bv) return bv - av;
        }
        return 0;
    }

    /// <summary>
    /// Přepočte pořadí po ručním posunu (rucni_poradi) — ostatní jezdci se posunou,
    /// body dojetých z žebříčku dle nového pořadí OK; DNF/DNS/DQ penalizace od posledního.
    /// </summary>
    public static List<JizdaVypocet> AplikujRucniPoradi(
        IReadOnlyList<JizdaVypocet> vysl,
        IReadOnlyDictionary<int, Stav> stavByJezdec,
        IReadOnlyDictionary<int, int?> casByJezdec,
        IReadOnlyDictionary<int, int> rucniPoradi,
        Func<int, int> bodyZaPozici,
        Penalizace penalizace)
    {
        if (rucniPoradi.Count == 0) return [..vysl];

        var ranked = vysl
            .Where(v => v.Poradi is not null)
            .OrderBy(v => v.Poradi)
            .ToList();
        var waiting = vysl
            .Where(v => v.Poradi is null)
            .ToList();

        var lineup = ranked.Select(v => v.JezdecId).ToList();

        var manuals = rucniPoradi.OrderBy(kv => kv.Value);
        foreach (var (jezdecId, target) in manuals)
        {
            int idx = lineup.IndexOf(jezdecId);
            if (idx == -1) continue;
            lineup.RemoveAt(idx);
            int insertAt = Math.Max(0, Math.Min(target - 1, lineup.Count));
            lineup.Insert(insertAt, jezdecId);
        }

        int bodyZaPosledni = bodyZaPozici(Math.Max(1, vysl.Count));

        var out_ = new List<JizdaVypocet>();
        int okRank = 0;
        for (int i = 0; i < lineup.Count; i++)
        {
            int jezdecId = lineup[i];
            int poradiPos = i + 1;
            var stav = stavByJezdec.TryGetValue(jezdecId, out Stav s) ? s : Stav.OK;
            var cas = casByJezdec.TryGetValue(jezdecId, out int? c) ? c : null;
            int body;
            if (stav == Stav.OK && cas is not null)
            {
                okRank++;
                body = bodyZaPozici(okRank);
            }
            else if (stav != Stav.OK)
            {
                body = PenalizacniBody(stav, bodyZaPosledni, penalizace);
            }
            else
            {
                body = 0;
            }
            out_.Add(new JizdaVypocet(jezdecId, poradiPos, body));
        }

        out_.AddRange(waiting);
        return out_;
    }
}
