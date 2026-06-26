using System;
using System.IO;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Headless;
using Avalonia.Media;
using Avalonia.Media.Imaging;
using Avalonia.Styling;
using Avalonia.Threading;
using Verdict.UiProof.Views;

namespace Verdict.UiProof;

internal static class Program
{
    [STAThread]
    public static int Main(string[] args)
    {
        // Headless PNG nahled: dotnet run -- --render <cesta> [w h] [light|dark] [main|hub]
        if (args.Length >= 2 && args[0] == "--render")
            return RenderToPng(args);

        // Zive okno: "dotnet run" = Startovni listina; "dotnet run -- hub" = Sprava zavodu
        if (args.Length >= 1 && args[0].Equals("hub", StringComparison.OrdinalIgnoreCase))
            App.StartScene = "hub";

        BuildAvaloniaApp().StartWithClassicDesktopLifetime(args);
        return 0;
    }

    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
            .UsePlatformDetect()
            .WithInterFont()
            .LogToTrace();

    private static int RenderToPng(string[] args)
    {
        var outPath = args[1];
        int w = args.Length >= 4 && int.TryParse(args[2], out var pw) ? pw : 1280;
        int h = args.Length >= 4 && int.TryParse(args[3], out var ph) ? ph : 800;
        string theme = args.Length >= 5 ? args[4] : "dark";
        string scene = args.Length >= 6 ? args[5] : "main";

        AppBuilder.Configure<App>()
            .UseHeadless(new AvaloniaHeadlessPlatformOptions { UseHeadlessDrawing = false })
            .UseSkia()
            .WithInterFont()
            .SetupWithoutStarting();

        return Dispatcher.UIThread.Invoke(() =>
        {
            try
            {
                var variant = theme.Equals("light", StringComparison.OrdinalIgnoreCase)
                    ? ThemeVariant.Light : ThemeVariant.Dark;
                Application.Current!.RequestedThemeVariant = variant;

                Window window;
                if (scene.Equals("hub", StringComparison.OrdinalIgnoreCase))
                {
                    window = new Window { Width = w, Height = h, Content = new RaceHubView() };
                    if (Application.Current.TryGetResource("VerdictHostFallbackBrush", variant, out var bg)
                        && bg is IBrush brush)
                        window.Background = brush;
                }
                else
                {
                    window = new MainWindow { Width = w, Height = h };
                }

                window.Show();

                // Dva layout passy, ať se počáteční stav usadí.
                for (int i = 0; i < 2; i++)
                {
                    window.Measure(new Size(w, h));
                    window.Arrange(new Rect(0, 0, w, h));
                    Dispatcher.UIThread.RunJobs();
                }

                using var bmp = new RenderTargetBitmap(new PixelSize(w, h), new Vector(96, 96));
                bmp.Render(window);

                Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(outPath))!);
                bmp.Save(outPath);
                Console.WriteLine($"Vyrenderovano: {outPath} ({w}x{h}, {theme}, {scene})");
                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("Render selhal: " + ex);
                return 1;
            }
        });
    }
}
