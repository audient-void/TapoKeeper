using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Reactive;
using System.Threading;
using System.Threading.Tasks;
using ReactiveUI;
using TapoKeeper.Models;
using TapoKeeper.Services;

namespace TapoKeeper.ViewModels;

public class MainWindowViewModel : ViewModelBase
{
    private readonly ConfigurationService _configService;
    private TapoService? _tapoService;
    private DeviceDiscoveryService? _discoveryService;
    private DataExportService? _exportService;
    private AppConfig? _config;
    private CancellationTokenSource? _cancellationTokenSource;
    private Timer? _updateTimer;

    private string _statusMessage = "Ready to connect...";
    private bool _isConnected;
    private bool _isScanning;
    private double _totalPowerW;
    private double _totalTodayKwh;
    private double _totalMonthKwh;
    private double _estimatedCost;

    public MainWindowViewModel()
    {
        _configService = new ConfigurationService();
        Devices = new ObservableCollection<TapoDevice>();

        // Commands
        ConnectCommand = ReactiveCommand.CreateFromTask(ConnectAsync);
        RefreshCommand = ReactiveCommand.CreateFromTask(RefreshDevicesAsync);
        ToggleDeviceCommand = ReactiveCommand.CreateFromTask<TapoDevice>(ToggleDeviceAsync);
        ExportMarkdownCommand = ReactiveCommand.CreateFromTask(ExportMarkdownAsync);
        ExportCsvCommand = ReactiveCommand.CreateFromTask(ExportCsvAsync);
    }

    // Properties
    public ObservableCollection<TapoDevice> Devices { get; }

    public string StatusMessage
    {
        get => _statusMessage;
        set => this.RaiseAndSetIfChanged(ref _statusMessage, value);
    }

    public bool IsConnected
    {
        get => _isConnected;
        set => this.RaiseAndSetIfChanged(ref _isConnected, value);
    }

    public bool IsScanning
    {
        get => _isScanning;
        set => this.RaiseAndSetIfChanged(ref _isScanning, value);
    }

    public double TotalPowerW
    {
        get => _totalPowerW;
        set => this.RaiseAndSetIfChanged(ref _totalPowerW, value);
    }

    public double TotalTodayKwh
    {
        get => _totalTodayKwh;
        set => this.RaiseAndSetIfChanged(ref _totalTodayKwh, value);
    }

    public double TotalMonthKwh
    {
        get => _totalMonthKwh;
        set => this.RaiseAndSetIfChanged(ref _totalMonthKwh, value);
    }

    public double EstimatedCost
    {
        get => _estimatedCost;
        set => this.RaiseAndSetIfChanged(ref _estimatedCost, value);
    }

    // Commands
    public ReactiveCommand<Unit, Unit> ConnectCommand { get; }
    public ReactiveCommand<Unit, Unit> RefreshCommand { get; }
    public ReactiveCommand<TapoDevice, Unit> ToggleDeviceCommand { get; }
    public ReactiveCommand<Unit, Unit> ExportMarkdownCommand { get; }
    public ReactiveCommand<Unit, Unit> ExportCsvCommand { get; }

    private async Task ConnectAsync()
    {
        try
        {
            StatusMessage = "Loading configuration...";

            // Load configuration
            _config = _configService.LoadConfiguration(Array.Empty<string>());
            _configService.ValidateConfiguration(_config);

            StatusMessage = "Connecting to Tapo Cloud...";

            // Initialize services
            _tapoService = new TapoService(_config.TapoEmail, _config.TapoPassword, _config.Verbose);
            _discoveryService = new DeviceDiscoveryService(_tapoService, _config);
            _exportService = new DataExportService(_config);

            // Login
            if (await _tapoService.LoginAsync())
            {
                IsConnected = true;
                StatusMessage = "Connected to Tapo Cloud";

                // Start auto-refresh
                StartAutoRefresh();

                // Initial device discovery
                await RefreshDevicesAsync();
            }
            else
            {
                StatusMessage = "Failed to connect to Tapo Cloud. Check credentials.";
            }
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }

    private async Task RefreshDevicesAsync()
    {
        if (_discoveryService == null || _tapoService == null)
        {
            StatusMessage = "Not connected. Please connect first.";
            return;
        }

        try
        {
            IsScanning = true;
            StatusMessage = "Scanning for devices...";

            var devices = await _discoveryService.DiscoverDevicesAsync(forceRefresh: true);

            Devices.Clear();
            foreach (var device in devices.OrderBy(d => d.Alias))
            {
                Devices.Add(device);
            }

            UpdateTotals();

            StatusMessage = $"Found {devices.Count} device(s)";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
        finally
        {
            IsScanning = false;
        }
    }

    private async Task ToggleDeviceAsync(TapoDevice device)
    {
        if (_tapoService == null)
            return;

        try
        {
            var newState = !device.DeviceOn;
            await _tapoService.ToggleDeviceAsync(device.IpAddress, newState);
            device.DeviceOn = newState;

            StatusMessage = $"{device.Alias} turned {(newState ? "ON" : "OFF")}";

            // Refresh device data
            await Task.Delay(1000);
            var updatedDevice = await _tapoService.GetDeviceInfoAsync(device.IpAddress);
            if (updatedDevice != null)
            {
                var index = Devices.IndexOf(device);
                if (index >= 0)
                {
                    Devices[index] = updatedDevice;
                }
            }

            UpdateTotals();
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error toggling device: {ex.Message}";
        }
    }

    private async Task ExportMarkdownAsync()
    {
        if (_exportService == null || Devices.Count == 0)
            return;

        try
        {
            var filePath = await _exportService.ExportToMarkdownAsync(Devices.ToList());
            StatusMessage = $"Exported to {filePath}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error exporting: {ex.Message}";
        }
    }

    private async Task ExportCsvAsync()
    {
        if (_exportService == null || Devices.Count == 0)
            return;

        try
        {
            var filePath = await _exportService.ExportToCsvAsync(Devices.ToList());
            StatusMessage = $"Exported to {filePath}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error exporting: {ex.Message}";
        }
    }

    private void StartAutoRefresh()
    {
        _cancellationTokenSource = new CancellationTokenSource();

        _updateTimer = new Timer(
            async _ => await RefreshDevicesAsync(),
            null,
            TimeSpan.FromSeconds(5),
            TimeSpan.FromMilliseconds(_config?.PollIntervalMs ?? 5000)
        );
    }

    private void UpdateTotals()
    {
        TotalPowerW = Devices.Where(d => d.CurrentPower != null).Sum(d => d.CurrentPower!.CurrentPowerW);
        TotalTodayKwh = Devices.Where(d => d.CurrentPower != null).Sum(d => d.CurrentPower!.TodayEnergyKwh);
        TotalMonthKwh = Devices.Where(d => d.CurrentPower != null).Sum(d => d.CurrentPower!.MonthEnergyKwh);
        EstimatedCost = TotalMonthKwh * (_config?.CostPerKwh ?? 0.12);
    }

    public void Dispose()
    {
        _cancellationTokenSource?.Cancel();
        _updateTimer?.Dispose();
    }
}
