using Verdict.Core.Model;

namespace Verdict.Desktop.ViewModels;

/// <summary>Presentation data for one race card on the race-management screen.</summary>
public sealed class RaceCardViewModel
{
    public RaceCardViewModel(ZavodInfo zavod) => Zavod = zavod;

    public ZavodInfo Zavod { get; }
    public string Nazev => Zavod.Nazev;
    public string TypText => Zavod.Typ == RaceType.RAC ? "RAC RACE" : "RX CUP";
    public string DatumAMisto => string.IsNullOrWhiteSpace(Zavod.Misto)
        ? Zavod.Datum
        : $"{Zavod.Datum} · {Zavod.Misto}";
    public string KategorieText => PocetText(Zavod.PocetKategorii, "kategorie", "kategorií");
    public string JezdciText => PocetText(Zavod.PocetJezdcu, "jezdec", "jezdců");

    private static string PocetText(int pocet, string jednotneCislo, string mnozneCislo) =>
        pocet == 1 ? $"1 {jednotneCislo}" : $"{pocet} {mnozneCislo}";
}
