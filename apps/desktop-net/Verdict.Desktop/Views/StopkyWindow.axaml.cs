using Avalonia.Controls;
using Verdict.Desktop.ViewModels;

namespace Verdict.Desktop.Views;

public partial class StopkyWindow : Window
{
    public StopkyWindow() => InitializeComponent();

    protected override void OnClosing(WindowClosingEventArgs e)
    {
        if (DataContext is StopkyViewModel vm)
            vm.Dispose();
        base.OnClosing(e);
    }
}
