using System.Collections.ObjectModel;
using Avalonia;
using Avalonia.Styling;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Verdict.Core.Backup;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public partial class MainWindowViewModel : ViewModelBase
{
    private readonly IRaceService _svc;
    private readonly ImportService _importSvc;
    private readonly BackupService _backupSvc;

    public event EventHandler<StopkyViewModel>? StopkyOtevrit;

    // ── Závod ─────────────────────────────────────────────────────────────────

    public ObservableCollection<ZavodInfo> Zavody { get; } = [];
    public ObservableCollection<RaceCardViewModel> RaceCards { get; } = [];

    public bool JeSpravaZavodu => CurrentZavod is null;
    public bool JeZavodOtevren => CurrentZavod is not null;
    public bool MaZavody => RaceCards.Count > 0;
    public bool NemaZavody => !MaZavody;

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(Breadcrumb))]
    [NotifyPropertyChangedFor(nameof(JeSpravaZavodu))]
    [NotifyPropertyChangedFor(nameof(JeZavodOtevren))]
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

    public MainWindowViewModel(IRaceService svc, ImportService importSvc, BackupService backupSvc)
    {
        _svc       = svc;
        _importSvc = importSvc;
        _backupSvc = backupSvc;
        NactiZavody();
    }

    // ── Záloha / obnova ───────────────────────────────────────────────────────

    /// <summary>Připraví zálohu celé databáze (JSON) + návrh názvu souboru. Volá View.</summary>
    public (string Json, string NavrhJmena) PripravZalohu()
    {
        var data = _backupSvc.ExportDatabaze();
        string json = BackupSerializer.Serialize(data);
        string jmeno = BackupNazev.NavrhProVse(data.ExportedAt);
        return (json, jmeno);
    }

    /// <summary>Obnoví závody ze zálohy (vloží jako nové) a obnoví seznam. Volá View.</summary>
    /// <returns>Hláška o výsledku pro uživatele.</returns>
    public string ObnovZeZalohy(string json)
    {
        var vysledek = _backupSvc.ObnovZTextu(json);
        NactiZavody();
        int n = vysledek.ZavodIds.Count;
        string zavodySlovo = n == 1 ? "závod" : n is >= 2 and <= 4 ? "závody" : "závodů";
        return $"Obnoveno {n} {zavodySlovo}. Poslední: {vysledek.PosledniNazev}";
    }

    /// <summary>Založí nový závod a přepne na něj. Volá View po potvrzení dialogu.</summary>
    public void VytvoritZavod(NovyZavod vstup)
    {
        int id = _svc.VytvorZavod(vstup);
        NactiZavody(id);
    }

    public void OtevritZavod(ZavodInfo zavod) => CurrentZavod = zavod;

    // ── partial OnChanged háky ────────────────────────────────────────────────

    partial void OnCurrentZavodChanged(ZavodInfo? value)
    {
        _startListVm = null;
        _rostVms.Clear();
        _vysledkyVms.Clear();

        if (value is null)
        {
            Kategorie.Clear();
            SelectedKategorie = null;
            FazeTabs.Clear();
            SelectedFaze = null;
            return;
        }

        NactiKategorie(value.Id);
    }

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
    private void OtevritStopky()
    {
        if (CurrentZavod is null) return;
        StopkyOtevrit?.Invoke(this, new StopkyViewModel(_svc, CurrentZavod.Id));
    }

    [RelayCommand]
    private void UlozitPdf() { }

    [RelayCommand]
    private void ZpetNaZavody() => CurrentZavod = null;

    // ── Interní ───────────────────────────────────────────────────────────────

    private void NactiZavody(int? vyberId = null)
    {
        Zavody.Clear();
        RaceCards.Clear();
        foreach (var z in _svc.GetZavody())
        {
            Zavody.Add(z);
            RaceCards.Add(new RaceCardViewModel(z));
        }

        CurrentZavod = vyberId is not null
            ? Zavody.FirstOrDefault(z => z.Id == vyberId.Value) ?? Zavody.FirstOrDefault()
            : null;

        OnPropertyChanged(nameof(MaZavody));
        OnPropertyChanged(nameof(NemaZavody));
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
