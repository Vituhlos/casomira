// ZaverEngineTests.cs — logika závěru závodu (kvalifikace, nasazení SF/F, celkově).
// Port z src/main/__tests__/kvalifikace.test.ts + scénáře z CLAUDE.md §8–§9.

using FluentAssertions;
using Verdict.Core.Scoring;

namespace Verdict.Tests;

public class ZaverEngineTests
{
    // ── jeKvalifikovan (issue 004) ────────────────────────────────────────────

    [Theory]
    [InlineData(1, 2, true)]   // OK + DNF + DNS → 1 dokončeno, 2 nastoupeno
    [InlineData(1, 1, false)]  // OK + DNS + DNS → jen 1 nastoupeno
    [InlineData(0, 2, false)]  // DNF + DNF + DNS → 0 dokončeno
    [InlineData(3, 3, true)]   // OK + OK + OK
    [InlineData(0, 0, false)]  // DNS + DNS + DNS
    public void JeKvalifikovan(int dokoncil, int odstartoval, bool ocekavano)
    {
        ZaverEngine.JeKvalifikovan(dokoncil, odstartoval).Should().Be(ocekavano);
    }

    // ── NasazSF — liché do 1. jízdy, sudé do 2. (§8) ──────────────────────────

    [Fact]
    public void NasazSF_LicheSude()
    {
        var poradi = new[] { 10, 20, 30, 40, 50, 60 };
        var (h1, h2) = ZaverEngine.NasazSF(poradi);
        h1.Should().Equal(10, 30, 50);  // 1., 3., 5.
        h2.Should().Equal(20, 40, 60);  // 2., 4., 6.
    }

    [Fact]
    public void NasazSF_Max16()
    {
        var poradi = Enumerable.Range(1, 20).ToArray();
        var (h1, h2) = ZaverEngine.NasazSF(poradi);
        (h1.Count + h2.Count).Should().Be(16);
        h1.Should().HaveCount(8);
        h2.Should().HaveCount(8);
    }

    // ── NasazFinaleZeSF — párování dle bodů po Q3 (§8) ────────────────────────

    [Fact]
    public void NasazFinale_DvojiceDleBoduQ3()
    {
        var postup1 = new[] { 1, 3 };  // vítěz + 2. z SF1
        var postup2 = new[] { 2, 4 };  // vítěz + 2. z SF2
        var bodyQ3 = new Dictionary<int, int> { [1] = 50, [2] = 45, [3] = 40, [4] = 42 };

        // dvojice (1,2): 50 ≥ 45 → 1 první; dvojice (3,4): 40 < 42 → 4 první
        var finale = ZaverEngine.NasazFinaleZeSF(postup1, postup2, bodyQ3);
        finale.Should().Equal(1, 2, 4, 3);
    }

    [Fact]
    public void NasazFinale_NestejnyPocet()
    {
        var finale = ZaverEngine.NasazFinaleZeSF([1], [2, 3],
            new Dictionary<int, int> { [1] = 50, [2] = 45, [3] = 40 });
        finale.Should().Equal(1, 2, 3);
    }

    // ── CelkovePoradi — řídí finále, nesčítá body (§9) ────────────────────────

    [Fact]
    public void CelkovePoradi_FinaleNejdriv_PakSF_PakZbytek()
    {
        var vstupy = new[]
        {
            new CelkovyVstup(100, Pq: 1, Psf: 1, Pf: 2, Bq: 135),  // finalista (2. ve F)
            new CelkovyVstup(101, Pq: 2, Psf: 2, Pf: 1, Bq: 130),  // finalista (1. ve F)
            new CelkovyVstup(102, Pq: 3, Psf: 5, Pf: null, Bq: 120), // SF nepostoupil
            new CelkovyVstup(103, Pq: 4, Psf: null, Pf: null, Bq: 100), // jen kvalifikace
        };

        var poradi = ZaverEngine.CelkovePoradi(vstupy);
        // finalisté dle Pf (101 před 100), pak SF (102), pak zbytek (103)
        poradi.Should().Equal(101, 100, 102, 103);
    }

    [Fact]
    public void CelkovePoradi_SfTiebreakDleBoduQ3()
    {
        var vstupy = new[]
        {
            new CelkovyVstup(1, Pq: 1, Psf: 3, Pf: null, Bq: 90),
            new CelkovyVstup(2, Pq: 2, Psf: 3, Pf: null, Bq: 95),  // stejné Psf, víc Bq → výš
        };
        ZaverEngine.CelkovePoradi(vstupy).Should().Equal(2, 1);
    }
}
