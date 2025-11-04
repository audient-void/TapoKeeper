using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using TapoKeeper.Models;

namespace TapoKeeper.Services;

/// <summary>
/// Handles configuration loading from multiple sources:
/// 1. Command-line arguments (highest priority)
/// 2. Environment variables
/// 3. env file in application directory
/// </summary>
public class ConfigurationService
{
    private readonly Dictionary<string, string> _envVars = new();

    public AppConfig LoadConfiguration(string[] args)
    {
        // Load from env file first
        LoadEnvFile();

        // Load environment variables (overrides env file)
        LoadEnvironmentVariables();

        // Create config with defaults
        var config = new AppConfig
        {
            TapoEmail = GetValue("TAPO_EMAIL") ?? string.Empty,
            TapoPassword = GetValue("TAPO_PASSWORD") ?? string.Empty,
            PollIntervalMs = int.TryParse(GetValue("POLL_INTERVAL"), out var interval) ? interval : 5000,
            ManualIps = ParseManualIps(GetValue("MANUAL_IPS")),
            CostPerKwh = double.TryParse(GetValue("COST_PER_KWH"), out var cost) ? cost : 0.12,
        };

        // Parse command-line arguments (highest priority)
        ParseCommandLineArgs(args, config);

        return config;
    }

    private void LoadEnvFile()
    {
        var envFilePath = Path.Combine(AppContext.BaseDirectory, "env");
        if (!File.Exists(envFilePath))
            return;

        try
        {
            var lines = File.ReadAllLines(envFilePath);
            foreach (var line in lines)
            {
                // Skip empty lines and comments
                if (string.IsNullOrWhiteSpace(line) || line.TrimStart().StartsWith("#"))
                    continue;

                var parts = line.Split('=', 2);
                if (parts.Length == 2)
                {
                    var key = parts[0].Trim();
                    var value = parts[1].Trim();

                    // Remove quotes if present
                    if (value.StartsWith('"') && value.EndsWith('"'))
                        value = value[1..^1];

                    _envVars[key] = value;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Failed to load env file: {ex.Message}");
        }
    }

    private void LoadEnvironmentVariables()
    {
        var envVarNames = new[] { "TAPO_EMAIL", "TAPO_PASSWORD", "POLL_INTERVAL", "MANUAL_IPS", "COST_PER_KWH" };
        foreach (var name in envVarNames)
        {
            var value = Environment.GetEnvironmentVariable(name);
            if (!string.IsNullOrEmpty(value))
                _envVars[name] = value;
        }
    }

    private string? GetValue(string key)
    {
        return _envVars.TryGetValue(key, out var value) ? value : null;
    }

    private void ParseCommandLineArgs(string[] args, AppConfig config)
    {
        for (int i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--email" when i + 1 < args.Length:
                    config.TapoEmail = args[++i];
                    break;

                case "--password" when i + 1 < args.Length:
                    config.TapoPassword = args[++i];
                    break;

                case "--poll-interval" when i + 1 < args.Length:
                    if (int.TryParse(args[++i], out var interval))
                        config.PollIntervalMs = interval;
                    break;

                case "--manual-ips" when i + 1 < args.Length:
                    config.ManualIps = ParseManualIps(args[++i]);
                    break;

                case "--graph-time" when i + 1 < args.Length:
                    if (int.TryParse(args[++i], out var time))
                        config.GraphTimeMinutes = time;
                    break;

                case "--cost-per-kwh" when i + 1 < args.Length:
                    if (double.TryParse(args[++i], out var cost))
                        config.CostPerKwh = cost;
                    break;

                case "--verbose":
                    config.Verbose = true;
                    break;

                case "--no-cache":
                    config.NoCache = true;
                    break;
            }
        }
    }

    private Dictionary<string, string> ParseManualIps(string? manualIpsStr)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(manualIpsStr))
            return result;

        var pairs = manualIpsStr.Split(',', StringSplitOptions.RemoveEmptyEntries);
        foreach (var pair in pairs)
        {
            var parts = pair.Split('=', 2);
            if (parts.Length == 2)
            {
                var mac = parts[0].Trim();
                var ip = parts[1].Trim();
                result[mac] = ip;
            }
        }

        return result;
    }

    public void ValidateConfiguration(AppConfig config)
    {
        if (string.IsNullOrWhiteSpace(config.TapoEmail))
            throw new InvalidOperationException("TAPO_EMAIL is required. Set it via env file, environment variable, or --email argument.");

        if (string.IsNullOrWhiteSpace(config.TapoPassword))
            throw new InvalidOperationException("TAPO_PASSWORD is required. Set it via env file, environment variable, or --password argument.");

        if (config.PollIntervalMs < 1000)
            throw new InvalidOperationException("POLL_INTERVAL must be at least 1000ms.");
    }
}
