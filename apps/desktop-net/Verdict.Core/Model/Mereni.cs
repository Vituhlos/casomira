namespace Verdict.Core.Model;

/// <summary>Jeden zaznam stopek (jedno kliknuti v cili). CLAUDE.md §13.</summary>
public record MereniRadek(
    int Id,
    int JizdaId,
    int PoradiKliku,
    int CasMs,
    int? JezdecId,
    int? StCislo,
    string? Prijmeni,
    string? Jmeno,
    string? Znacka,
    string? Model);

/// <summary>Navrh predvyberu pri otevreni stopek — prvni neodmerena jizda.</summary>
public record MereniDalsiJizda(int KatId, KoloTyp KoloTyp, int JizdaId);

/// <summary>Ulozeny stav casovace jedne jizdy (prezije zavreni okna/pad).</summary>
public record MereniTimerStav(
    int JizdaId,
    bool Running,
    int BaseMs,
    long? StartEpochMs);

/// <summary>Soubeznie rozmerena jizda (kanal stopek) — pro prehled a prepinani.</summary>
public record MereniKanal(
    int JizdaId,
    int KategorieId,
    KoloTyp KoloTyp,
    int JizdaCislo,
    int Pocet,
    string Label);

/// <summary>Odpoved na prirazeni st. cisla k zaznamu mereni.</summary>
public record MereniSetCisloResult(bool Ok, Jezdec? Jezdec, bool Duplicitni = false);

/// <summary>Jizda kola kriz kategoriemi — pro navigaci stopek.</summary>
public record JizdaKolaRadek(
    int JizdaId,
    int KategorieId,
    string KatNazev,
    KoloTyp KoloTyp,
    int JizdaCislo,
    int PocetKliku,
    bool MaVysledky,
    int ObsazenoRostem,
    string Label);
