using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
using Verdict.Core.Model;
using Verdict.Desktop.ViewModels;

namespace Verdict.Desktop.Views;

public partial class StartListView : UserControl
{
    public StartListView()
    {
        InitializeComponent();
    }

    private void OnCellEditEnded(object? sender, DataGridCellEditEndedEventArgs e)
    {
        if (e.EditAction != DataGridEditAction.Commit) return;
        if (e.Row.DataContext is not JezdecRowViewModel row) return;
        if (DataContext is not StartListViewModel vm) return;

        var pole = e.Column.Header?.ToString() switch
        {
            "Los"      => JezdecPole.Los,
            "St.č."    => JezdecPole.StCislo,
            "Příjmení" => JezdecPole.Prijmeni,
            "Jméno"    => JezdecPole.Jmeno,
            "Značka"   => JezdecPole.Znacka,
            "Model"    => JezdecPole.Model,
            _          => (JezdecPole?)null
        };
        if (pole is null) return;

        vm.OnBunkaZmenena(row, pole.Value);
    }

    private async void OnImportClick(object? sender, RoutedEventArgs e)
    {
        var topLevel = TopLevel.GetTopLevel(this);
        if (topLevel is null) return;

        var soubory = await topLevel.StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "Vybrat Excel soubor",
            AllowMultiple = false,
            FileTypeFilter =
            [
                new FilePickerFileType("Excel") { Patterns = ["*.xlsx", "*.xls"] }
            ]
        });

        if (soubory.Count == 0) return;
        var cesta = soubory[0].TryGetLocalPath();
        if (cesta is null) return;

        if (DataContext is StartListViewModel vm)
            await vm.SpustImport(cesta);
    }
}
