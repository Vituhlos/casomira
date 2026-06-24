using Avalonia.Controls;
using Avalonia.Interactivity;
using Verdict.Desktop.ViewModels;

namespace Verdict.Desktop.Views;

public partial class VysledkyView : UserControl
{
    public VysledkyView()
    {
        InitializeComponent();
    }

    private void OnVysledekCellEditEnded(object? sender, DataGridCellEditEndedEventArgs e)
    {
        if (e.EditAction != DataGridEditAction.Commit) return;
        if (sender is not DataGrid grid) return;
        if (grid.DataContext is not JizdaVysledkyViewModel jizda) return;
        if (e.Row.DataContext is not VysledekRadekViewModel radek) return;
        if (DataContext is not VysledkyViewModel vm) return;

        var header = e.Column.Header?.ToString();
        if (header is "Čas" or "Stav")
            vm.OnRadekZmenen(jizda, radek);
    }

    private async void OnUpravitClick(object? sender, RoutedEventArgs e)
    {
        if (sender is not Button btn) return;
        if (btn.Tag is not VysledekRadekViewModel radek) return;
        if (DataContext is not VysledkyViewModel vm) return;

        var owner = TopLevel.GetTopLevel(this) as Avalonia.Controls.Window;
        if (owner is null) return;

        var arg = await UpravaDialogWindow.OtevritAsync(owner, radek);
        if (arg is not null)
            vm.AplikujUpravu(arg);
    }
}
