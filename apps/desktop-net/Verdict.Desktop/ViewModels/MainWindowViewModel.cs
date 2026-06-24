using System.Collections.ObjectModel;
using System.Linq;
using Avalonia;
using Avalonia.Styling;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public partial class MainWindowViewModel : ViewModelBase
{
    private readonly IRaceService _svc;

    // ── Závod ─────────────────────────────────────────────────────────────────

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(Breadcrumb))]
    private ZavodInfo? _currentZavod;

    // ── Kategorie (sidebar) ───────────────────────────────────────────────────

    public ObservableCollection<KategorieRowViewModel> Kategorie { get; } = [];

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(FazeTabs))]
    [NotifyPropertyChangedFor(nameof(Breadcrumb))]
    private KategorieRowViewModel? _selectedKategorie;

    // ── Fáze (phase tab bar) ──────────────────────────────────────────────────

    public ObservableCollection<FazeTabViewModel> FazeTabs { get; } = [];

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(Breadcrumb))]
    [NotifyPropertyChangedFor(nameof(CurrentContent))]
    private FazeTabViewModel? _selectedFaze;

    // ── Breadcrumb ────────────────────────────────────────────────────────────

    public string Breadcrumb
    {
        get
        {
            if (CurrentZavod is null) return "Verdict";
            if (SelectedKategorie is null) return CurrentZavod.Nazev;
            if (SelectedFaze is null)    return $"{SelectedKategorie.Nazev}";
            return $"{SelectedKategorie.Nazev}  →  {SelectedFaze.Label}";
        }
    }

    // ── Obsah (Phase 3 nahradí PlaceholderViewModel reálnými obrazovkami) ─────

    public ViewModelBase CurrentContent
    {
        get
        {
            if (SelectedFaze is null || SelectedKategorie is null)
                return new PlaceholderViewModel
                {
                    Message = CurrentZavod is null
                        ? "Vyberte nebo vytvořte závod."
                        : "Vyberte kategorii."
                };
            return new PlaceholderViewModel
            {
                Message = $"{SelectedKategorie.Nazev}  —  {SelectedFaze.Label}"
            };
        }
    }

    // ── Konstruktor ───────────────────────────────────────────────────────────

    public MainWindowViewModel(IRaceService svc)
    {
        _svc = svc;
        NactiZavod();
    }

    // ── partial OnChanged háky ────────────────────────────────────────────────

    partial void OnSelectedKategorieChanged(KategorieRowViewModel? value)
    {
        FazeTabs.Clear();
        SelectedFaze = null;
        if (value is null || CurrentZavod is null) return;

        foreach (var item in FazeHelper.GetFaze(CurrentZavod.Typ))
            FazeTabs.Add(new FazeTabViewModel(item));

        SelectedFaze = FazeTabs.FirstOrDefault();
    }

    // ── Příkazy ───────────────────────────────────────────────────────────────

    [RelayCommand]
    private void PrepnoutTema()
    {
        if (Application.Current is null) return;
        Application.Current.RequestedThemeVariant =
            Application.Current.RequestedThemeVariant == ThemeVariant.Dark
                ? ThemeVariant.Light
                : ThemeVariant.Dark;
    }

    [RelayCommand]
    private void OtevritStopky()
    {
        // TODO Phase 5 — stopky
    }

    [RelayCommand]
    private void UlozitPdf()
    {
        // TODO Phase 4 — PDF export
    }

    // ── Interní ───────────────────────────────────────────────────────────────

    private void NactiZavod()
    {
        var zavody = _svc.GetZavody();
        if (zavody.Count == 0) return;

        // Auto-výběr posledního (nejnovějšího) závodu — seed data vždy obsahují jeden.
        CurrentZavod = zavody[0];
        NactiKategorie(CurrentZavod.Id);
    }

    private void NactiKategorie(int zavodId)
    {
        Kategorie.Clear();
        SelectedKategorie = null;

        foreach (var kat in _svc.GetKategorie(zavodId))
            Kategorie.Add(new KategorieRowViewModel(kat));

        SelectedKategorie = Kategorie.FirstOrDefault();
    }
}
