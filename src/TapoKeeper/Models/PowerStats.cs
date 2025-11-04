using System;

namespace TapoKeeper.Models;

/// <summary>
/// Represents power consumption statistics from a Tapo energy monitoring device
/// </summary>
public class PowerStats
{
    /// <summary>
    /// Current power consumption in watts (W)
    /// </summary>
    public double CurrentPowerW { get; set; }

    /// <summary>
    /// Today's total energy consumption in watt-hours (Wh)
    /// </summary>
    public double TodayEnergyWh { get; set; }

    /// <summary>
    /// This month's total energy consumption in watt-hours (Wh)
    /// </summary>
    public double MonthEnergyWh { get; set; }

    /// <summary>
    /// Current voltage in volts (V)
    /// </summary>
    public double CurrentVoltageV { get; set; }

    /// <summary>
    /// Current in amperes (A)
    /// </summary>
    public double CurrentCurrentA { get; set; }

    /// <summary>
    /// Timestamp when this data was collected
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.Now;

    /// <summary>
    /// Today's energy in kilowatt-hours (kWh)
    /// </summary>
    public double TodayEnergyKwh => TodayEnergyWh / 1000.0;

    /// <summary>
    /// Month's energy in kilowatt-hours (kWh)
    /// </summary>
    public double MonthEnergyKwh => MonthEnergyWh / 1000.0;

    /// <summary>
    /// Estimated cost for today (assuming $0.12 per kWh)
    /// </summary>
    public double EstimatedTodayCost(double costPerKwh = 0.12) => TodayEnergyKwh * costPerKwh;

    /// <summary>
    /// Estimated cost for this month (assuming $0.12 per kWh)
    /// </summary>
    public double EstimatedMonthCost(double costPerKwh = 0.12) => MonthEnergyKwh * costPerKwh;

    public override string ToString()
    {
        return $"{CurrentPowerW:F2}W | Today: {TodayEnergyKwh:F3} kWh | Month: {MonthEnergyKwh:F3} kWh";
    }
}
