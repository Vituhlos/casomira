// TiebreakTests.cs — tiebreak klasifikace (Q3 → Q2 → Q1).
// Port z src/main/__tests__/tiebreak.test.ts. CLAUDE.md §7.

using FluentAssertions;
using Verdict.Core.Scoring;

namespace Verdict.Tests;

public class TiebreakTests
{
    private static int Tb(Dictionary<string, int> a, Dictionary<string, int> b, string[] kola) =>
        ScoringEngine.TiebreakPerKolo(a, b, kola);

    // ── Klasifikace po Q2 (Q1, Q2) ────────────────────────────────────────────

    private static readonly string[] Q2 = ["Q1", "Q2"];

    [Fact]
    public void Q2_ShodnySoucet_LepsiQ2JdeVys()
    {
        var a = new Dictionary<string, int> { ["Q1"] = 50, ["Q2"] = 40 }; // 90, Q2=40
        var b = new Dictionary<string, int> { ["Q1"] = 40, ["Q2"] = 50 }; // 90, Q2=50
        Tb(a, b, Q2).Should().BePositive();   // b výš
        Tb(b, a, Q2).Should().BeNegative();
    }

    [Fact]
    public void Q2_ShodnyQ2_RozhodujeQ1()
    {
        var c = new Dictionary<string, int> { ["Q1"] = 50, ["Q2"] = 40 };
        var d = new Dictionary<string, int> { ["Q1"] = 40, ["Q2"] = 40 };
        Tb(c, d, Q2).Should().BeNegative();   // c má lepší Q1 → c výš
    }

    [Fact]
    public void Q2_VseShodne_Nula()
    {
        var a = new Dictionary<string, int> { ["Q1"] = 45, ["Q2"] = 45 };
        var b = new Dictionary<string, int> { ["Q1"] = 45, ["Q2"] = 45 };
        Tb(a, b, Q2).Should().Be(0);
    }

    // ── Klasifikace po Q3 (Q1, Q2, Q3) ────────────────────────────────────────

    private static readonly string[] Q3 = ["Q1", "Q2", "Q3"];

    [Fact]
    public void Q3_ShodnySoucet_LepsiQ3JdeVys()
    {
        var a = new Dictionary<string, int> { ["Q1"] = 50, ["Q2"] = 45, ["Q3"] = 40 }; // 135
        var b = new Dictionary<string, int> { ["Q1"] = 40, ["Q2"] = 45, ["Q3"] = 50 }; // 135
        Tb(a, b, Q3).Should().BePositive();   // b (lepší Q3) výš
        Tb(b, a, Q3).Should().BeNegative();
    }

    [Fact]
    public void Q3_ShodnyQ3_RozhodujeQ2()
    {
        var a = new Dictionary<string, int> { ["Q1"] = 40, ["Q2"] = 45, ["Q3"] = 50 };
        var b = new Dictionary<string, int> { ["Q1"] = 45, ["Q2"] = 42, ["Q3"] = 50 };
        Tb(a, b, Q3).Should().BeNegative();   // a má lepší Q2 → a výš
        Tb(b, a, Q3).Should().BePositive();
    }

    [Fact]
    public void Q3_ShodnyQ3Q2_RozhodujeQ1()
    {
        var a = new Dictionary<string, int> { ["Q1"] = 50, ["Q2"] = 45, ["Q3"] = 40 };
        var b = new Dictionary<string, int> { ["Q1"] = 45, ["Q2"] = 45, ["Q3"] = 40 };
        Tb(a, b, Q3).Should().BeNegative();   // a má lepší Q1 → a výš
        Tb(b, a, Q3).Should().BePositive();
    }

    [Fact]
    public void Q3_VseShodne_Nula()
    {
        var a = new Dictionary<string, int> { ["Q1"] = 45, ["Q2"] = 45, ["Q3"] = 45 };
        var b = new Dictionary<string, int> { ["Q1"] = 45, ["Q2"] = 45, ["Q3"] = 45 };
        Tb(a, b, Q3).Should().Be(0);
    }

    [Fact]
    public void Q3_ChybejiciKolo_BereSeJako0()
    {
        var a = new Dictionary<string, int> { ["Q1"] = 50, ["Q2"] = 45 };            // Q3 chybí
        var b = new Dictionary<string, int> { ["Q1"] = 40, ["Q2"] = 40, ["Q3"] = 50 };
        Tb(a, b, Q3).Should().BePositive();   // b má Q3=50 > a Q3=0 → b výš
    }
}
