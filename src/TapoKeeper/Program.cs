using System;
using System.Linq;
using System.Threading.Tasks;
using Avalonia;
using TapoKeeper.CLI;
using TapoKeeper.Services;

namespace TapoKeeper;

class Program
{
    // Initialization code. Don't use any Avalonia, third-party APIs or any
    // SynchronizationContext-reliant code before AppMain is called: things aren't initialized
    // yet and stuff might break.
    [STAThread]
    public static async Task<int> Main(string[] args)
    {
        // Check for CLI mode flags
        bool isCliMode = args.Contains("--cli") ||
                        args.Contains("--dump") ||
                        args.Contains("--graph") ||
                        args.Contains("--help") ||
                        args.Contains("-h");

        if (args.Contains("--help") || args.Contains("-h"))
        {
            ShowHelp();
            return 0;
        }

        if (isCliMode)
        {
            // Run in CLI mode (preserve original functionality)
            var cliRunner = new CliRunner();
            return await cliRunner.RunAsync(args);
        }
        else
        {
            // Run in GUI mode (Avalonia UI)
            return BuildAvaloniaApp()
                .StartWithClassicDesktopLifetime(args);
        }
    }

    // Avalonia configuration, don't remove; also used by visual designer.
    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
            .UsePlatformDetect()
            .WithInterFont()
            .LogToTrace();

    private static void ShowHelp()
    {
        Console.WriteLine(@"
TapoKeeper - TP-Link Tapo Smart Plug Monitor v2.0
=================================================

USAGE:
    tapokeeper [OPTIONS]

GUI MODE (default):
    tapokeeper                          Launch Avalonia UI interface

CLI MODE OPTIONS:
    --cli                               Run in CLI/TUI mode (terminal interface)
    --graph                             Display real-time power graphs in terminal
    --graph-time <minutes>              Time window for graph (default: 2 minutes)

DUMP MODE:
    --dump [format]                     One-shot data collection and exit
                                        Formats: md (markdown), csv
                                        Default: md
    --dump switchon                     Turn ON all OFF devices before dump
    --dump togglecheck                  Turn ON, dump, then restore original state

CONFIGURATION:
    --email <email>                     Tapo account email
    --password <password>               Tapo account password
    --poll-interval <ms>                Update frequency (default: 5000ms)
    --manual-ips <mappings>             Manual MAC=IP mappings
                                        Format: MAC1=IP1,MAC2=IP2

    Configuration can also be set via environment variables or env file:
    - TAPO_EMAIL
    - TAPO_PASSWORD
    - POLL_INTERVAL
    - MANUAL_IPS

DISCOVERY OPTIONS:
    --verbose                           Enable verbose logging
    --no-cache                          Disable device list caching

EXAMPLES:
    # Launch GUI
    tapokeeper

    # Interactive CLI mode with live table
    tapokeeper --cli

    # Graph mode showing real-time power consumption
    tapokeeper --graph --graph-time 5

    # Quick data dump to markdown
    tapokeeper --dump

    # Dump to CSV
    tapokeeper --dump csv

    # Turn on all devices, then dump
    tapokeeper --dump switchon

SUPPORTED DEVICES:
    ✓ P110  - Energy Monitoring Smart Plug
    ✓ P115  - Mini Energy Monitoring Smart Plug
    ⚠ P100/P105 - Basic control only (no energy monitoring)

CONTROLS (CLI Mode):
    1-9     Toggle device on/off
    d       Dump data to markdown file
    c       Dump data to CSV file
    q       Quit

MORE INFO:
    Repository: https://github.com/audient-void/TapoKeeper
    License: AGPL v3 / Commercial
    Contact: tapokeeper@redflux.nyc
");
    }
}
