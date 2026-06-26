using System.Collections.Generic;
using Avalonia.Controls;
using Avalonia.Media;

namespace Verdict.UiProof.Views;

public sealed record Rider(
    string Los, string Cislo, string Prijmeni, string Jmeno,
    string Znacka, string Model, IBrush RowBackground);

public sealed record Kategorie(string Nazev, string Pocet, bool Selected);

public partial class MainWindow : Window
{
    private static readonly IBrush Zebra = new SolidColorBrush(Color.Parse("#0AFFFFFF"));
    private static readonly IBrush None = Brushes.Transparent;

    public List<Kategorie> Kategorie { get; } = new()
    {
        new("Junior", "9", false),
        new("N1400", "10", false),
        new("N1600", "19", true),
        new("N1600+", "7", false),
        new("S1600", "9", false),
        new("S1600+", "8", false),
        new("Tuning", "19", false),
        new("Škoda Cup", "10", false),
        new("Cross Cup", "14", false),
        new("Dámský pohár", "9", false),
        new("Šotolina", "10", false),
    };

    public List<Rider> Jezdci { get; }

    public MainWindow()
    {
        var raw = new (string los, string c, string p, string j, string zn, string m)[]
        {
            ("4", "3", "Pokorný", "Radek", "Škoda", "Favorit"),
            ("8", "7", "Novák", "Petr", "Škoda", "Fabia"),
            ("12", "88", "Veselý", "Jan", "Renault", "Clio"),
            ("17", "41", "Dvořák", "Martin", "Citroën", "Saxo"),
            ("19", "28", "Beneš", "Jiří", "Ford", "Fiesta"),
            ("25", "94", "Lagron", "Jaroslav", "Peugeot", "306"),
            ("28", "64", "Němec", "David", "Opel", "Corsa"),
            ("32", "197", "Vnouček", "Franta", "Peugeot", "206"),
            ("39", "55", "Procházka", "Tomáš", "Peugeot", "205"),
            ("43", "5", "Král", "Michal", "Citroën", "C2"),
            ("46", "93", "Ladra", "Štěpán", "Škoda", "Favorit"),
            ("54", "11", "Šaroun", "Adam", "Volkswagen", "Lupo"),
            ("60", "71", "Marek", "Ondřej", "Peugeot", "106"),
        };

        var list = new List<Rider>();
        for (int i = 0; i < raw.Length; i++)
        {
            var r = raw[i];
            list.Add(new Rider(r.los, r.c, r.p, r.j, r.zn, r.m,
                i % 2 == 1 ? Zebra : None));
        }
        Jezdci = list;

        InitializeComponent();
        DataContext = this;
    }
}
