using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Threading.Tasks;
using TapoKeeper.Models;

namespace TapoKeeper.Services;

/// <summary>
/// Service for discovering Tapo devices on the local network
/// Supports manual IPs, ARP scanning, and subnet IP scanning
/// </summary>
public class DeviceDiscoveryService
{
    private readonly TapoService _tapoService;
    private readonly AppConfig _config;
    private readonly List<TapoDevice> _cachedDevices = new();
    private DateTime _lastDiscovery = DateTime.MinValue;

    public DeviceDiscoveryService(TapoService tapoService, AppConfig config)
    {
        _tapoService = tapoService;
        _config = config;
    }

    /// <summary>
    /// Discover devices using multiple strategies:
    /// 1. Manual IPs from config
    /// 2. Tapo Cloud device list
    /// 3. ARP table scanning
    /// 4. Subnet IP scanning
    /// </summary>
    public async Task<List<TapoDevice>> DiscoverDevicesAsync(bool forceRefresh = false)
    {
        // Return cached devices if within cache duration
        if (!forceRefresh && !_config.NoCache &&
            (DateTime.Now - _lastDiscovery).TotalMinutes < _config.CacheDurationMinutes &&
            _cachedDevices.Count > 0)
        {
            if (_config.Verbose)
                Console.WriteLine($"Returning {_cachedDevices.Count} cached devices");
            return _cachedDevices;
        }

        if (_config.Verbose)
            Console.WriteLine("Starting device discovery...");

        var discoveredDevices = new List<TapoDevice>();
        var ipAddresses = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Strategy 1: Manual IPs
        if (_config.ManualIps.Count > 0)
        {
            if (_config.Verbose)
                Console.WriteLine($"Using {_config.ManualIps.Count} manual IP mappings");

            foreach (var ip in _config.ManualIps.Values)
            {
                ipAddresses.Add(ip);
            }
        }

        // Strategy 2: Tapo Cloud devices
        try
        {
            var cloudDevices = await _tapoService.GetCloudDevicesAsync();
            if (_config.Verbose)
                Console.WriteLine($"Found {cloudDevices.Count} devices from Tapo Cloud");

            // For cloud devices with manual IPs, use those IPs
            foreach (var device in cloudDevices)
            {
                if (_config.ManualIps.TryGetValue(device.MacAddress, out var manualIp))
                {
                    device.IpAddress = manualIp;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Failed to get cloud devices: {ex.Message}");
        }

        // Strategy 3: ARP table scanning (platform-specific)
        var arpIps = await ScanArpTableAsync();
        foreach (var ip in arpIps)
            ipAddresses.Add(ip);

        // Strategy 4: Subnet scanning (if no IPs found yet)
        if (ipAddresses.Count == 0)
        {
            if (_config.Verbose)
                Console.WriteLine("No devices found via manual IPs or ARP, performing subnet scan...");

            var subnetIps = await ScanSubnetAsync();
            foreach (var ip in subnetIps)
                ipAddresses.Add(ip);
        }

        // Connect to each IP and get device info
        if (_config.Verbose)
            Console.WriteLine($"Connecting to {ipAddresses.Count} potential device IPs...");

        var tasks = ipAddresses.Select(ip => _tapoService.GetDeviceInfoAsync(ip)).ToList();
        var results = await Task.WhenAll(tasks);

        foreach (var device in results)
        {
            if (device != null)
            {
                discoveredDevices.Add(device);
                if (_config.Verbose)
                    Console.WriteLine($"  ✓ Found {device.Alias} ({device.Model}) at {device.IpAddress}");
            }
        }

        // Update cache
        _cachedDevices.Clear();
        _cachedDevices.AddRange(discoveredDevices);
        _lastDiscovery = DateTime.Now;

        if (_config.Verbose)
            Console.WriteLine($"Discovery complete: {discoveredDevices.Count} devices found");

        return discoveredDevices;
    }

    /// <summary>
    /// Scan ARP table for potential Tapo devices
    /// TP-Link devices typically have MAC addresses starting with specific prefixes
    /// </summary>
    private async Task<List<string>> ScanArpTableAsync()
    {
        var ipAddresses = new List<string>();

        try
        {
            if (_config.Verbose)
                Console.WriteLine("Scanning ARP table...");

            // Use platform-specific ARP command
            var startInfo = new ProcessStartInfo
            {
                FileName = OperatingSystem.IsWindows() ? "arp" : "arp",
                Arguments = OperatingSystem.IsWindows() ? "-a" : "-a",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(startInfo);
            if (process == null)
                return ipAddresses;

            var output = await process.StandardOutput.ReadToEndAsync();
            await process.WaitForExitAsync();

            // Parse ARP output
            // TP-Link MAC prefixes: 50-C7-BF, D8-0D-17, 98-DA-C4, etc.
            var tpLinkPrefixes = new[] { "50-c7-bf", "50:c7:bf", "d8-0d-17", "d8:0d:17", "98-da-c4", "98:da:c4" };

            var lines = output.Split('\n');
            foreach (var line in lines)
            {
                // Look for TP-Link MAC addresses
                var lowerLine = line.ToLowerInvariant();
                if (tpLinkPrefixes.Any(prefix => lowerLine.Contains(prefix)))
                {
                    // Extract IP address from line
                    var parts = line.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                    foreach (var part in parts)
                    {
                        if (IPAddress.TryParse(part, out var ip))
                        {
                            ipAddresses.Add(part);
                            if (_config.Verbose)
                                Console.WriteLine($"  Found potential Tapo device: {part}");
                            break;
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            if (_config.Verbose)
                Console.WriteLine($"Warning: ARP scan failed: {ex.Message}");
        }

        return ipAddresses;
    }

    /// <summary>
    /// Scan local subnet for Tapo devices
    /// This is a fallback when ARP and manual IPs don't find anything
    /// </summary>
    private async Task<List<string>> ScanSubnetAsync()
    {
        var ipAddresses = new List<string>();

        try
        {
            // Get local IP address
            var localIp = GetLocalIPAddress();
            if (localIp == null)
            {
                if (_config.Verbose)
                    Console.WriteLine("Could not determine local IP address for subnet scan");
                return ipAddresses;
            }

            if (_config.Verbose)
                Console.WriteLine($"Scanning subnet based on local IP: {localIp}");

            // Generate IPs in the same subnet
            var ipParts = localIp.Split('.');
            var subnet = $"{ipParts[0]}.{ipParts[1]}.{ipParts[2]}";

            // Scan common IP ranges (skip this machine's IP)
            var currentHost = int.Parse(ipParts[3]);
            var scanTasks = new List<Task<string?>>();

            for (int i = 1; i <= 254; i++)
            {
                if (i == currentHost)
                    continue;

                var ip = $"{subnet}.{i}";
                scanTasks.Add(PingHostAsync(ip));

                // Batch scanning to avoid overwhelming the network
                if (scanTasks.Count >= 50)
                {
                    var results = await Task.WhenAll(scanTasks);
                    ipAddresses.AddRange(results.Where(r => r != null)!);
                    scanTasks.Clear();
                }
            }

            // Process remaining
            if (scanTasks.Count > 0)
            {
                var results = await Task.WhenAll(scanTasks);
                ipAddresses.AddRange(results.Where(r => r != null)!);
            }

            if (_config.Verbose)
                Console.WriteLine($"Subnet scan found {ipAddresses.Count} responsive hosts");
        }
        catch (Exception ex)
        {
            if (_config.Verbose)
                Console.WriteLine($"Warning: Subnet scan failed: {ex.Message}");
        }

        return ipAddresses;
    }

    /// <summary>
    /// Ping a host to check if it's alive
    /// </summary>
    private async Task<string?> PingHostAsync(string ipAddress)
    {
        try
        {
            using var ping = new Ping();
            var reply = await ping.SendPingAsync(ipAddress, 1500); // 1.5 second timeout
            if (reply.Status == IPStatus.Success)
            {
                if (_config.Verbose)
                    Console.WriteLine($"  Host alive: {ipAddress}");
                return ipAddress;
            }
        }
        catch
        {
            // Ignore ping failures
        }

        return null;
    }

    /// <summary>
    /// Get local IP address of the machine
    /// </summary>
    private string? GetLocalIPAddress()
    {
        try
        {
            var host = Dns.GetHostEntry(Dns.GetHostName());
            foreach (var ip in host.AddressList)
            {
                if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                {
                    return ip.ToString();
                }
            }
        }
        catch
        {
            // Ignore
        }

        return null;
    }
}
