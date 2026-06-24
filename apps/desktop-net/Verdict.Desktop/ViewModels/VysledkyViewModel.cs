using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public partial class VysledkyViewModel : ViewModelBase
{
    private readonly IRaceService _svc;
    private readonly int _koloId;

    public KoloTyp KoloTyp { get; }

    public ObservableCollection<JizdaVysledkyViewModel> Jizdy { get; } = [];

    [ObservableProperty] private string? _statusText;

    public VysledkyViewModel(IRaceService svc, int koloId, KoloTyp koloTyp)
    {
        _svc    = svc;
        _koloId = koloId;
        KoloTyp = koloTyp;
        Nacti();
    }

    public void Nacti()
    {
        _svc.InicializujVysledky(_koloId);
        var kolo = _svc.GetVysledky(_koloId);
        Jizdy.Clear();
        foreach (var j in kolo.Jizdy)
            Jizdy.Add(new JizdaVysledkyViewModel(j));
    }

    public void OnRadekZmenen(JizdaVysledkyViewModel jizda, VysledekRadekViewModel radek)
    {
        try
        {
            _svc.NastavVysledek(new SetVysledekArg(jizda.JizdaId, radek.JezdecId, radek.CasMs, radek.Stav));
            _svc.PrepocitejPoradi(jizda.JizdaId);
            ObnovJizdu(jizda);
            StatusText = null;
        }
        catch (Exception ex)
        {
            StatusText = $"Chyba při uložení: {ex.Message}";
        }
    }

    public void AplikujUpravu(UpravVysledekArg arg)
    {
        try
        {
            _svc.AplikujUpravu(arg);
            var jizda = Jizdy.FirstOrDefault(j => j.JizdaId == arg.JizdaId);
            if (jizda is not null) ObnovJizdu(jizda);
            StatusText = null;
        }
        catch (Exception ex)
        {
            StatusText = $"Chyba při uložení úpravy: {ex.Message}";
        }
    }

    private void ObnovJizdu(JizdaVysledkyViewModel jizda)
    {
        var refreshed = _svc.GetVysledky(_koloId);
        var jizdaModel = refreshed.Jizdy.FirstOrDefault(j => j.Id == jizda.JizdaId);
        if (jizdaModel is null) return;
        jizda.Radky.Clear();
        foreach (var r in jizdaModel.Vysledky)
            jizda.Radky.Add(new VysledekRadekViewModel(r, jizda.JizdaId));
    }
}
