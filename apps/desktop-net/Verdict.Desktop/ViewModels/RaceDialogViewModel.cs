using System.Collections.ObjectModel;
using System.ComponentModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public partial class RaceDialogViewModel : ViewModelBase
{
    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(MuzeUlozit))]
    private string _nazev = "";

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(MuzeUlozit))]
    private string _datum = DateTime.Today.ToString("yyyy-MM-dd");

    [ObservableProperty] private string _misto = "";

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(JeRac))]
    [NotifyPropertyChangedFor(nameof(JeRx))]
    private RaceType _typ = RaceType.RAC;

    [ObservableProperty] private string _vlastniKategorie = "";

    public bool JeRac => Typ == RaceType.RAC;
    public bool JeRx  => Typ == RaceType.RX;

    public ObservableCollection<KategorieChipViewModel> Kategorie { get; } = [];

    public bool MuzeUlozit =>
        !string.IsNullOrWhiteSpace(Nazev) &&
        !string.IsNullOrWhiteSpace(Datum) &&
        Kategorie.Any(k => k.Vybrano);

    public RaceDialogViewModel()
    {
        NaplnChipy(RaceType.RAC);
    }

    partial void OnTypChanged(RaceType value)
    {
        NaplnChipy(value);
        VlastniKategorie = "";
    }

    private void NaplnChipy(RaceType typ)
    {
        foreach (var ch in Kategorie)
            ch.PropertyChanged -= OnChipChanged;
        Kategorie.Clear();

        var vychozi = RaceDefaults.Vychozi(typ).ToHashSet();
        foreach (var nazev in RaceDefaults.Nabidka(typ))
        {
            var chip = new KategorieChipViewModel(nazev, vychozi.Contains(nazev));
            chip.PropertyChanged += OnChipChanged;
            Kategorie.Add(chip);
        }
        OnPropertyChanged(nameof(MuzeUlozit));
    }

    private void OnChipChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(KategorieChipViewModel.Vybrano))
            OnPropertyChanged(nameof(MuzeUlozit));
    }

    [RelayCommand]
    private void PridatVlastni()
    {
        var n = VlastniKategorie.Trim();
        if (n.Length == 0) return;
        if (Kategorie.Any(k => k.Nazev.Equals(n, StringComparison.OrdinalIgnoreCase)))
        {
            VlastniKategorie = "";
            return;
        }
        var chip = new KategorieChipViewModel(n, true);
        chip.PropertyChanged += OnChipChanged;
        Kategorie.Add(chip);
        VlastniKategorie = "";
        OnPropertyChanged(nameof(MuzeUlozit));
    }

    /// <summary>Sestaví vstup pro založení závodu, nebo null když není kompletní.</summary>
    public NovyZavod? Sestav()
    {
        if (!MuzeUlozit) return null;
        var kategorie = Kategorie
            .Where(k => k.Vybrano)
            .Select(k => new KategorieVstup(k.Nazev, Ruleset.STANDARD))
            .ToList();
        return new NovyZavod(Nazev.Trim(), Datum, Misto.Trim(), Typ, kategorie);
    }
}
