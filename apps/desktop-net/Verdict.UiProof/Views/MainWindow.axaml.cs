using System;
using System.Collections.Generic;
using System.Linq;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Reactive;

namespace Verdict.UiProof.Views;

public sealed record Rider(
    string Los, string Cislo, string Prijmeni, string Jmeno,
    string Znacka, string Model);

public sealed record Kategorie(string Nazev, string Pocet, bool Selected);

public partial class MainWindow : Window
{
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

    public List<Rider> Jezdci { get; } = new (string los, string c, string p, string j, string zn, string m)[]
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
    }.Select(r => new Rider(r.los, r.c, r.p, r.j, r.zn, r.m)).ToList();

    // Šířka, pod kterou se sidebar sbalí do overlaye + hamburger.
    private const double CompactBreakpoint = 860;

    public MainWindow()
    {
        InitializeComponent();
        DataContext = this;
        this.GetObservable(BoundsProperty).Subscribe(new AnonymousObserver<Rect>(
            b => ApplyResponsive(b.Width)));
    }

    private void OnTogglePane(object? sender, RoutedEventArgs e)
        => Split.IsPaneOpen = !Split.IsPaneOpen;

    private void ApplyResponsive(double width)
    {
        if (width <= 0) return;
        bool compact = width < CompactBreakpoint;
        Split.DisplayMode = compact ? SplitViewDisplayMode.Overlay : SplitViewDisplayMode.Inline;
        Split.IsPaneOpen = !compact;
        PaneToggle.IsVisible = compact;
    }
}
