using System.Collections.ObjectModel;
using Avalonia.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public partial class MereniRadekViewModel : ViewModelBase
{
    private readonly StopkyViewModel _parent;

    public int Id         { get; }
    public int Poradí     { get; }
    public string CasText { get; }
    public string? Prijmeni { get; private set; }
    public string? Jmeno    { get; private set; }
    public string? Znacka   { get; private set; }

    [ObservableProperty] private string _stCisloText = "";

    public MereniRadekViewModel(MereniRadek r, StopkyViewModel parent)
    {
        Id       = r.Id;
        Poradí   = r.PoradiKliku;
        CasText  = CasParser.Format(r.CasMs);
        Prijmeni = r.Prijmeni;
        Jmeno    = r.Jmeno;
        Znacka   = r.Znacka;
        _parent  = parent;
        if (r.StCislo is not null) _stCisloText = r.StCislo.Value.ToString();
    }

    partial void OnStCisloTextChanged(string value)
    {
        if (!int.TryParse(value.Trim(), out int cislo))
        {
            if (string.IsNullOrWhiteSpace(value))
                _parent.SetStCislo(this, null);
            return;
        }
        _parent.SetStCislo(this, cislo);
    }

    public void UpdateFromJezdec(Jezdec? j)
    {
        Prijmeni = j?.Prijmeni;
        Jmeno    = j?.Jmeno;
        Znacka   = j?.Znacka;
        OnPropertyChanged(nameof(Prijmeni));
        OnPropertyChanged(nameof(Jmeno));
        OnPropertyChanged(nameof(Znacka));
    }
}

public partial class StopkyViewModel : ViewModelBase
{
    private readonly IRaceService _svc;
    private readonly int _zavodId;

    private readonly DispatcherTimer _timer;
    private int  _baseMs;
    private long _startEpochMs;

    public ObservableCollection<JizdaKolaRadek> Jizdy   { get; } = [];
    public ObservableCollection<MereniRadekViewModel> Zaznamy { get; } = [];

    [ObservableProperty] private JizdaKolaRadek? _selectedJizda;
    [ObservableProperty] private string _elapsedText = "00:00.0";
    [ObservableProperty] [NotifyPropertyChangedFor(nameof(StartStopLabel))] private bool _running;
    [ObservableProperty] private string? _statusText;
    [ObservableProperty] private bool _maVseStCislo;

    public string StartStopLabel => Running ? "■ Stop" : "▶ Start";

    public StopkyViewModel(IRaceService svc, int zavodId)
    {
        _svc     = svc;
        _zavodId = zavodId;

        _timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(100) };
        _timer.Tick += (_, _) => AktualizujElapsed();

        NactiJizdy();
    }

    private void NactiJizdy()
    {
        Jizdy.Clear();
        foreach (var j in _svc.GetStopkyJizdy(_zavodId))
            Jizdy.Add(j);
    }

    partial void OnSelectedJizdaChanged(JizdaKolaRadek? value)
    {
        _timer.Stop();
        Running = false;
        _baseMs = 0;
        StatusText = null;
        NactiZaznamy();

        if (value is not null)
        {
            var stav = _svc.GetTimerStav(value.JizdaId);
            if (stav is not null)
            {
                _baseMs = stav.BaseMs;
                if (stav.Running && stav.StartEpochMs is not null)
                {
                    _startEpochMs = stav.StartEpochMs.Value;
                    Running = true;
                    _timer.Start();
                }
            }
            AktualizujElapsed();
        }
        else
        {
            ElapsedText = "00:00.0";
        }
    }

    private void NactiZaznamy()
    {
        Zaznamy.Clear();
        if (SelectedJizda is null) return;
        foreach (var r in _svc.GetMereni(SelectedJizda.JizdaId))
            Zaznamy.Add(new MereniRadekViewModel(r, this));
        AktualizujMaVseStCislo();
    }

    private void AktualizujElapsed()
    {
        int totalMs = Running
            ? _baseMs + (int)(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - _startEpochMs)
            : _baseMs;
        if (totalMs < 0) totalMs = 0;
        int ds = totalMs / 100 % 10;
        int ss = totalMs / 1000 % 60;
        int mm = totalMs / 60000;
        ElapsedText = $"{mm:D2}:{ss:D2}.{ds}";
    }

    private void AktualizujMaVseStCislo()
    {
        MaVseStCislo = Zaznamy.Count > 0 && Zaznamy.All(z => !string.IsNullOrWhiteSpace(z.StCisloText));
    }

    [RelayCommand]
    private void StartStop()
    {
        if (SelectedJizda is null) return;

        if (Running)
        {
            _timer.Stop();
            long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _baseMs += (int)(now - _startEpochMs);
            Running = false;
            AktualizujElapsed();
            _svc.UlozTimerStav(SelectedJizda.JizdaId, _zavodId, false, _baseMs, null);
        }
        else
        {
            _startEpochMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            Running = true;
            _timer.Start();
            _svc.UlozTimerStav(SelectedJizda.JizdaId, _zavodId, true, _baseMs, _startEpochMs);
        }
        StatusText = null;
    }

    [RelayCommand]
    private void Reset()
    {
        if (SelectedJizda is null) return;
        _timer.Stop();
        Running = false;
        _baseMs = 0;
        ElapsedText = "00:00.0";
        _svc.SmazTimerStav(SelectedJizda.JizdaId);
        StatusText = null;
    }

    [RelayCommand]
    private void Klik()
    {
        if (SelectedJizda is null) return;
        if (!Running)
        {
            StatusText = "Stopky nejsou spuštěny — stiskni Start.";
            return;
        }
        int casMs = _baseMs + (int)(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - _startEpochMs);
        var zaznam = _svc.PridejMereni(SelectedJizda.JizdaId, casMs);
        Zaznamy.Add(new MereniRadekViewModel(zaznam, this));
        AktualizujMaVseStCislo();
        StatusText = null;
    }

    [RelayCommand]
    private void VratPosledni()
    {
        if (SelectedJizda is null || Zaznamy.Count == 0) return;
        _svc.VratPosledniMereni(SelectedJizda.JizdaId);
        Zaznamy.RemoveAt(Zaznamy.Count - 1);
        AktualizujMaVseStCislo();
        StatusText = null;
    }

    [RelayCommand]
    private void SmazRadek(MereniRadekViewModel? vm)
    {
        if (vm is null) return;
        _svc.SmazMereniRadek(vm.Id);
        Zaznamy.Remove(vm);
        AktualizujMaVseStCislo();
    }

    internal void SetStCislo(MereniRadekViewModel vm, int? stCislo)
    {
        var result = _svc.SetMereniStCislo(vm.Id, stCislo);
        if (!result.Ok)
        {
            StatusText = result.Duplicitni
                ? $"St. č. {stCislo} je v jízdě přiřazeno jinému záznamu."
                : $"St. č. {stCislo} nebylo nalezeno v startovní listině.";
        }
        else
        {
            StatusText = null;
            vm.UpdateFromJezdec(result.Jezdec);
        }
        AktualizujMaVseStCislo();
    }

    [RelayCommand]
    private void ZapsatDoVysledku()
    {
        if (SelectedJizda is null) return;
        _svc.ZapisMereniDoVysledku(SelectedJizda.JizdaId);
        NactiJizdy();
        var jizdaId = SelectedJizda.JizdaId;
        SelectedJizda = Jizdy.FirstOrDefault(j => j.JizdaId == jizdaId);
        StatusText = "Časy zapsány do výsledků.";
    }

    public void Dispose()
    {
        _timer.Stop();
        if (SelectedJizda is not null && Running)
        {
            long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            int saved = _baseMs + (int)(now - _startEpochMs);
            _svc.UlozTimerStav(SelectedJizda.JizdaId, _zavodId, false, saved, null);
        }
    }
}
