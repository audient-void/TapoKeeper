using System.Collections.Generic;

namespace TapoKeeper.Models;

/// <summary>
/// Application configuration settings
/// </summary>
public class AppConfig
{
    /// <summary>
    /// Tapo account email
    /// </summary>
    public string TapoEmail { get; set; } = string.Empty;

    /// <summary>
    /// Tapo account password
    /// </summary>
    public string TapoPassword { get; set; } = string.Empty;

    /// <summary>
    /// Polling interval in milliseconds (default: 5000)
    /// </summary>
    public int PollIntervalMs { get; set; } = 5000;

    /// <summary>
    /// Manual IP address mappings (MAC -> IP)
    /// Format: "MAC1=IP1,MAC2=IP2"
    /// </summary>
    public Dictionary<string, string> ManualIps { get; set; } = new();

    /// <summary>
    /// Enable verbose logging
    /// </summary>
    public bool Verbose { get; set; }

    /// <summary>
    /// Disable device list caching (forces fresh discovery)
    /// </summary>
    public bool NoCache { get; set; }

    /// <summary>
    /// Graph time window in minutes (for graph mode)
    /// </summary>
    public int GraphTimeMinutes { get; set; } = 2;

    /// <summary>
    /// Cost per kWh for cost calculations (default: $0.12)
    /// </summary>
    public double CostPerKwh { get; set; } = 0.12;

    /// <summary>
    /// Device discovery cache duration in minutes (default: 5)
    /// </summary>
    public int CacheDurationMinutes { get; set; } = 5;
}
