using CommunityToolkit.Mvvm.ComponentModel;
using Verdict.Core.Model;

namespace Verdict.Desktop.ViewModels;

public partial class JezdecRowViewModel : ViewModelBase
{
    public int Id { get; }
    public int KategorieId { get; }

    // int? fields exposed as strings — DataGrid TextColumn binds via get/set
    private int? _stCislo;
    private int? _los;

    [ObservableProperty] private string _prijmeni = "";
    [ObservableProperty] private string _jmeno = "";
    [ObservableProperty] private string _znacka = "";
    [ObservableProperty] private string _model = "";

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

    public string LosText
    {
        get => _los?.ToString() ?? "";
        set
        {
            var v = string.IsNullOrWhiteSpace(value)
                ? null
                : int.TryParse(value.Trim(), out int n) ? (int?)n : null;
            if (v == _los) return;
            _los = v;
            OnPropertyChanged();
        }
    }

    // Typované hodnoty pro uložení
    public int? StCislo => _stCislo;
    public int? Los     => _los;

    // Zajistí aktualizaci VM před CellEditEnded callbackem (Avalonia timing)
    public void UpdateFromText(string? sloupec, string text)
    {
        switch (sloupec)
        {
            case "Los":      LosText     = text; break;
            case "St.č.":    StCisloText = text; break;
            case "Příjmení": Prijmeni    = text; break;
            case "Jméno":    Jmeno       = text; break;
            case "Značka":   Znacka      = text; break;
            case "Model":    Model       = text; break;
        }
    }

    public JezdecRowViewModel(Jezdec j)
    {
        Id          = j.Id;
        KategorieId = j.KategorieId;
        _stCislo    = j.StCislo;
        _prijmeni   = j.Prijmeni;
        _jmeno      = j.Jmeno;
        _znacka     = j.Znacka;
        _model      = j.Model;
        _los        = j.Los;
    }
}
