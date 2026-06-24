using Verdict.Core.Model;

namespace Verdict.Core.Services;

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
