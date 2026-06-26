using Verdict.Core.Model;

namespace Verdict.Desktop.ViewModels;

public class KlasifikaceRadekViewModel : ViewModelBase
{
    private readonly IReadOnlyDictionary<string, int> _perKolo;

    public int    Poradi    { get; }
    public int?   StCislo   { get; }
    public string Prijmeni  { get; }
    public string Jmeno     { get; }
    public int    Celkem    { get; }

    // Medal helpers
    public bool JeZlato   => Poradi == 1;
    public bool JeStribro => Poradi == 2;
    public bool JeBronz   => Poradi == 3;

    /// <summary>Body za dané kolo (Q1/Q2/Q3) pro binding sloupců; prázdné když jezdec v kole nejel.</summary>
    public string this[string koloTyp] =>
        _perKolo.TryGetValue(koloTyp, out int b) ? b.ToString() : "";

    public KlasifikaceRadekViewModel(KlasifikaceRadek r)
    {
        Poradi   = r.Poradi;
        StCislo  = r.StCislo;
        Prijmeni = r.Prijmeni;
        Jmeno    = r.Jmeno;
        Celkem   = r.Celkem;
        _perKolo = r.PerKolo;
    }
}
