using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
using Verdict.Core.Backup;
using Verdict.Desktop.ViewModels;

namespace Verdict.Desktop.Views;

public partial class MainWindow : Window
{
    private StopkyWindow? _stopkyWin;

    public MainWindow()
    {
        InitializeComponent();
    }

    protected override void OnDataContextChanged(EventArgs e)
    {
        base.OnDataContextChanged(e);
        if (DataContext is MainWindowViewModel vm)
            vm.StopkyOtevrit += OnStopkyOtevrit;
    }

    private void OnStopkyOtevrit(object? sender, StopkyViewModel vm)
    {
        if (_stopkyWin is { IsVisible: true })
        {
            _stopkyWin.DataContext = vm;
            _stopkyWin.Activate();
            return;
        }
        _stopkyWin = new StopkyWindow { DataContext = vm };
        _stopkyWin.Show(this);
    }

    private async void OnNovyZavod(object? sender, RoutedEventArgs e)
    {
        var vstup = await RaceDialogWindow.OtevritAsync(this);
        if (vstup is null) return;

        if (DataContext is MainWindowViewModel vm)
            vm.VytvoritZavod(vstup);
    }

    private void OnOtevritZavod(object? sender, RoutedEventArgs e)
    {
        if (sender is Button { DataContext: RaceCardViewModel card }
            && DataContext is MainWindowViewModel vm)
            vm.OtevritZavod(card.Zavod);
    }

    private static readonly FilePickerFileType JsonTyp = new("Záloha Verdictu (*.json)")
    {
        Patterns = ["*.json"],
    };

    private async void OnZaloha(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm) return;

        var (json, navrhJmena) = vm.PripravZalohu();

        var soubor = await StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
        {
            Title = "Uložit zálohu",
            SuggestedFileName = navrhJmena,
            DefaultExtension = "json",
            FileTypeChoices = [JsonTyp],
        });
        if (soubor is null) return;

        try
        {
            await using var stream = await soubor.OpenWriteAsync();
            await using var writer = new StreamWriter(stream);
            await writer.WriteAsync(json);
            await writer.FlushAsync();
            await ZpravaWindow.ZobrazAsync(this, "Záloha hotova", $"Záloha uložena do:\n{soubor.Name}");
        }
        catch (Exception ex)
        {
            await ZpravaWindow.ZobrazAsync(this, "Chyba zálohy", $"Zálohu se nepodařilo uložit:\n{ex.Message}");
        }
    }

    private async void OnObnova(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm) return;

        var soubory = await StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "Obnovit ze zálohy",
            AllowMultiple = false,
            FileTypeFilter = [JsonTyp],
        });
        if (soubory.Count == 0) return;

        try
        {
            string text;
            await using (var stream = await soubory[0].OpenReadAsync())
            using (var reader = new StreamReader(stream))
                text = await reader.ReadToEndAsync();

            string hlaska = vm.ObnovZeZalohy(text);
            await ZpravaWindow.ZobrazAsync(this, "Obnova hotova", hlaska);
        }
        catch (BackupValidationException ex)
        {
            await ZpravaWindow.ZobrazAsync(this, "Neplatná záloha", ex.Message);
        }
        catch (Exception ex)
        {
            await ZpravaWindow.ZobrazAsync(this, "Chyba obnovy", $"Obnova se nezdařila:\n{ex.Message}");
        }
    }
}
