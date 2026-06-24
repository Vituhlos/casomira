using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public partial class RostViewModel : ViewModelBase
{
    private readonly IRaceService _svc;
    private readonly int _koloId;

    public KoloTyp KoloTyp { get; }

    public ObservableCollection<RostJizdaViewModel> Jizdy { get; } = [];

    [ObservableProperty] private RostJizdaViewModel? _selectedJizda;
    [ObservableProperty] private string? _statusText;

    public RostViewModel(IRaceService svc, int koloId, KoloTyp koloTyp)
    {
        _svc    = svc;
        _koloId = koloId;
        KoloTyp = koloTyp;
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
