using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public partial class JizdaVysledkyViewModel : ViewModelBase
{
    public int    JizdaId    { get; }
    public int    Cislo      { get; }
    public string CisloLabel => $"Jízda {Cislo}";

    public ObservableCollection<VysledekRadekViewModel> Radky { get; } = [];

    [ObservableProperty] private string _pasteText = "";

    public JizdaVysledkyViewModel(VysledekJizda model)
    {
        JizdaId = model.Id;
        Cislo   = model.Cislo;
        foreach (var r in model.Vysledky)
            Radky.Add(new VysledekRadekViewModel(r, model.Id));
    }

    [RelayCommand]
    private void NacistCasy()
    {
        if (string.IsNullOrWhiteSpace(PasteText)) return;
        var casy = CasParser.ParseVice(PasteText);
        for (int i = 0; i < Math.Min(casy.Count, Radky.Count); i++)
            Radky[i].CasText = CasParser.Format(casy[i]);
        PasteText = "";
    }
}
