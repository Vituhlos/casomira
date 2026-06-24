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

    // ── Jezdci ────────────────────────────────────────────────────────────────
    IReadOnlyList<Jezdec> GetJezdci(int kategorieId);
    int VytvorJezdce(int kategorieId, ParsedJezdec vstup);
    void AktualizujJezdce(JezdecUprava uprava);
    void SmazJezdce(int id);

    // ── Kola + jizdy ──────────────────────────────────────────────────────────
    Kolo? GetKolo(int kategorieId, KoloTyp typ);
    int EnsureKolo(int kategorieId, KoloTyp typ);
    int VytvorJizdu(int koloId);
    void SmazJizdu(int jizdaId);

    // ── Rošty ─────────────────────────────────────────────────────────────────
    RostKolo GetRost(int koloId);
    SetRostResult SetRostPozice(int jizdaId, int pozice, int? stCislo);
    void SmazRostPozice(int jizdaId, int pozice);
    RostNavrh NavrhniRost(int kategorieId, KoloTyp typ, int? pozadovanyPocet = null);

    // ── Výsledky ──────────────────────────────────────────────────────────────
    VysledekKolo GetVysledky(int koloId);
    void InicializujVysledky(int koloId);
    void NastavVysledek(SetVysledekArg arg);
    void PrepocitejPoradi(int jizdaId);

    // ── Klasifikace ───────────────────────────────────────────────────────────
    IReadOnlyList<KlasifikaceRadek> GetKlasifikace(int kategorieId, IReadOnlyList<KoloTyp> koloTypy);

    // ── Závěr závodu (SF / Finále / Celkově) ──────────────────────────────────
    ZaverStav GetZaverStav(int kategorieId);
    RostNavrh NavrhSF(int kategorieId);
    RostNavrh NavrhFinale(int kategorieId);
    RostKolo ZapisRost(int kategorieId, KoloTyp typ, IReadOnlyList<RostZapisJizda> jizdy);
    IReadOnlyList<CelkoveRadek> GetCelkove(int kategorieId);

    // ── Stopky (měření časů) ──────────────────────────────────────────────────
    IReadOnlyList<JizdaKolaRadek> GetStopkyJizdy(int zavodId);
    IReadOnlyList<MereniRadek> GetMereni(int jizdaId);
    MereniRadek PridejMereni(int jizdaId, int casMs);
    void VratPosledniMereni(int jizdaId);
    void SmazMereniRadek(int id);
    MereniSetCisloResult SetMereniStCislo(int id, int? stCislo);
    void ZapisMereniDoVysledku(int jizdaId);
    MereniTimerStav? GetTimerStav(int jizdaId);
    void UlozTimerStav(int jizdaId, int zavodId, bool running, int baseMs, long? startEpochMs);
    void SmazTimerStav(int jizdaId);
}
