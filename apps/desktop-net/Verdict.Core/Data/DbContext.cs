using Microsoft.Data.Sqlite;
using System.Runtime.InteropServices;

namespace Verdict.Core.Data;

/// <summary>
/// Sprava pripojeni k SQLite databazi verdict.db.
/// Port z src/main/db/connection.ts — stejny soubor, stejna cesta, WAL + FK.
///
/// Cesta (CLAUDE.md plan-avalonia §8.1):
///   Windows : %AppData%\Verdict\verdict.db
///   macOS   : ~/Library/Application Support/Verdict/verdict.db
/// </summary>
public sealed class DbContext : IDisposable
{
    private const string DbFile = "verdict.db";
    private const string AppName = "Verdict";

    private SqliteConnection? _connection;
    private readonly string _dbPath;

    public DbContext(string? overridePath = null)
    {
        _dbPath = overridePath ?? ResolveDbPath();
    }

    public SqliteConnection Connection => _connection ?? throw new InvalidOperationException(
        "DbContext neni inicializovan — zavolej Open() nejdrive.");

    /// <summary>Cesta k databazovemu souboru (pro diagnostiku a zalohu).</summary>
    public string DbPath => _dbPath;

    /// <summary>
    /// Otevre (pri prvnim spusteni vytvori) databazi, spusti migrace a seed.
    /// Odpovida getDb() z connection.ts.
    /// </summary>
    public void Open()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_dbPath)!);

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = _dbPath,
            Mode = SqliteOpenMode.ReadWriteCreate,
        }.ToString();

        _connection = new SqliteConnection(connectionString);
        _connection.Open();

        // WAL + foreign keys — stejna nastaveni jako v Electronu.
        Execute("PRAGMA journal_mode = WAL");
        Execute("PRAGMA foreign_keys = ON");

        Migrations.Migrate(_connection);
        Seed.Run(_connection);
    }

    public void Dispose()
    {
        _connection?.Dispose();
        _connection = null;
    }

    private void Execute(string sql)
    {
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = sql;
        cmd.ExecuteNonQuery();
    }

    private static string ResolveDbPath()
    {
        string userDataDir;

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            // %AppData%\Verdict  (= C:\Users\<user>\AppData\Roaming\Verdict)
            userDataDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                AppName);
        }
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            // ~/Library/Application Support/Verdict
            userDataDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Library", "Application Support", AppName);
        }
        else
        {
            // Linux / ostatni — XDG_DATA_HOME nebo ~/.local/share/Verdict
            string xdg = Environment.GetEnvironmentVariable("XDG_DATA_HOME")
                ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                   ".local", "share");
            userDataDir = Path.Combine(xdg, AppName);
        }

        return Path.Combine(userDataDir, DbFile);
    }
}
