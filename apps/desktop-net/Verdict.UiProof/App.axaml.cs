using System;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using Avalonia.Media;
using Avalonia.Platform;
using Avalonia.Styling;
using Verdict.UiProof.Views;

namespace Verdict.UiProof;

public partial class App : Application
{
    // "main" = Startovní listina (dark), "hub" = Správa závodů (light).
    public static string StartScene = "main";

    public override void Initialize() => AvaloniaXamlLoader.Load(this);

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            if (StartScene == "hub")
            {
                RequestedThemeVariant = ThemeVariant.Light;
                desktop.MainWindow = BuildHubWindow();
            }
            else
            {
                desktop.MainWindow = new MainWindow();
            }
        }
        base.OnFrameworkInitializationCompleted();
    }

    private Window BuildHubWindow()
    {
        var window = new Window
        {
            Title = "Verdict — Správa závodů",
            Width = 1280,
            Height = 800,
            MinWidth = 980,
            MinHeight = 640,
            WindowStartupLocation = WindowStartupLocation.CenterScreen,
            Content = new RaceHubView(),
            Icon = new WindowIcon(AssetLoader.Open(new Uri("avares://Verdict.UI/Assets/verdict.ico"))),
        };
        if (TryGetResource("VerdictHostFallbackBrush", ThemeVariant.Light, out var bg) && bg is IBrush brush)
            window.Background = brush;
        return window;
    }
}
