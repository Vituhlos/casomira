using Avalonia.Controls;
using Avalonia.Interactivity;
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
}
