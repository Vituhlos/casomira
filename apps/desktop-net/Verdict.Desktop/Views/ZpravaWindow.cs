using Avalonia.Controls;
using Avalonia.Layout;

namespace Verdict.Desktop.Views;

/// <summary>Jednoduchý modální dialog s hláškou a tlačítkem OK (code-only).</summary>
public sealed class ZpravaWindow : Window
{
    private ZpravaWindow(string titulek, string zprava)
    {
        Title = titulek;
        Width = 420;
        SizeToContent = SizeToContent.Height;
        CanResize = false;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;

        var text = new TextBlock
        {
            Text = zprava,
            TextWrapping = Avalonia.Media.TextWrapping.Wrap,
            FontSize = 13,
        };

        var ok = new Button
        {
            Content = "OK",
            HorizontalAlignment = HorizontalAlignment.Right,
            MinWidth = 80,
        };
        ok.Classes.Add("primary");
        ok.Click += (_, _) => Close();

        Content = new StackPanel
        {
            Margin = new Avalonia.Thickness(20),
            Spacing = 16,
            Children = { text, ok },
        };
    }

    public static System.Threading.Tasks.Task ZobrazAsync(Window owner, string titulek, string zprava) =>
        new ZpravaWindow(titulek, zprava).ShowDialog(owner);
}
