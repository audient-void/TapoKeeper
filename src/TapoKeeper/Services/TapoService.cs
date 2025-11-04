using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TapoConnect;
using TapoKeeper.Models;

namespace TapoKeeper.Services;

/// <summary>
/// Service for communicating with TP-Link Tapo devices
/// Wraps the TapoConnect library and provides power monitoring functionality
/// </summary>
public class TapoService
{
    private readonly string _email;
    private readonly string _password;
    private readonly bool _verbose;
    private TapoCloudClient? _cloudClient;

    public TapoService(string email, string password, bool verbose = false)
    {
        _email = email ?? throw new ArgumentNullException(nameof(email));
        _password = password ?? throw new ArgumentNullException(nameof(password));
        _verbose = verbose;
    }

    /// <summary>
    /// Login to Tapo Cloud to enable device discovery
    /// </summary>
    public async Task<bool> LoginAsync()
    {
        try
        {
            if (_verbose)
                Console.WriteLine("Logging in to Tapo Cloud...");

            _cloudClient = new TapoCloudClient();
            await _cloudClient.LoginAsync(_email, _password);

            if (_verbose)
                Console.WriteLine("Successfully logged in to Tapo Cloud");

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error logging in to Tapo Cloud: {ex.Message}");
            if (_verbose)
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return false;
        }
    }

    /// <summary>
    /// Get list of devices from Tapo Cloud
    /// </summary>
    public async Task<List<TapoDevice>> GetCloudDevicesAsync()
    {
        if (_cloudClient == null)
            throw new InvalidOperationException("Must call LoginAsync first");

        var devices = new List<TapoDevice>();

        try
        {
            var cloudDevices = await _cloudClient.GetDevicesAsync();

            foreach (var device in cloudDevices)
            {
                devices.Add(new TapoDevice
                {
                    DeviceId = device.DeviceId ?? string.Empty,
                    Alias = device.Alias ?? device.DeviceName ?? "Unknown",
                    Model = device.DeviceModel ?? string.Empty,
                    MacAddress = device.DeviceMac ?? string.Empty,
                    FirmwareVersion = device.FirmwareVersion ?? string.Empty,
                    IsOnline = device.Status == 1,
                    DeviceOn = device.DeviceOn,
                });
            }

            if (_verbose)
                Console.WriteLine($"Found {devices.Count} devices from Tapo Cloud");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting cloud devices: {ex.Message}");
            if (_verbose)
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
        }

        return devices;
    }

    /// <summary>
    /// Get device info and power stats by connecting directly to device IP
    /// </summary>
    public async Task<TapoDevice?> GetDeviceInfoAsync(string ipAddress)
    {
        try
        {
            if (_verbose)
                Console.WriteLine($"Connecting to device at {ipAddress}...");

            var deviceClient = new TapoDeviceClient();
            await deviceClient.LoginByIpAsync(_email, _password, ipAddress);

            var deviceInfo = await deviceClient.GetDeviceInfoAsync();

            var device = new TapoDevice
            {
                DeviceId = deviceInfo.DeviceId ?? string.Empty,
                Alias = deviceInfo.Nickname ?? deviceInfo.Alias ?? "Unknown",
                Model = deviceInfo.Model ?? string.Empty,
                MacAddress = deviceInfo.Mac ?? string.Empty,
                IpAddress = ipAddress,
                FirmwareVersion = deviceInfo.FirmwareVersion ?? string.Empty,
                HardwareVersion = deviceInfo.HardwareVersion ?? string.Empty,
                IsOnline = true,
                DeviceOn = deviceInfo.DeviceOn,
                LastUpdated = DateTime.Now,
            };

            // Try to get power/energy data if supported
            if (device.SupportsEnergyMonitoring)
            {
                device.CurrentPower = await GetPowerStatsAsync(deviceClient);
            }

            return device;
        }
        catch (Exception ex)
        {
            if (_verbose)
                Console.WriteLine($"Error getting device info from {ipAddress}: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// Get current power consumption and energy usage stats
    /// </summary>
    private async Task<PowerStats?> GetPowerStatsAsync(TapoDeviceClient deviceClient)
    {
        try
        {
            // Note: TapoConnect library may not have direct energy monitoring methods yet
            // We'll need to use GetDeviceInfoAsync and extract energy data from it
            // or extend the library to support energy monitoring endpoints

            var deviceInfo = await deviceClient.GetDeviceInfoAsync();

            // Check if device info contains energy data
            // This is a placeholder - actual implementation depends on TapoConnect library support
            // We may need to make direct HTTP calls to the energy monitoring endpoints

            return new PowerStats
            {
                CurrentPowerW = 0, // TODO: Extract from deviceInfo or custom API call
                TodayEnergyWh = 0,
                MonthEnergyWh = 0,
                CurrentVoltageV = 0,
                CurrentCurrentA = 0,
                Timestamp = DateTime.Now,
            };
        }
        catch (Exception ex)
        {
            if (_verbose)
                Console.WriteLine($"Error getting power stats: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// Toggle device power state
    /// </summary>
    public async Task<bool> ToggleDeviceAsync(string ipAddress, bool turnOn)
    {
        try
        {
            if (_verbose)
                Console.WriteLine($"Toggling device at {ipAddress} to {(turnOn ? "ON" : "OFF")}...");

            var deviceClient = new TapoDeviceClient();
            await deviceClient.LoginByIpAsync(_email, _password, ipAddress);
            await deviceClient.SetPowerAsync(turnOn);

            if (_verbose)
                Console.WriteLine($"Successfully toggled device to {(turnOn ? "ON" : "OFF")}");

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error toggling device at {ipAddress}: {ex.Message}");
            if (_verbose)
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return false;
        }
    }

    /// <summary>
    /// Get device power state
    /// </summary>
    public async Task<bool?> GetDevicePowerStateAsync(string ipAddress)
    {
        try
        {
            var deviceClient = new TapoDeviceClient();
            await deviceClient.LoginByIpAsync(_email, _password, ipAddress);
            var deviceInfo = await deviceClient.GetDeviceInfoAsync();
            return deviceInfo.DeviceOn;
        }
        catch (Exception ex)
        {
            if (_verbose)
                Console.WriteLine($"Error getting device power state from {ipAddress}: {ex.Message}");
            return null;
        }
    }
}
