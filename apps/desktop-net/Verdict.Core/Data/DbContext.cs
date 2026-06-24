using Microsoft.Data.Sqlite;
using System.Runtime.InteropServices;

namespace Verdict.Core.Data;

/// <summary>
/// Připojení k verdict.db.
/// Windows: %AppData%\Verdict\verdict.db
/// macOS:   ~/Library/Application Support/Verdict/verdict.db
/// Linux:   $XDG_DATA_HOME/Verdict/verdict.db
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
        "DbContext není inicializován — zavolej Open() nejdříve.");

    public string DbPath => _dbPath;

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
            userDataDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                AppName);
        }
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            userDataDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Library", "Application Support", AppName);
        }
        else
        {
            string xdg = Environment.GetEnvironmentVariable("XDG_DATA_HOME")
                ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                   ".local", "share");
            userDataDir = Path.Combine(xdg, AppName);
        }

        return Path.Combine(userDataDir, DbFile);
    }
}
