using Verdict.Core.Model;

namespace Verdict.Desktop.ViewModels;

public sealed class KategorieRowViewModel : ViewModelBase
{
    public Kategorie Model { get; }

    public KategorieRowViewModel(Kategorie model) => Model = model;

    public int Id     => Model.Id;
    public string Nazev  => Model.Nazev;
    public string PocetText => Model.Pocet > 0 ? Model.Pocet.ToString() : "";
}
