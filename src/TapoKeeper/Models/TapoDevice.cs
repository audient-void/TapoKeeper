using System;

namespace TapoKeeper.Models;

/// <summary>
/// Represents a TP-Link Tapo smart device with power monitoring capabilities
/// </summary>
public class TapoDevice
{
    public string DeviceId { get; set; } = string.Empty;
    public string Alias { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string MacAddress { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string FirmwareVersion { get; set; } = string.Empty;
    public string HardwareVersion { get; set; } = string.Empty;

    public bool IsOnline { get; set; }
    public bool DeviceOn { get; set; }
    public DateTime LastUpdated { get; set; }

    public PowerStats? CurrentPower { get; set; }

    /// <summary>
    /// Whether this device supports energy monitoring (P110, P115)
    /// </summary>
    public bool SupportsEnergyMonitoring =>
        Model.Contains("P110", StringComparison.OrdinalIgnoreCase) ||
        Model.Contains("P115", StringComparison.OrdinalIgnoreCase);

    public override string ToString()
    {
        return $"{Alias} ({Model}) - {IpAddress}";
    }
}
