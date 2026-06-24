using CommunityToolkit.Mvvm.ComponentModel;

namespace Verdict.Desktop.ViewModels;

public partial class KategorieChipViewModel : ViewModelBase
{
    public string Nazev { get; }

    [ObservableProperty] private bool _vybrano;

    public KategorieChipViewModel(string nazev, bool vybrano)
    {
        Nazev   = nazev;
        _vybrano = vybrano;
    }
}
