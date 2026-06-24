using System.Collections.ObjectModel;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public class CelkoveViewModel : ViewModelBase
{
    private readonly IRaceService _svc;
    private readonly int _kategorieId;

    public ObservableCollection<CelkoveRadekViewModel> Radky { get; } = [];

    public bool JePrazdne => Radky.Count == 0;

    public CelkoveViewModel(IRaceService svc, int kategorieId)
    {
        _svc         = svc;
        _kategorieId = kategorieId;
        Nacti();
    }

    public void Nacti()
    {
        Radky.Clear();
        foreach (var r in _svc.GetCelkove(_kategorieId))
            Radky.Add(new CelkoveRadekViewModel(r));
    }
}
