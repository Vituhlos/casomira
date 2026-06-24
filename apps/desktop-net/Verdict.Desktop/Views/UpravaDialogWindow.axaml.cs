using Avalonia.Controls;
using Avalonia.Interactivity;
using Verdict.Core.Model;
using Verdict.Desktop.ViewModels;

namespace Verdict.Desktop.Views;

public partial class UpravaDialogWindow : Window
{
    public UpravaDialogWindow() => InitializeComponent();

    public UpravaDialogWindow(VysledekRadekViewModel radek)
    {
        InitializeComponent();
        DataContext = new UpravaDialogViewModel(radek);
    }

    private void OnCancel(object? sender, RoutedEventArgs e) => Close(null);

    private void OnConfirm(object? sender, RoutedEventArgs e)
    {
        if (DataContext is UpravaDialogViewModel vm)
            Close(vm.Sestav());
    }

    public static Task<UpravVysledekArg?> OtevritAsync(Window owner, VysledekRadekViewModel radek) =>
        new UpravaDialogWindow(radek).ShowDialog<UpravVysledekArg?>(owner);
}
