using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public partial class RostViewModel : ViewModelBase
{
    private readonly IRaceService _svc;
    private readonly int _kategorieId;
    private int _koloId;

    public KoloTyp KoloTyp { get; }

    /// <summary>Automatické nasazení: Q1–Q3 dle §6, SF/F z klasifikace.</summary>
    public bool MuzeNavrhnout =>
        KoloTyp is KoloTyp.Q1 or KoloTyp.Q2 or KoloTyp.Q3 or KoloTyp.SF or KoloTyp.F;

    public string NavrhLabel => KoloTyp switch
    {
        KoloTyp.SF => "Navrhnout semifinále",
        KoloTyp.F  => "Navrhnout finále",
        _          => "Navrhnout rošt"
    };

    public ObservableCollection<RostJizdaViewModel> Jizdy { get; } = [];

    [ObservableProperty] private RostJizdaViewModel? _selectedJizda;
    [ObservableProperty] private string? _statusText;

    public RostViewModel(IRaceService svc, int kategorieId, int koloId, KoloTyp koloTyp)
    {
        _svc         = svc;
        _kategorieId = kategorieId;
        _koloId      = koloId;
        KoloTyp      = koloTyp;
        Nacti();
    }

    public void Nacti()
    {
        Jizdy.Clear();
        var rost = _svc.GetRost(_koloId);
        foreach (var j in rost.Jizdy)
            Jizdy.Add(new RostJizdaViewModel(j));
    }

    [RelayCommand]
    private void PridatJizdu()
    {
        _svc.VytvorJizdu(_koloId);
        Nacti();
        SelectedJizda = Jizdy.LastOrDefault();
        StatusText = null;
    }

    [RelayCommand]
    private void SmazatJizdu(RostJizdaViewModel? jizda)
    {
        if (jizda is null) return;
        _svc.SmazJizdu(jizda.Id);
        Jizdy.Remove(jizda);
        StatusText = null;
    }

    [RelayCommand]
    private void Navrhnout()
    {
        var navrh = KoloTyp switch
        {
            KoloTyp.SF => _svc.NavrhSF(_kategorieId),
            KoloTyp.F  => _svc.NavrhFinale(_kategorieId),
            _          => _svc.NavrhniRost(_kategorieId, KoloTyp)
        };

        if (!navrh.Ok)
        {
            StatusText = navrh.Chyba;
            return;
        }

        var zapis = navrh.Jizdy
            .Select(j => new RostZapisJizda(j.Cislo, j.Jezdci.Select(jz => jz.Id).ToList()))
            .ToList();

        _svc.ZapisRost(_kategorieId, KoloTyp, zapis);
        Nacti();

        int pocet = navrh.Jizdy.Sum(j => j.Jezdci.Count);
        StatusText = KoloTyp switch
        {
            KoloTyp.SF => $"Semifinále nasazeno: {pocet} jezdců ve 2 jízdách.",
            KoloTyp.F  => $"Finále nasazeno: {pocet} jezdců.",
            _          => $"Rošt navržen: {pocet} jezdců v {navrh.Jizdy.Count} jízdách"
                          + (navrh.Obsazeno ? " (původní přepsán)." : ".")
        };
    }

    public void OnSlotStCisloChanged(RostJizdaViewModel jizda, RostSlotViewModel slot)
    {
        var result = _svc.SetRostPozice(jizda.Id, slot.Pozice, slot.StCislo);

        if (!result.Ok)
        {
            StatusText = result.Duplicitni
                ? $"St. č. {slot.StCisloText} je v jízdě {jizda.Cislo} již na jiné pozici."
                : $"St. č. {slot.StCisloText} nebylo nalezeno v startovní listině.";
            slot.UpdateFromJezdec(null);
        }
        else
        {
            StatusText = null;
            slot.UpdateFromJezdec(result.Jezdec);
        }
    }
}
