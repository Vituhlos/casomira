using Avalonia.Controls;
using Avalonia.Data;
using Verdict.Desktop.ViewModels;

namespace Verdict.Desktop.Views;

public partial class KlasifikaceView : UserControl
{
    public KlasifikaceView()
    {
        InitializeComponent();
        DataContextChanged += OnDataContextChanged;
    }

    private void OnDataContextChanged(object? sender, System.EventArgs e)
    {
        if (DataContext is not KlasifikaceViewModel vm) return;

        // Odstraníme jen dynamicky přidané sloupce (statické jsou v XAML = první 4)
        while (Grid.Columns.Count > 4)
            Grid.Columns.RemoveAt(Grid.Columns.Count - 1);

        // Body za každé kolo (Q1, Q2, případně Q3)
        foreach (var typ in vm.KoloTypy)
        {
            string klic = typ.ToString();
            Grid.Columns.Add(new DataGridTextColumn
            {
                Header  = klic,
                Binding = new Binding($"[{klic}]"),
                Width   = new DataGridLength(70)
            });
        }

        Grid.Columns.Add(new DataGridTextColumn
        {
            Header  = "Celkem",
            Binding = new Binding(nameof(KlasifikaceRadekViewModel.Celkem)),
            Width   = new DataGridLength(80)
        });
    }
}
