using System.Runtime.CompilerServices;
using Dapper;

namespace Verdict.Tests;

internal static class TestSetup
{
    // Stejné globální nastavení jako App.OnFrameworkInitializationCompleted —
    // musí proběhnout dřív, než Dapper poprvé materializuje record (KategorieRow…),
    // jinak se snake_case sloupce nenamapují na PascalCase parametry konstruktoru.
    [ModuleInitializer]
    public static void Init() => DefaultTypeMap.MatchNamesWithUnderscores = true;
}
