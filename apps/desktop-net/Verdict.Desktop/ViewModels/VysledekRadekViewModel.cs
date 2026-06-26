using CommunityToolkit.Mvvm.ComponentModel;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public partial class VysledekRadekViewModel : ViewModelBase
{
    public int    VysledekId   { get; }
    public int    JizdaId      { get; }
    public int    JezdecId     { get; }
    public int?   StCislo      { get; }
    public string Prijmeni     { get; }
    public string Jmeno        { get; }

    // Paste-box / inline editace
    [ObservableProperty] private string _casText  = "";
    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(JeDnf), nameof(JeDns), nameof(JeDq), nameof(JeOk))]
    private string _stavText = "OK";
    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(JeZlato), nameof(JeStribro), nameof(JeBronz))]
    private int?   _poradi;
    [ObservableProperty] private int?   _body;

    // Ředitelské úpravy — surová DB data
    public int?  MerCasMs     { get; private set; }
    public int   PenalizaceMs { get; private set; }
    public int?  RucniPoradi  { get; private set; }

    public bool   MaUpravu       => PenalizaceMs != 0 || RucniPoradi is not null;
    public string PenalizaceText => PenalizaceMs == 0 ? "" : $"{(PenalizaceMs > 0 ? "+" : "")}{PenalizaceMs / 1000.0:G} s";
    public string PoradiText     => RucniPoradi is not null ? $"✱{Poradi}" : Poradi?.ToString() ?? "";

    // Badge helpers pro XAML
    public bool JeDnf    => Stav == Stav.DNF;
    public bool JeDns    => Stav == Stav.DNS;
    public bool JeDq     => Stav == Stav.DQ;
    public bool JeOk     => Stav == Stav.OK;
    public bool JeZlato   => Poradi == 1;
    public bool JeStribro => Poradi == 2;
    public bool JeBronz   => Poradi == 3;

    // Pro paste-box cestu (beze změny logiky)
    public int?  CasMs => CasParser.Parse(CasText);
    public Stav  Stav  => Enum.TryParse<Stav>(StavText?.Trim().ToUpperInvariant(), out var s) ? s : Stav.OK;

    public VysledekRadekViewModel(VysledekRadek r, int jizdaId)
    {
        VysledekId   = r.VysledekId;
        JizdaId      = jizdaId;
        JezdecId     = r.JezdecId;
        StCislo      = r.StCislo;
        Prijmeni     = r.Prijmeni;
        Jmeno        = r.Jmeno;
        MerCasMs     = r.MerCasMs;
        PenalizaceMs = r.PenalizaceMs;
        RucniPoradi  = r.RucniPoradi;
        _casText     = r.MerCasMs.HasValue ? CasParser.Format(r.MerCasMs.Value) : "";
        _stavText    = r.Stav.ToString();
        _poradi      = r.Poradi;
        _body        = r.Body;
    }

    public void Refresh(VysledekRadek r)
    {
        MerCasMs     = r.MerCasMs;
        PenalizaceMs = r.PenalizaceMs;
        RucniPoradi  = r.RucniPoradi;
        CasText      = r.MerCasMs.HasValue ? CasParser.Format(r.MerCasMs.Value) : "";
        StavText     = r.Stav.ToString();
        Poradi       = r.Poradi;
        Body         = r.Body;
        OnPropertyChanged(nameof(MaUpravu));
        OnPropertyChanged(nameof(PenalizaceText));
        OnPropertyChanged(nameof(PoradiText));
    }
}
