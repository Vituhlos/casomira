using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using Dapper;
using Microsoft.Extensions.DependencyInjection;
using Verdict.Core.Backup;
using Verdict.Core.Data;
using Verdict.Core.Services;
using Verdict.Desktop.ViewModels;
using Verdict.Desktop.Views;

namespace Verdict.Desktop;

public partial class App : Application
{
    private IServiceProvider? _services;

    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        DefaultTypeMap.MatchNamesWithUnderscores = true;

        _services = BuildServices();

        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            var dbCtx = _services.GetRequiredService<DbContext>();
            dbCtx.Open();

            desktop.MainWindow = new MainWindow
            {
                DataContext = _services.GetRequiredService<MainWindowViewModel>(),
            };

            desktop.Exit += (_, _) => dbCtx.Dispose();
        }

        base.OnFrameworkInitializationCompleted();
    }

    private static IServiceProvider BuildServices()
    {
        var sc = new ServiceCollection();
        sc.AddSingleton<DbContext>();
        sc.AddSingleton<IRaceService, RaceService>();
        sc.AddSingleton<ImportService>();
        sc.AddSingleton<BackupService>();
        sc.AddTransient<MainWindowViewModel>();
        return sc.BuildServiceProvider();
    }
}
