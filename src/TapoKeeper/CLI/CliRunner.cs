using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Spectre.Console;
using TapoKeeper.Models;
using TapoKeeper.Services;

namespace TapoKeeper.CLI;

/// <summary>
/// Runs TapoKeeper in CLI/TUI mode with terminal UI
/// Preserves exact functionality from the original Node.js version
/// </summary>
public class CliRunner
{
    private ConfigurationService? _configService;
    private AppConfig? _config;
    private TapoService? _tapoService;
    private DeviceDiscoveryService? _discoveryService;
    private DataExportService? _exportService;
    private List<TapoDevice> _devices = new();
    private CancellationTokenSource? _cancellationTokenSource;
    private bool _isGraphMode;
    private readonly Dictionary<DateTime, Dictionary<string, double>> _powerHistory = new();

    public async Task<int> RunAsync(string[] args)
    {
        try
        {
            // Initialize services
            _configService = new ConfigurationService();
            _config = _configService.LoadConfiguration(args);
            _configService.ValidateConfiguration(_config);

            _tapoService = new TapoService(_config.TapoEmail, _config.TapoPassword, _config.Verbose);
            _discoveryService = new DeviceDiscoveryService(_tapoService, _config);
            _exportService = new DataExportService(_config);

            // Login to Tapo Cloud
            if (!await _tapoService.LoginAsync())
            {
                AnsiConsole.MarkupLine("[red]Failed to login to Tapo Cloud. Please check your credentials.[/]");
                return 1;
            }

            // Check mode
            _isGraphMode = args.Contains("--graph");
            var isDumpMode = args.Contains("--dump");

            if (isDumpMode)
            {
                return await RunDumpModeAsync(args);
            }
            else if (_isGraphMode)
            {
                return await RunGraphModeAsync();
            }
            else
            {
                return await RunInteractiveModeAsync();
            }
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[red]Error: {ex.Message}[/]");
            if (_config?.Verbose == true)
            {
                AnsiConsole.WriteException(ex);
            }
            return 1;
        }
    }

    /// <summary>
    /// Dump mode: One-shot data collection and export
    /// </summary>
    private async Task<int> RunDumpModeAsync(string[] args)
    {
        AnsiConsole.Status()
            .Start("Discovering devices...", ctx =>
            {
                _devices = _discoveryService!.DiscoverDevicesAsync(forceRefresh: true).GetAwaiter().GetResult();
            });

        if (_devices.Count == 0)
        {
            AnsiConsole.MarkupLine("[yellow]No devices found.[/]");
            return 1;
        }

        // Check dump variant
        var dumpType = args.SkipWhile(a => a != "--dump").Skip(1).FirstOrDefault() ?? "md";

        // Handle special dump modes
        if (dumpType == "switchon")
        {
            await TurnOnAllDevicesAsync();
            await Task.Delay(2000); // Wait for devices to stabilize
            await RefreshDeviceDataAsync();
        }
        else if (dumpType == "togglecheck")
        {
            var originalStates = _devices.ToDictionary(d => d.IpAddress, d => d.DeviceOn);
            await TurnOnAllDevicesAsync();
            await Task.Delay(2000);
            await RefreshDeviceDataAsync();

            // Export first
            if (dumpType == "csv" || args.Contains("csv"))
                await _exportService!.ExportToCsvAsync(_devices);
            else
                await _exportService!.ExportToMarkdownAsync(_devices);

            // Restore states
            await RestoreDeviceStatesAsync(originalStates);
            return 0;
        }

        // Normal dump
        if (dumpType == "csv" || args.Contains("csv"))
        {
            await _exportService!.ExportToCsvAsync(_devices);
        }
        else
        {
            await _exportService!.ExportToMarkdownAsync(_devices);
        }

        return 0;
    }

    /// <summary>
    /// Interactive mode: Live table with keyboard controls
    /// </summary>
    private async Task<int> RunInteractiveModeAsync()
    {
        _cancellationTokenSource = new CancellationTokenSource();
        var token = _cancellationTokenSource.Token;

        AnsiConsole.Clear();
        AnsiConsole.Write(new Rule("[cyan]TapoKeeper - Interactive Mode[/]"));
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[dim]Controls: 1-9=Toggle device, d=Dump MD, c=Dump CSV, q=Quit[/]");
        AnsiConsole.WriteLine();

        // Start keyboard listener task
        var keyListenerTask = Task.Run(() => KeyboardListener(token), token);

        // Main update loop
        while (!token.IsCancellationRequested)
        {
            try
            {
                // Discover devices
                _devices = await _discoveryService!.DiscoverDevicesAsync();

                // Display table
                DisplayDeviceTable();

                // Wait for next update
                await Task.Delay(_config!.PollIntervalMs, token);
            }
            catch (TaskCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                if (_config?.Verbose == true)
                {
                    AnsiConsole.MarkupLine($"[red]Error: {ex.Message}[/]");
                }
            }
        }

        return 0;
    }

    /// <summary>
    /// Graph mode: Real-time power consumption graphs
    /// </summary>
    private async Task<int> RunGraphModeAsync()
    {
        _cancellationTokenSource = new CancellationTokenSource();
        var token = _cancellationTokenSource.Token;

        AnsiConsole.Clear();
        AnsiConsole.Write(new Rule("[cyan]TapoKeeper - Graph Mode[/]"));
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[dim]Press 'q' to quit[/]");
        AnsiConsole.WriteLine();

        // Start keyboard listener
        var keyListenerTask = Task.Run(() => KeyboardListener(token), token);

        // Main update loop
        while (!token.IsCancellationRequested)
        {
            try
            {
                // Discover and update devices
                _devices = await _discoveryService!.DiscoverDevicesAsync();

                // Record power history
                RecordPowerHistory();

                // Display graph
                DisplayPowerGraph();

                await Task.Delay(_config!.PollIntervalMs, token);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }

        return 0;
    }

    /// <summary>
    /// Display device information in a table
    /// </summary>
    private void DisplayDeviceTable()
    {
        Console.SetCursorPosition(0, 4);

        var table = new Table()
            .Border(TableBorder.Rounded)
            .BorderColor(Color.Cyan);

        table.AddColumn(new TableColumn("#").Centered());
        table.AddColumn("Device");
        table.AddColumn("Model");
        table.AddColumn("Status");
        table.AddColumn("Power");
        table.AddColumn("Today");
        table.AddColumn("Month");
        table.AddColumn("Voltage");
        table.AddColumn("Current");
        table.AddColumn("IP Address");

        int index = 1;
        foreach (var device in _devices.OrderBy(d => d.Alias))
        {
            var status = device.DeviceOn ? "[green]●[/] ON" : "[red]●[/] OFF";
            var power = device.CurrentPower != null ? $"{device.CurrentPower.CurrentPowerW:F2} W" : "[dim]N/A[/]";
            var today = device.CurrentPower != null ? $"{device.CurrentPower.TodayEnergyKwh:F3} kWh" : "[dim]N/A[/]";
            var month = device.CurrentPower != null ? $"{device.CurrentPower.MonthEnergyKwh:F3} kWh" : "[dim]N/A[/]";
            var voltage = device.CurrentPower != null ? $"{device.CurrentPower.CurrentVoltageV:F1} V" : "[dim]N/A[/]";
            var current = device.CurrentPower != null ? $"{device.CurrentPower.CurrentCurrentA:F3} A" : "[dim]N/A[/]";

            table.AddRow(
                $"[cyan]{index}[/]",
                device.Alias,
                device.Model,
                status,
                power,
                today,
                month,
                voltage,
                current,
                $"[dim]{device.IpAddress}[/]"
            );

            index++;
        }

        // Summary row
        var totalPowerW = _devices.Where(d => d.CurrentPower != null).Sum(d => d.CurrentPower!.CurrentPowerW);
        var totalTodayKwh = _devices.Where(d => d.CurrentPower != null).Sum(d => d.CurrentPower!.TodayEnergyKwh);
        var totalMonthKwh = _devices.Where(d => d.CurrentPower != null).Sum(d => d.CurrentPower!.MonthEnergyKwh);

        table.AddRow(
            "[bold yellow]TOTAL[/]",
            $"[bold]{_devices.Count} devices[/]",
            "",
            "",
            $"[bold yellow]{totalPowerW:F2} W[/]",
            $"[bold yellow]{totalTodayKwh:F3} kWh[/]",
            $"[bold yellow]{totalMonthKwh:F3} kWh[/]",
            "",
            "",
            ""
        );

        AnsiConsole.Write(table);
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine($"[dim]Last updated: {DateTime.Now:HH:mm:ss}[/]");
    }

    /// <summary>
    /// Display power consumption graph
    /// </summary>
    private void DisplayPowerGraph()
    {
        Console.SetCursorPosition(0, 4);

        // Show device table first
        DisplayDeviceTable();

        AnsiConsole.WriteLine();
        AnsiConsole.Write(new Rule("[cyan]Power Consumption Graph[/]"));
        AnsiConsole.WriteLine();

        // Create ASCII bar chart for each device
        var chart = new BarChart()
            .Width(80)
            .Label("[cyan bold]Current Power Usage[/]");

        foreach (var device in _devices.Where(d => d.CurrentPower != null).OrderByDescending(d => d.CurrentPower!.CurrentPowerW))
        {
            var color = device.DeviceOn ? Color.Green : Color.Grey;
            chart.AddItem(device.Alias, device.CurrentPower!.CurrentPowerW, color);
        }

        AnsiConsole.Write(chart);
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine($"[dim]Graph time window: {_config!.GraphTimeMinutes} minutes | Last updated: {DateTime.Now:HH:mm:ss}[/]");
    }

    /// <summary>
    /// Listen for keyboard input
    /// </summary>
    private void KeyboardListener(CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            if (Console.KeyAvailable)
            {
                var key = Console.ReadKey(intercept: true);

                switch (key.KeyChar)
                {
                    case 'q':
                    case 'Q':
                        _cancellationTokenSource?.Cancel();
                        return;

                    case 'd':
                    case 'D':
                        Task.Run(async () => await _exportService!.ExportToMarkdownAsync(_devices));
                        break;

                    case 'c':
                    case 'C':
                        Task.Run(async () => await _exportService!.ExportToCsvAsync(_devices));
                        break;

                    case >= '1' and <= '9':
                        var index = key.KeyChar - '1';
                        if (index < _devices.Count)
                        {
                            var device = _devices.OrderBy(d => d.Alias).ElementAt(index);
                            Task.Run(async () => await ToggleDeviceAsync(device));
                        }
                        break;
                }
            }

            Thread.Sleep(100);
        }
    }

    private void RecordPowerHistory()
    {
        var now = DateTime.Now;
        var history = new Dictionary<string, double>();

        foreach (var device in _devices.Where(d => d.CurrentPower != null))
        {
            history[device.Alias] = device.CurrentPower!.CurrentPowerW;
        }

        _powerHistory[now] = history;

        // Clean up old history beyond time window
        var cutoff = now.AddMinutes(-_config!.GraphTimeMinutes);
        var keysToRemove = _powerHistory.Keys.Where(k => k < cutoff).ToList();
        foreach (var key in keysToRemove)
        {
            _powerHistory.Remove(key);
        }
    }

    private async Task ToggleDeviceAsync(TapoDevice device)
    {
        var newState = !device.DeviceOn;
        await _tapoService!.ToggleDeviceAsync(device.IpAddress, newState);
        device.DeviceOn = newState;
    }

    private async Task TurnOnAllDevicesAsync()
    {
        var tasks = _devices.Where(d => !d.DeviceOn)
            .Select(d => _tapoService!.ToggleDeviceAsync(d.IpAddress, true));
        await Task.WhenAll(tasks);
    }

    private async Task RestoreDeviceStatesAsync(Dictionary<string, bool> originalStates)
    {
        var tasks = _devices
            .Where(d => originalStates.ContainsKey(d.IpAddress) && d.DeviceOn != originalStates[d.IpAddress])
            .Select(d => _tapoService!.ToggleDeviceAsync(d.IpAddress, originalStates[d.IpAddress]));
        await Task.WhenAll(tasks);
    }

    private async Task RefreshDeviceDataAsync()
    {
        var tasks = _devices.Select(d => _tapoService!.GetDeviceInfoAsync(d.IpAddress));
        var results = await Task.WhenAll(tasks);

        for (int i = 0; i < _devices.Count; i++)
        {
            if (results[i] != null)
            {
                _devices[i] = results[i]!;
            }
        }
    }
}
