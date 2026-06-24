// RaceDefaultsTests.cs — výchozí kategorie dle typu závodu.
// Port pravidla z raceDefaults.ts + CLAUDE.md §3 (RX nemá Šotolinu).

using FluentAssertions;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Tests;

public class RaceDefaultsTests
{
    [Fact]
    public void Rac_NabidkaObsahujeSotolinu_AleNeniPredvybrana()
    {
        RaceDefaults.Nabidka(RaceType.RAC).Should().Contain("Šotolina");
        RaceDefaults.Vychozi(RaceType.RAC).Should().NotContain("Šotolina");
    }

    [Fact]
    public void Rx_NemaSotolinu()
    {
        RaceDefaults.Nabidka(RaceType.RX).Should().NotContain("Šotolina");
        RaceDefaults.Vychozi(RaceType.RX).Should().NotContain("Šotolina");
    }

    [Fact]
    public void Rx_MaSveSpecifickeKategorie()
    {
        RaceDefaults.Vychozi(RaceType.RX).Should().Contain(["DX", "S4x4"]);
    }
}
