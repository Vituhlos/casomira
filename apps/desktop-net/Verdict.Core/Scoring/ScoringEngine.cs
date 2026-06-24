using Verdict.Core.Model;

namespace Verdict.Core.Scoring;

public record JizdaVstup(int JezdecId, int? CasMs, Stav Stav);

public record JizdaVypocet(int JezdecId, int? Poradi, int? Body);

// Offset od bodů za poslední místo (STANDARD: DNF −1, DNS −5, DQ −10),
// nebo pevné body — záleží na tom, zda je příslušný offset null.
public record Penalizace(
    int? DnfOffset,
    int? DnsOffset,
    int? DqOffset,
    int? DnfBody,
    int? DnsBody,
    int? DqBody);

public static class ScoringEngine
{
    // DNF < DNS < DQ (nejhorší pořadí); OK = 3, vždy řadí dojezdivší první
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

    /// <summary>Pořadí a body pro jednu jízdu; nejrychlejší = 1., nedojezdivší za nimi.</summary>
    public static List<JizdaVypocet> SpocitejJizdu(
        IReadOnlyList<JizdaVstup> vstupy,
        Func<int, int> bodyZaPozici,
        Penalizace penalizace)
    {
        var dojeli = vstupy
            .Where(v => v.Stav == Stav.OK && v.CasMs is not null)
            .OrderBy(v => v.CasMs)
            .ToList();

        // Základ penalizace = body za POSLEDNÍ místo (počet jezdců v jízdě, ne jen dojezdivší)
        int bodyZaPosledni = bodyZaPozici(Math.Max(1, vstupy.Count));

        // DNF/DNS/DQ → za platné časy, seřazeni dle StavRank, pak jezdec_id jako tiebreak
        var nedojeli = vstupy
            .Where(v => v.Stav != Stav.OK)
            .OrderBy(v => StavRank[v.Stav])
            .ThenBy(v => v.JezdecId)
            .ToList();

        // OK bez času = čas ještě nebyl zadán → bez pořadí a bodů
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

    /// <summary>Tiebreak: při shodě bodů rozhoduje pozdější kolo (Q3 > Q2 > Q1). Záporné = a výš.</summary>
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
    /// Přeřadí dle rucni_poradi; OK jezdci dostanou tělu z nové pozice v pořadí,
    /// DNF/DNS/DQ stále dostávají penalizaci od posledního místa.
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
