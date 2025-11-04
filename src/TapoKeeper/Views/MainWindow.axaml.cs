using Avalonia.Controls;
using Avalonia.Data.Converters;
using System;
using System.Globalization;

namespace TapoKeeper.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }
}

namespace TapoKeeper.ViewModels;

// Status converter for device on/off
public static partial class MainWindowViewModel
{
    public static readonly IValueConverter StatusConverter =
        new FuncValueConverter<bool, string>(on => on ? "🟢 ON" : "🔴 OFF");
}
