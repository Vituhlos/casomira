using System.Collections.ObjectModel;
using Verdict.Core.Model;

namespace Verdict.Desktop.ViewModels;

public class RostJizdaViewModel : ViewModelBase
{
    public int    Id     { get; }
    public int    Cislo  { get; }
    public string CisloLabel => $"Jízda {Cislo}";

    public ObservableCollection<RostSlotViewModel> Sloty { get; } = [];

    public RostJizdaViewModel(RostJizda model)
    {
        Id    = model.Id;
        Cislo = model.Cislo;
        foreach (var s in model.Sloty)
            Sloty.Add(new RostSlotViewModel(s));
    }
}
