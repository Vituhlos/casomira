using CommunityToolkit.Mvvm.ComponentModel;
using Verdict.Core.Model;

namespace Verdict.Desktop.ViewModels;

public partial class RostSlotViewModel : ViewModelBase
{
    public int Pozice { get; }

    private int? _stCislo;

    public string StCisloText
    {
        get => _stCislo?.ToString() ?? "";
        set
        {
            var v = string.IsNullOrWhiteSpace(value)
                ? null
                : int.TryParse(value.Trim(), out int n) ? (int?)n : null;
            if (v == _stCislo) return;
            _stCislo = v;
            OnPropertyChanged();
        }
    }

    public int? StCislo => _stCislo;

    [ObservableProperty] private string _prijmeni = "";
    [ObservableProperty] private string _jmeno    = "";
    [ObservableProperty] private string _znacka   = "";
    [ObservableProperty] private string _model    = "";

    public void UpdateFromJezdec(Jezdec? j)
    {
        if (j is null) { Prijmeni = ""; Jmeno = ""; Znacka = ""; Model = ""; }
        else           { Prijmeni = j.Prijmeni; Jmeno = j.Jmeno; Znacka = j.Znacka; Model = j.Model; }
    }

    public RostSlotViewModel(RostSlot slot)
    {
        Pozice = slot.Pozice;
        if (slot.Jezdec is { } j)
        {
            _stCislo = j.StCislo;
            _prijmeni = j.Prijmeni;
            _jmeno    = j.Jmeno;
            _znacka   = j.Znacka;
            _model    = j.Model;
        }
    }
}
