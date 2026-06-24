using Verdict.Core.Model;

namespace Verdict.Core.Services;

/// <summary>
/// Minimální kontrakt pro Phase 2 shell + postupně rozšiřovaný v Phase 3.
/// Nahrazuje IPC kanály z ipc.ts — vše je teď v jednom procesu.
/// </summary>
public interface IRaceService
{
    // ── Závody ────────────────────────────────────────────────────────────────
    IReadOnlyList<ZavodInfo> GetZavody();
    ZavodInfo? GetZavod(int zavodId);
    int VytvorZavod(NovyZavod vstup);
    void AktualizujZavod(ZavodUprava uprava);
    void SmazZavod(int zavodId);

    // ── Kategorie ─────────────────────────────────────────────────────────────
    IReadOnlyList<Kategorie> GetKategorie(int zavodId);
    int VytvorKategorii(int zavodId, KategorieVstup vstup);
}
