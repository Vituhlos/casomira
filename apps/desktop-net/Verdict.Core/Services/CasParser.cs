using System.Globalization;

namespace Verdict.Core.Services;

public static class CasParser
{
    /// <summary>Parsuje "mm:ss.sss", "mm:ss,sss" nebo "ss.sss" na milisekundy.</summary>
    public static int? Parse(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        text = text.Trim().Replace(',', '.');

        if (text.Contains(':'))
        {
            var parts = text.Split(':');
            if (parts.Length == 2
                && int.TryParse(parts[0], out int min)
                && double.TryParse(parts[1], NumberStyles.Any, CultureInfo.InvariantCulture, out double sec))
            {
                return (int)Math.Round((min * 60 + sec) * 1000);
            }
        }
        else if (double.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out double secOnly))
        {
            return (int)Math.Round(secOnly * 1000);
        }

        return null;
    }

    /// <summary>Formátuje milisekundy jako "mm:ss.sss".</summary>
    public static string Format(int ms)
    {
        int totalSec = ms / 1000;
        int min  = totalSec / 60;
        int sec  = totalSec % 60;
        int msRem = ms % 1000;
        return $"{min:D2}:{sec:D2}.{msRem:D3}";
    }

    /// <summary>Parsuje blok textu — jeden čas per řádek, prázdné řádky přeskočí.</summary>
    public static List<int> ParseVice(string text)
    {
        var result = new List<int>();
        foreach (var line in text.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var ms = Parse(line.Trim());
            if (ms.HasValue) result.Add(ms.Value);
        }
        return result;
    }
}
