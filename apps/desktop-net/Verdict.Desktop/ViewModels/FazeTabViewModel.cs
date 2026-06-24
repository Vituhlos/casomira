using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Desktop.ViewModels;

public sealed class FazeTabViewModel : ViewModelBase
{
    public FazeTabItem Item { get; }

    public FazeTabViewModel(FazeTabItem item) => Item = item;

    public ListKey Key   => Item.Key;
    public string Label  => Item.Label;
}
