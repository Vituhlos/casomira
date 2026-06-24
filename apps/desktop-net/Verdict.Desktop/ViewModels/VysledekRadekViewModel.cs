using CommunityToolkit.Mvvm.ComponentModel;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public partial class VysledekRadekViewModel : ViewModelBase
{
    public int    VysledekId { get; }
    public int    JezdecId   { get; }
    public int?   StCislo    { get; }
    public string Prijmeni   { get; }
    public string Jmeno      { get; }

    [ObservableProperty] private string _casText  = "";
    [ObservableProperty] private string _stavText = "OK";
    [ObservableProperty] private int?   _poradi;
    [ObservableProperty] private int?   _body;

    public int?  CasMs => CasParser.Parse(CasText);
    public Stav  Stav  => Enum.TryParse<Stav>(StavText?.Trim().ToUpperInvariant(), out var s) ? s : Stav.OK;

    public VysledekRadekViewModel(VysledekRadek r)
    {
        VysledekId = r.VysledekId;
        JezdecId   = r.JezdecId;
        StCislo    = r.StCislo;
        Prijmeni   = r.Prijmeni;
        Jmeno      = r.Jmeno;
        _casText   = r.MerCasMs.HasValue ? CasParser.Format(r.MerCasMs.Value) : "";
        _stavText  = r.Stav.ToString();
        _poradi    = r.Poradi;
        _body      = r.Body;
    }
}
