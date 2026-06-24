// ScoringEngineTests.cs — unit testy bodové logiky (srdce závodu).
// Ověřují 1:1 shodu s scoring.ts. Zlaté hodnoty z CLAUDE.md §4–§5.

using FluentAssertions;
using Verdict.Core.Model;
using Verdict.Core.Scoring;

namespace Verdict.Tests;

public class ScoringEngineTests
{
    // STANDARD žebříček: 1→50, 2→45, 3→42, n→max(0, 44−n)
    private static int Standard(int p) => p switch
    {
        1 => 50, 2 => 45, 3 => 42,
        _ => Math.Max(0, 44 - p)
    };

    // STANDARD penalizace: DNF −1, DNS −5, DQ −10 (offset od posledního místa)
    private static readonly Penalizace StdPen = new(
        DnfOffset: -1, DnsOffset: -5, DqOffset: -10,
        DnfBody: null, DnsBody: null, DqBody: null);

    // ── SpocitejJizdu ─────────────────────────────────────────────────────────

    [Fact]
    public void SpocitejJizdu_PlatneRazeniPodleCasu()
    {
        var vstupy = new JizdaVstup[]
        {
            new(1, 62_000, Stav.OK),
            new(2, 58_000, Stav.OK),
            new(3, 71_000, Stav.OK),
        };

        var out_ = ScoringEngine.SpocitejJizdu(vstupy, Standard, StdPen);

        out_.Should().HaveCount(3);
        out_.Single(v => v.JezdecId == 2).Poradi.Should().Be(1);  // nejrychlejší
        out_.Single(v => v.JezdecId == 2).Body.Should().Be(50);
        out_.Single(v => v.JezdecId == 1).Poradi.Should().Be(2);
        out_.Single(v => v.JezdecId == 1).Body.Should().Be(45);
        out_.Single(v => v.JezdecId == 3).Poradi.Should().Be(3);
        out_.Single(v => v.JezdecId == 3).Body.Should().Be(42);
    }

    [Fact]
    public void SpocitejJizdu_DnfDostavazaDojetymi()
    {
        // 3 jezdci: 2 dojeli, 1 DNF
        // Poslední místo = 3 → body = Standard(3) = 42 → DNF dostane 42 + (−1) = 41
        var vstupy = new JizdaVstup[]
        {
            new(1, 60_000, Stav.OK),
            new(2, 65_000, Stav.OK),
            new(3, null,   Stav.DNF),
        };

        var out_ = ScoringEngine.SpocitejJizdu(vstupy, Standard, StdPen);

        out_.Single(v => v.JezdecId == 1).Poradi.Should().Be(1);
        out_.Single(v => v.JezdecId == 1).Body.Should().Be(50);
        out_.Single(v => v.JezdecId == 2).Poradi.Should().Be(2);
        out_.Single(v => v.JezdecId == 2).Body.Should().Be(45);
        // DNF: pořadí 3, body = Standard(3) + (−1) = 42 − 1 = 41
        out_.Single(v => v.JezdecId == 3).Poradi.Should().Be(3);
        out_.Single(v => v.JezdecId == 3).Body.Should().Be(41);
    }

    [Fact]
    public void SpocitejJizdu_DnsADqZaDojetymi()
    {
        // 4 jezdci: 2 dojeli, 1 DNS, 1 DQ → DNF<DNS<DQ pořadí
        // Poslední místo = 4 → Standard(4) = 40
        // DNS: 40 + (−5) = 35; DQ: 40 + (−10) = 30
        var vstupy = new JizdaVstup[]
        {
            new(1, 60_000, Stav.OK),
            new(2, 70_000, Stav.OK),
            new(3, null,   Stav.DQ),
            new(4, null,   Stav.DNS),
        };

        var out_ = ScoringEngine.SpocitejJizdu(vstupy, Standard, StdPen);

        out_.Single(v => v.JezdecId == 1).Poradi.Should().Be(1);
        out_.Single(v => v.JezdecId == 2).Poradi.Should().Be(2);
        // DNS před DQ (STAV_RANK: DNS=1, DQ=2)
        out_.Single(v => v.JezdecId == 4).Poradi.Should().Be(3);
        out_.Single(v => v.JezdecId == 4).Body.Should().Be(35);
        out_.Single(v => v.JezdecId == 3).Poradi.Should().Be(4);
        out_.Single(v => v.JezdecId == 3).Body.Should().Be(30);
    }

    [Fact]
    public void SpocitejJizdu_CekajiciNemaPoradi()
    {
        // Jezdec OK ale bez času = ještě nezadáno
        var vstupy = new JizdaVstup[]
        {
            new(1, 60_000, Stav.OK),
            new(2, null,   Stav.OK),
        };

        var out_ = ScoringEngine.SpocitejJizdu(vstupy, Standard, StdPen);

        out_.Single(v => v.JezdecId == 1).Poradi.Should().Be(1);
        out_.Single(v => v.JezdecId == 2).Poradi.Should().BeNull();
        out_.Single(v => v.JezdecId == 2).Body.Should().BeNull();
    }

    [Fact]
    public void SpocitejJizdu_VsichniDnfBodovaniOdPoctu()
    {
        // 5 jezdců, všichni DNF → poslední místo = 5 → Standard(5) = 39 → DNF = 38
        var vstupy = Enumerable.Range(1, 5)
            .Select(i => new JizdaVstup(i, null, Stav.DNF))
            .ToArray();

        var out_ = ScoringEngine.SpocitejJizdu(vstupy, Standard, StdPen);

        out_.Should().AllSatisfy(v => v.Body.Should().Be(38));
    }

    [Fact]
    public void SpocitejJizdu_JedenJezdec_Prvni50()
    {
        var vstupy = new JizdaVstup[] { new(1, 50_000, Stav.OK) };
        var out_ = ScoringEngine.SpocitejJizdu(vstupy, Standard, StdPen);
        out_.Single().Poradi.Should().Be(1);
        out_.Single().Body.Should().Be(50);
    }

    [Fact]
    public void SpocitejJizdu_ZebricekPrechaziNaNulu()
    {
        // Standard(44) = max(0, 44−44) = 0; Standard(45) = max(0, 44−45) = 0
        Standard(44).Should().Be(0);
        Standard(45).Should().Be(0);
        Standard(100).Should().Be(0);
    }

    [Fact]
    public void SpocitejJizdu_DnfNegativniBodySeMohouStat()
    {
        // 1 jezdec DNF: poslední = 1 → Standard(1) = 50 → DNF = 50−1 = 49
        var vstupy = new JizdaVstup[] { new(1, null, Stav.DNF) };
        var out_ = ScoringEngine.SpocitejJizdu(vstupy, Standard, StdPen);
        out_.Single().Body.Should().Be(49);
    }

    // ── TiebreakPerKolo ───────────────────────────────────────────────────────

    [Fact]
    public void Tiebreak_PozdejiRozhodujeQkolo()
    {
        // a má víc bodů v Q3, b má víc v Q2 → a výš (pozdější kolo rozhoduje)
        var a = new Dictionary<string, int> { ["Q1"] = 40, ["Q2"] = 45, ["Q3"] = 50 };
        var b = new Dictionary<string, int> { ["Q1"] = 40, ["Q2"] = 50, ["Q3"] = 45 };

        int cmp = ScoringEngine.TiebreakPerKolo(a, b, ["Q1", "Q2", "Q3"]);
        cmp.Should().BeNegative(); // a > b → záporné
    }

    [Fact]
    public void Tiebreak_ShodaVratíNulu()
    {
        var a = new Dictionary<string, int> { ["Q1"] = 40, ["Q2"] = 45, ["Q3"] = 50 };
        var b = new Dictionary<string, int>(a);
        ScoringEngine.TiebreakPerKolo(a, b, ["Q1", "Q2", "Q3"]).Should().Be(0);
    }

    [Fact]
    public void Tiebreak_ChybejiciKoloJePovazovanoZaNulu()
    {
        var a = new Dictionary<string, int> { ["Q1"] = 0, ["Q2"] = 0 };
        var b = new Dictionary<string, int> { ["Q1"] = 0 };
        // Q2: a=0, b=0 (chybí) → shoda → Q1: 0 vs 0 → 0
        ScoringEngine.TiebreakPerKolo(a, b, ["Q1", "Q2"]).Should().Be(0);
    }

    // ── AplikujRucniPoradi ────────────────────────────────────────────────────

    [Fact]
    public void AplikujRucniPoradi_PrazdnaMapaVraciOriginal()
    {
        var vysl = new JizdaVypocet[]
        {
            new(1, 1, 50),
            new(2, 2, 45),
        };

        var out_ = ScoringEngine.AplikujRucniPoradi(
            vysl,
            new Dictionary<int, Stav>    { [1] = Stav.OK, [2] = Stav.OK },
            new Dictionary<int, int?>    { [1] = 60_000,  [2] = 65_000  },
            new Dictionary<int, int>(),
            Standard, StdPen);

        out_.Should().BeEquivalentTo(vysl);
    }

    [Fact]
    public void AplikujRucniPoradi_PosunJezdce()
    {
        // Jezdci: 1. místo, 2. místo, 3. místo → posuneme jezdce #1 na 3. místo
        var vysl = new JizdaVypocet[]
        {
            new(1, 1, 50),
            new(2, 2, 45),
            new(3, 3, 42),
        };
        var stav = new Dictionary<int, Stav>    { [1] = Stav.OK, [2] = Stav.OK, [3] = Stav.OK };
        var cas  = new Dictionary<int, int?>    { [1] = 50_000,  [2] = 60_000,  [3] = 70_000 };
        var rucni = new Dictionary<int, int>    { [1] = 3 };  // jezdec #1 na 3. místo

        var out_ = ScoringEngine.AplikujRucniPoradi(vysl, stav, cas, rucni, Standard, StdPen);

        // Lineup po přesunu: [2, 3, 1]
        out_.Single(v => v.JezdecId == 2).Poradi.Should().Be(1);
        out_.Single(v => v.JezdecId == 2).Body.Should().Be(50);
        out_.Single(v => v.JezdecId == 3).Poradi.Should().Be(2);
        out_.Single(v => v.JezdecId == 3).Body.Should().Be(45);
        out_.Single(v => v.JezdecId == 1).Poradi.Should().Be(3);
        out_.Single(v => v.JezdecId == 1).Body.Should().Be(42);
    }

    [Fact]
    public void AplikujRucniPoradi_DnfZustavaPenalizovan()
    {
        // 3 jezdci: #1 OK 1., #2 OK 2., #3 DNF 3.
        // Posuneme #3 (DNF) na 2. místo → stále dostane penalizační body (DNF logika)
        // Poslední místo = 3 → Standard(3) = 42 → DNF = 41
        var vysl = new JizdaVypocet[]
        {
            new(1, 1, 50),
            new(2, 2, 45),
            new(3, 3, 41),  // DNF
        };
        var stav = new Dictionary<int, Stav> { [1] = Stav.OK, [2] = Stav.OK, [3] = Stav.DNF };
        var cas  = new Dictionary<int, int?> { [1] = 50_000, [2] = 60_000, [3] = null };
        var rucni = new Dictionary<int, int> { [3] = 2 };

        var out_ = ScoringEngine.AplikujRucniPoradi(vysl, stav, cas, rucni, Standard, StdPen);

        // Lineup: [1, 3, 2]
        out_.Single(v => v.JezdecId == 1).Poradi.Should().Be(1);
        out_.Single(v => v.JezdecId == 1).Body.Should().Be(50);  // okRank=1
        out_.Single(v => v.JezdecId == 3).Poradi.Should().Be(2);
        out_.Single(v => v.JezdecId == 3).Body.Should().Be(41);  // DNF penalizace
        out_.Single(v => v.JezdecId == 2).Poradi.Should().Be(3);
        out_.Single(v => v.JezdecId == 2).Body.Should().Be(45);  // okRank=2
    }
}
