namespace Verdict.Core.Model;

/// <summary>Typ závodu — volí se při founded a určuje kostru fází. CLAUDE.md §3.</summary>
public enum RaceType { RAC, RX }

/// <summary>Pravidlová sada kategorie. Aktivní je pouze STANDARD. CLAUDE.md §3.</summary>
public enum Ruleset { STANDARD }

/// <summary>Typ kola (fáze závodu). F_A / F_B existují v DB jako legacy, ale ve veřejném API se nepoužívají.</summary>
public enum KoloTyp { Q1, Q2, Q3, SF, F }

/// <summary>Stav jezdce v jízdě. CLAUDE.md §5.</summary>
public enum Stav { OK, DNF, DNS, DQ }

/// <summary>Druh zásahu ředitele (audit log). CLAUDE.md §11.</summary>
public enum UpravaTyp
{
    CASOVA_PENALIZACE,
    BODOVA_PENALIZACE,
    POSUN_PORADI,
    ZRUSENI
}

/// <summary>Pole jezdce editovatelné inline ve Startovní listině.</summary>
public enum JezdecPole { Los, StCislo, Prijmeni, Jmeno, Znacka, Model }

/// <summary>Politika importu při konfliktu startovního čísla.</summary>
public enum ImportPolicy { Overwrite, Skip }

/// <summary>Identifikátor tiskového listu (PDF export). CLAUDE.md §12.</summary>
public enum ListKey
{
    Start,
    GridQ1, GridQ2, GridQ3,
    ResQ1, ResQ2, ResQ3,
    ResQ1Agg, ResQ2Agg,
    ClassQ2, ClassQ3,
    SfRost, SfRes,
    FinalRost, FinalRes,
    Overall
}
