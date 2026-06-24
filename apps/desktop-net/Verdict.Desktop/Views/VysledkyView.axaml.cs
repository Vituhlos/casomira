using Avalonia.Controls;
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
}
