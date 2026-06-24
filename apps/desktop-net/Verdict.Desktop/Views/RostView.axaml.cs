using Avalonia.Controls;
using Verdict.Desktop.ViewModels;

namespace Verdict.Desktop.Views;

public partial class RostView : UserControl
{
    public RostView()
    {
        InitializeComponent();
    }

    private void OnSlotCellEditEnded(object? sender, DataGridCellEditEndedEventArgs e)
    {
        if (e.EditAction != DataGridEditAction.Commit) return;
        if (sender is not DataGrid grid) return;
        if (grid.DataContext is not RostJizdaViewModel jizda) return;
        if (e.Row.DataContext is not RostSlotViewModel slot) return;
        if (DataContext is not RostViewModel vm) return;

        if (e.Column.Header?.ToString() == "St.č.")
            vm.OnSlotStCisloChanged(jizda, slot);
    }
}
