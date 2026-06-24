using Avalonia.Controls;
using Avalonia.Interactivity;
using Verdict.Desktop.ViewModels;

namespace Verdict.Desktop.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }

    private async void OnNovyZavod(object? sender, RoutedEventArgs e)
    {
        var vstup = await RaceDialogWindow.OtevritAsync(this);
        if (vstup is null) return;

        if (DataContext is MainWindowViewModel vm)
            vm.VytvoritZavod(vstup);
    }
}
