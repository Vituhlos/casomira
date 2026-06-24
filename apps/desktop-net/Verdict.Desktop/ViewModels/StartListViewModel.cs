using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public partial class StartListViewModel : ViewModelBase
{
    private readonly IRaceService _svc;
    private readonly ImportService _importSvc;
    private readonly Kategorie _kategorie;

    public int KategorieId => _kategorie.Id;

    public ObservableCollection<JezdecRowViewModel> Jezdci { get; } = [];

    [ObservableProperty] private JezdecRowViewModel? _selectedJezdec;
    [ObservableProperty] private string? _statusText;

    public StartListViewModel(IRaceService svc, ImportService importSvc, Kategorie kategorie)
    {
        _svc       = svc;
        _importSvc = importSvc;
        _kategorie = kategorie;
        Nacti();
    }

    public void Nacti()
    {
        Jezdci.Clear();
        foreach (var j in _svc.GetJezdci(_kategorie.Id))
            Jezdci.Add(new JezdecRowViewModel(j));
    }

    [RelayCommand]
    private void PridatJezdce()
    {
        int id = _svc.VytvorJezdce(_kategorie.Id, new ParsedJezdec(null, null, "", "", "", "", null));
        var row = new JezdecRowViewModel(new Jezdec(id, _kategorie.Id, null, "", "", "", "", null, null));
        Jezdci.Add(row);
        SelectedJezdec = row;
        StatusText = null;
    }

    [RelayCommand]
    private void SmazatJezdce(JezdecRowViewModel? row)
    {
        if (row is null) return;
        _svc.SmazJezdce(row.Id);
        Jezdci.Remove(row);
        StatusText = null;
    }

    public void OnBunkaZmenena(JezdecRowViewModel row, JezdecPole pole)
    {
        object? hodnota = pole switch
        {
            JezdecPole.StCislo  => (object?)row.StCislo,
            JezdecPole.Prijmeni => row.Prijmeni,
            JezdecPole.Jmeno    => row.Jmeno,
            JezdecPole.Znacka   => row.Znacka,
            JezdecPole.Model    => row.Model,
            JezdecPole.Los      => (object?)row.Los,
            _ => null,
        };

        try
        {
            _svc.AktualizujJezdce(new JezdecUprava(row.Id, pole, hodnota));
            StatusText = null;
        }
        catch (Exception ex)
        {
            StatusText = $"Chyba při uložení: {ex.Message}";
        }
    }

    public async Task SpustImport(string soubor)
    {
        try
        {
            StatusText = "Importuji…";
            var preview = await Task.Run(() => _importSvc.NactiPreview(soubor, [_kategorie]));

            var list = preview.Listy.FirstOrDefault(l => l.KategorieId == _kategorie.Id);
            if (list is null || list.Pocet == 0)
            {
                StatusText = "Žádný list se neshoduje s touto kategorií.";
                return;
            }

            var commit = new ImportCommit(
                [new ImportCommitSheet(_kategorie.Id, list.Jezdci)],
                ImportPolicy.Overwrite);

            var result = await Task.Run(() => _importSvc.Commit(commit));
            Nacti();
            StatusText = $"Importováno: {result.Vlozeno} nových" +
                         (result.Prepsano > 0 ? $", {result.Prepsano} přepsáno" : "") +
                         (result.Preskoceno > 0 ? $", {result.Preskoceno} přeskočeno" : "") + ".";
        }
        catch (Exception ex)
        {
            StatusText = $"Import selhal: {ex.Message}";
        }
    }
}
