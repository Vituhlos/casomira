using Avalonia.Controls;
using Avalonia.Interactivity;
using Verdict.Core.Model;
using Verdict.Desktop.ViewModels;

namespace Verdict.Desktop.Views;

public partial class RaceDialogWindow : Window
{
    public RaceDialogWindow()
    {
        InitializeComponent();
        DataContext = new RaceDialogViewModel();
    }

    private void OnCancel(object? sender, RoutedEventArgs e) => Close(null);

    private void OnConfirm(object? sender, RoutedEventArgs e)
    {
        if (DataContext is RaceDialogViewModel vm)
            Close(vm.Sestav());
    }

    /// <summary>Otevře dialog a vrátí vstup pro založení závodu, nebo null při zrušení.</summary>
    public static Task<NovyZavod?> OtevritAsync(Window owner) =>
        new RaceDialogWindow().ShowDialog<NovyZavod?>(owner);
}
