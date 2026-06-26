using Verdict.Core.Model;

namespace Verdict.Desktop.ViewModels;

public class CelkoveRadekViewModel : ViewModelBase
{
    public int    Poradi   { get; }
    public int?   StCislo  { get; }
    public string Prijmeni { get; }
    public string Jmeno    { get; }
    public string PqText   { get; }
    public string PsfText  { get; }
    public string PfText   { get; }
    public int    Bq       { get; }

    // Medal helpers
    public bool JeZlato   => Poradi == 1;
    public bool JeStribro => Poradi == 2;
    public bool JeBronz   => Poradi == 3;

    public CelkoveRadekViewModel(CelkoveRadek r)
    {
        Poradi   = r.Poradi;
        StCislo  = r.StCislo;
        Prijmeni = r.Prijmeni;
        Jmeno    = r.Jmeno;
        PqText   = r.Pq?.ToString()  ?? "—";
        PsfText  = r.Psf?.ToString() ?? "—";
        PfText   = r.Pf?.ToString()  ?? "—";
        Bq       = r.Bq;
    }
}
