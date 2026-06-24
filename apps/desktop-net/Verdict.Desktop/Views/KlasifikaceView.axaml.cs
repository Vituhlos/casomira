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

        Grid.Columns.Clear();

        Grid.Columns.Add(new DataGridTextColumn
        {
            Header = "Poř.", Binding = new Binding(nameof(KlasifikaceRadekViewModel.Poradi)), Width = new DataGridLength(55)
        });
        Grid.Columns.Add(new DataGridTextColumn
        {
            Header = "St.č.", Binding = new Binding(nameof(KlasifikaceRadekViewModel.StCislo)), Width = new DataGridLength(65)
        });
        Grid.Columns.Add(new DataGridTextColumn
        {
            Header = "Příjmení", Binding = new Binding(nameof(KlasifikaceRadekViewModel.Prijmeni)), Width = new DataGridLength(180)
        });
        Grid.Columns.Add(new DataGridTextColumn
        {
            Header = "Jméno", Binding = new Binding(nameof(KlasifikaceRadekViewModel.Jmeno)), Width = new DataGridLength(140)
        });

        // Sloupec bodů za každé započítané kolo (Q1, Q2, případně Q3).
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
            Header = "Celkem", Binding = new Binding(nameof(KlasifikaceRadekViewModel.Celkem)), Width = new DataGridLength(80)
        });
    }
}
