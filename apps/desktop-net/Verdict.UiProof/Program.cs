using System;
using System.IO;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Headless;
using Avalonia.Media.Imaging;
using Avalonia.Threading;
using Verdict.UiProof.Views;

namespace Verdict.UiProof;

internal static class Program
{
    [STAThread]
    public static int Main(string[] args)
    {
        // Headless PNG náhled: dotnet run -- --render <cesta> [šířka výška]
        if (args.Length >= 2 && args[0] == "--render")
            return RenderToPng(args);

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

        AppBuilder.Configure<App>()
            .UseHeadless(new AvaloniaHeadlessPlatformOptions { UseHeadlessDrawing = false })
            .UseSkia()
            .WithInterFont()
            .SetupWithoutStarting();

        return Dispatcher.UIThread.Invoke(() =>
        {
            try
            {
                var window = new MainWindow { Width = w, Height = h };
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
                Console.WriteLine($"Vyrenderováno: {outPath} ({w}x{h})");
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
