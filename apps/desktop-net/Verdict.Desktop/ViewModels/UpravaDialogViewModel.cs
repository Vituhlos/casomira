using CommunityToolkit.Mvvm.ComponentModel;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public partial class UpravaDialogViewModel : ViewModelBase
{
    // ── Read-only info ────────────────────────────────────────────────────────
    public int    VysledekId      { get; }
    public int    JizdaId         { get; }
    public string JezdecLabel     { get; }
    public string JizdaLabel      { get; }
    public string NamerenyText    { get; }

    // ── Editovatelné pole ─────────────────────────────────────────────────────
    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(EfektivniText))]
    [NotifyPropertyChangedFor(nameof(MuzeUlozit))]
    private string _penalizaceSText = "0";

    [ObservableProperty] private string _stavText = "OK";

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(MuzeUlozit))]
    private string _rucniPoradiText = "";

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(MuzeUlozit))]
    private string _duvod = "";

    [ObservableProperty] private string _rozhodl = "ředitel";

    // ── Odvozené ──────────────────────────────────────────────────────────────
    private readonly int? _namerenyMs;
    private readonly int  _puvodniPenalizaceMs;
    private readonly int? _puvodniRucniPoradi;
    private readonly Stav _puvodniStav;

    public string EfektivniText
    {
        get
        {
            if (_namerenyMs is null) return "—";
            int pen = ParsePenalizaceMs() ?? _puvodniPenalizaceMs;
            return CasParser.Format(_namerenyMs.Value + pen);
        }
    }

    public bool MuzeUlozit =>
        !string.IsNullOrWhiteSpace(Duvod) &&
        (ParsePenalizaceMs() is not null) &&
        (string.IsNullOrWhiteSpace(RucniPoradiText) || int.TryParse(RucniPoradiText, out _));

    public UpravaDialogViewModel(VysledekRadekViewModel radek)
    {
        VysledekId           = radek.VysledekId;
        JizdaId              = radek.JizdaId;
        JezdecLabel          = $"{radek.Prijmeni} {radek.Jmeno}  (st.č. {radek.StCislo?.ToString() ?? "?"})";
        JizdaLabel           = $"Jízda {radek.JizdaId}";
        _namerenyMs          = radek.MerCasMs;
        _puvodniPenalizaceMs = radek.PenalizaceMs;
        _puvodniRucniPoradi  = radek.RucniPoradi;
        _puvodniStav         = radek.Stav;

        NamerenyText       = radek.MerCasMs.HasValue ? CasParser.Format(radek.MerCasMs.Value) : "—";
        _penalizaceSText   = (radek.PenalizaceMs / 1000.0).ToString("G");
        _stavText          = radek.Stav.ToString();
        _rucniPoradiText   = radek.RucniPoradi?.ToString() ?? "";
    }

    private int? ParsePenalizaceMs()
    {
        if (double.TryParse(PenalizaceSText.Replace(',', '.'),
                System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture,
                out var s))
            return (int)(s * 1000);
        return null;
    }

    public UpravVysledekArg? Sestav()
    {
        if (!MuzeUlozit) return null;

        int?  novaPen    = ParsePenalizaceMs() is { } p && p != _puvodniPenalizaceMs ? p : null;
        Stav  novyStav   = Enum.TryParse<Stav>(StavText.Trim().ToUpperInvariant(), out var s) ? s : _puvodniStav;
        Stav? stavChange = novyStav != _puvodniStav ? novyStav : null;

        int? novyRucni;
        if (string.IsNullOrWhiteSpace(RucniPoradiText))
            novyRucni = _puvodniRucniPoradi.HasValue ? 0 : null;  // 0 = zrušit, null = beze změny
        else if (int.TryParse(RucniPoradiText, out var rp) && rp != _puvodniRucniPoradi)
            novyRucni = rp;
        else
            novyRucni = null;

        if (novaPen is null && stavChange is null && novyRucni is null)
            return null; // nic se nezměnilo

        return new UpravVysledekArg(
            VysledekId, JizdaId,
            Rozhodl.Trim().Length > 0 ? Rozhodl.Trim() : "ředitel",
            Duvod.Trim(),
            novaPen, novyRucni, stavChange);
    }
}
