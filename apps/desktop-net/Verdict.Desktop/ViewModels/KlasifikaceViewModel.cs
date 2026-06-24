using System.Collections.ObjectModel;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public class KlasifikaceViewModel : ViewModelBase
{
    private readonly IRaceService _svc;
    private readonly int _kategorieId;

    /// <summary>Kola, jejichž body se sčítají (Q2: Q1+Q2; Q3: Q1+Q2+Q3) — určuje sloupce.</summary>
    public IReadOnlyList<KoloTyp> KoloTypy { get; }

    public ObservableCollection<KlasifikaceRadekViewModel> Radky { get; } = [];

    public bool JePrazdne => Radky.Count == 0;

    public KlasifikaceViewModel(IRaceService svc, int kategorieId, IReadOnlyList<KoloTyp> koloTypy)
    {
        _svc         = svc;
        _kategorieId = kategorieId;
        KoloTypy     = koloTypy;
        Nacti();
    }

    public void Nacti()
    {
        Radky.Clear();
        foreach (var r in _svc.GetKlasifikace(_kategorieId, KoloTypy))
            Radky.Add(new KlasifikaceRadekViewModel(r));
    }
}
