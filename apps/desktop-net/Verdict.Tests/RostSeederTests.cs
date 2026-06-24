// RostSeederTests.cs — pomocná matematika nasazování roštů (§6).
// Port pravidel z repo.ts (rovneVelikosti, pocetJizd, porovnejLos).

using FluentAssertions;
using Verdict.Core.Model;
using Verdict.Core.Scoring;

namespace Verdict.Tests;

public class RostSeederTests
{
    private static Jezdec J(int id, int? los, int? cislo) =>
        new(id, 1, cislo, "", "", "", "", null, los);

    // ── RovneVelikosti ────────────────────────────────────────────────────────

    [Fact]
    public void RovneVelikosti_ZbytekDoPrvnichJizd()
    {
        RostSeeder.RovneVelikosti(9, 2).Should().Equal(5, 4);
        RostSeeder.RovneVelikosti(17, 3).Should().Equal(6, 6, 5);
        RostSeeder.RovneVelikosti(15, 3).Should().Equal(5, 5, 5);
    }

    // ── PocetJizd — strop 8, ale bez „nečisté" osmičky (§6) ───────────────────

    [Theory]
    [InlineData(1, 1)]
    [InlineData(8, 1)]
    [InlineData(15, 3)]  // 5+5+5, ne 8+7
    [InlineData(16, 2)]  // 8+8 je čisté
    [InlineData(9, 2)]
    public void PocetJizd(int n, int ocekavano)
    {
        RostSeeder.PocetJizd(n).Should().Be(ocekavano);
    }

    // ── PorovnejLos — bez losu nakonec, tiebreak číslem ───────────────────────

    [Fact]
    public void PorovnejLos_VzestupneDleLosu()
    {
        RostSeeder.PorovnejLos(J(1, 3, 10), J(2, 5, 20), true).Should().BeNegative();
        RostSeeder.PorovnejLos(J(1, 5, 10), J(2, 3, 20), true).Should().BePositive();
    }

    [Fact]
    public void PorovnejLos_BezLosuJdeNakonec()
    {
        RostSeeder.PorovnejLos(J(1, null, 10), J(2, 99, 20), true).Should().BePositive();
        RostSeeder.PorovnejLos(J(1, 99, 10), J(2, null, 20), true).Should().BeNegative();
    }

    [Fact]
    public void PorovnejLos_ShodnyLos_RozhodujeCislo()
    {
        RostSeeder.PorovnejLos(J(1, 5, 10), J(2, 5, 20), true).Should().BeNegative();
    }

    [Fact]
    public void PorovnejLos_ObaBezLosu_RozhodujeCislo()
    {
        RostSeeder.PorovnejLos(J(1, null, 30), J(2, null, 10), true).Should().BePositive();
    }
}
