using System.Collections.ObjectModel;
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
    private readonly ImportService _importSvc;

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

    // ── Cached ViewModels pro aktuální tab ────────────────────────────────────

    private StartListViewModel? _startListVm;
    private readonly Dictionary<KoloTyp, RostViewModel>     _rostVms     = new();
    private readonly Dictionary<KoloTyp, VysledkyViewModel> _vysledkyVms = new();

    // ── Breadcrumb ────────────────────────────────────────────────────────────

    public string Breadcrumb
    {
        get
        {
            if (CurrentZavod is null) return "Verdict";
            if (SelectedKategorie is null) return CurrentZavod.Nazev;
            if (SelectedFaze is null) return SelectedKategorie.Nazev;
            return $"{SelectedKategorie.Nazev}  →  {SelectedFaze.Label}";
        }
    }

    // ── Obsah ─────────────────────────────────────────────────────────────────

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

            var key    = SelectedFaze.Key;
            var katId  = SelectedKategorie.Id;

            if (key == ListKey.Start)
            {
                if (_startListVm?.KategorieId != katId)
                    _startListVm = new StartListViewModel(_svc, _importSvc, SelectedKategorie.Model);
                return _startListVm;
            }

            // Klasifikace — sčítá body přes kola; staví se vždy čerstvě, ať odráží
            // poslední zadané výsledky (Q2: Q1+Q2; Q3: Q1+Q2+Q3). CLAUDE.md §7.
            if (key is ListKey.ClassQ2 or ListKey.ClassQ3)
            {
                var koloTypy = key == ListKey.ClassQ2
                    ? new[] { KoloTyp.Q1, KoloTyp.Q2 }
                    : new[] { KoloTyp.Q1, KoloTyp.Q2, KoloTyp.Q3 };
                return new KlasifikaceViewModel(_svc, katId, koloTypy);
            }

            // Celkové výsledky — řídí je finále; staví se vždy čerstvě. CLAUDE.md §9.
            if (key == ListKey.Overall)
                return new CelkoveViewModel(_svc, katId);

            var koloTyp = key switch
            {
                ListKey.GridQ1 or ListKey.ResQ1     => KoloTyp.Q1,
                ListKey.GridQ2 or ListKey.ResQ2     => KoloTyp.Q2,
                ListKey.GridQ3 or ListKey.ResQ3     => KoloTyp.Q3,
                ListKey.SfRost or ListKey.SfRes     => KoloTyp.SF,
                ListKey.FinalRost or ListKey.FinalRes => KoloTyp.F,
                _ => (KoloTyp?)null
            };

            if (koloTyp.HasValue)
            {
                bool isRost = key is ListKey.GridQ1 or ListKey.GridQ2 or ListKey.GridQ3
                                  or ListKey.SfRost or ListKey.FinalRost;

                if (isRost)
                {
                    if (!_rostVms.TryGetValue(koloTyp.Value, out var vm))
                    {
                        int koloId = _svc.EnsureKolo(katId, koloTyp.Value);
                        vm = new RostViewModel(_svc, katId, koloId, koloTyp.Value);
                        _rostVms[koloTyp.Value] = vm;
                    }
                    return vm;
                }
                else
                {
                    if (!_vysledkyVms.TryGetValue(koloTyp.Value, out var vm))
                    {
                        int koloId = _svc.EnsureKolo(katId, koloTyp.Value);
                        vm = new VysledkyViewModel(_svc, koloId, koloTyp.Value);
                        _vysledkyVms[koloTyp.Value] = vm;
                    }
                    return vm;
                }
            }

            return new PlaceholderViewModel
            {
                Message = $"{SelectedKategorie.Nazev}  —  {SelectedFaze.Label}"
            };
        }
    }

    // ── Konstruktor ───────────────────────────────────────────────────────────

    public MainWindowViewModel(IRaceService svc, ImportService importSvc)
    {
        _svc       = svc;
        _importSvc = importSvc;
        NactiZavod();
    }

    // ── partial OnChanged háky ────────────────────────────────────────────────

    partial void OnSelectedKategorieChanged(KategorieRowViewModel? value)
    {
        _startListVm = null;
        _rostVms.Clear();
        _vysledkyVms.Clear();
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
    private void OtevritStopky() { }

    [RelayCommand]
    private void UlozitPdf() { }

    // ── Interní ───────────────────────────────────────────────────────────────

    private void NactiZavod()
    {
        var zavody = _svc.GetZavody();
        if (zavody.Count == 0) return;

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
