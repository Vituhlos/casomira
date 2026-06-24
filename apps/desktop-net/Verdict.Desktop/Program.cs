using Avalonia;
using Velopack;

namespace Verdict.Desktop;

sealed class Program
{
    [STAThread]
    public static void Main(string[] args)
    {
        // Velopack musí běžet jako úplně první — zpracuje install/uninstall hooky
        // a v normálním běhu se okamžitě vrátí.
        VelopackApp.Build().Run();

        BuildAvaloniaApp().StartWithClassicDesktopLifetime(args);
    }

    // Avalonia configuration, don't remove; also used by visual designer.
    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
            .UsePlatformDetect()
#if DEBUG
            .WithDeveloperTools()
#endif
            .WithInterFont()
            .LogToTrace();
}
