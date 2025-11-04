# TapoKeeper v2.0 - Avalonia UI Edition

**Monitor and control TP-Link Tapo Smart Plugs with real-time power tracking**

TapoKeeper is a cross-platform desktop application built with Avalonia UI and C# that provides both a modern GUI and a full-featured CLI/TUI mode for monitoring TP-Link Tapo smart plugs with energy monitoring capabilities.

![License](https://img.shields.io/badge/license-AGPL%20v3-blue.svg)
![.NET](https://img.shields.io/badge/.NET-8.0-purple.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

---

## ✨ Features

### Dual Mode Operation
- 🖥️ **GUI Mode (Default)** - Modern Avalonia UI with real-time updates
- 💻 **CLI/TUI Mode** - Full terminal interface with original functionality preserved
- 🎯 **Seamless Switching** - Use `--cli` flag to switch to terminal mode

### Core Capabilities
- 📊 **Real-time Monitoring** - Live power consumption with auto-refresh
- 📈 **Graph Mode** - Visual power consumption charts in terminal
- 🎮 **Interactive Control** - Toggle devices on/off with one click (GUI) or keyboard shortcuts (CLI)
- 📁 **Data Export** - Save reports in Markdown (with units) or CSV (numeric values)
- 🔍 **Smart Discovery** - Automatic device detection via Tapo Cloud, ARP, or subnet scanning
- 💾 **Dump Modes** - One-shot data collection with variants (switchon, togglecheck)

### Supported Devices
- ✅ **P110** - Energy Monitoring Smart Plug
- ✅ **P115** - Mini Energy Monitoring Smart Plug
- ⚠️ **P100/P105** - Basic control only (no energy monitoring)

---

## 🚀 Quick Start

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (for building from source)
- TP-Link Tapo account (email & password)
- Tapo devices on your local network

### Installation

#### Option 1: Build from Source

```bash
# Clone the repository
git clone https://github.com/audient-void/TapoKeeper.git
cd TapoKeeper

# Build the project
dotnet build src/TapoKeeper/TapoKeeper.csproj -c Release

# Run the application
dotnet run --project src/TapoKeeper/TapoKeeper.csproj
```

#### Option 2: Publish Self-Contained Executable

```bash
# Windows
dotnet publish src/TapoKeeper/TapoKeeper.csproj -c Release -r win-x64 --self-contained

# macOS (Intel)
dotnet publish src/TapoKeeper/TapoKeeper.csproj -c Release -r osx-x64 --self-contained

# macOS (Apple Silicon)
dotnet publish src/TapoKeeper/TapoKeeper.csproj -c Release -r osx-arm64 --self-contained

# Linux
dotnet publish src/TapoKeeper/TapoKeeper.csproj -c Release -r linux-x64 --self-contained
```

The executable will be in `src/TapoKeeper/bin/Release/net8.0/{runtime}/publish/`

---

## ⚙️ Configuration

Create an `env` file in the application directory:

```bash
# Tapo Account Credentials
TAPO_EMAIL=your-email@example.com
TAPO_PASSWORD=your-tapo-password

# Optional Settings
POLL_INTERVAL=5000                    # Update frequency in milliseconds
COST_PER_KWH=0.12                     # Electricity cost for estimates
MANUAL_IPS=AA:BB:CC:DD:EE:FF=192.168.1.100,11:22:33:44:55:66=192.168.1.101
```

### Configuration Priority

1. **Command-line arguments** (highest priority)
2. **Environment variables**
3. **env file** (lowest priority)

---

## 📖 Usage

### GUI Mode (Default)

Launch the application without arguments to start the Avalonia UI:

```bash
./TapoKeeper
# or
dotnet run --project src/TapoKeeper/TapoKeeper.csproj
```

**Features:**
- Real-time device monitoring with visual dashboard
- One-click device power toggle
- Live power/energy statistics
- Export to Markdown or CSV
- Auto-refresh every 5 seconds (configurable)

### CLI/TUI Mode

Use the `--cli` flag to run in terminal interface mode:

```bash
# Interactive mode with live table
./TapoKeeper --cli

# Graph mode with real-time charts
./TapoKeeper --graph
./TapoKeeper --graph --graph-time 5  # 5-minute time window

# One-shot data dump
./TapoKeeper --dump                   # Markdown format
./TapoKeeper --dump csv               # CSV format
./TapoKeeper --dump switchon          # Turn ON all devices, then dump
./TapoKeeper --dump togglecheck       # Turn ON, dump, restore original state
```

### CLI Controls (Interactive/Graph Mode)

| Key | Action |
|-----|--------|
| `1-9` | Toggle device on/off (numbered in display order) |
| `d` | Dump data to Markdown file |
| `c` | Dump data to CSV file |
| `q` | Quit application |

### Command-Line Options

```bash
# GUI Mode (default)
./TapoKeeper

# CLI Mode
./TapoKeeper --cli                    # Interactive table
./TapoKeeper --graph                  # Real-time graph mode

# Configuration
./TapoKeeper --email user@example.com --password secret123
./TapoKeeper --poll-interval 3000     # Update every 3 seconds
./TapoKeeper --cost-per-kwh 0.15      # Set electricity cost

# Discovery Options
./TapoKeeper --manual-ips "MAC1=IP1,MAC2=IP2"
./TapoKeeper --verbose                # Enable detailed logging
./TapoKeeper --no-cache               # Force fresh device discovery

# Dump Mode
./TapoKeeper --dump [md|csv|switchon|togglecheck]

# Help
./TapoKeeper --help
```

---

## 📊 Example Output

### Markdown Export

```markdown
# TapoKeeper Power Report
**Generated:** 2025-11-04 18:30:00
**Devices:** 3

## Summary
- **Total Current Power:** 523.45 W
- **Total Today Energy:** 8.234 kWh (≈ $0.99)
- **Total Month Energy:** 156.78 kWh (≈ $18.81)
- **Cost Rate:** $0.12 per kWh

## Device Details
| Device | Model | Status | Power | Today | Month | Voltage | Current | IP Address |
|--------|-------|--------|-------|-------|-------|---------|---------|------------|
| Living Room Heater | P110 | 🟢 ON | 450.23 W | 6.123 kWh | 120.45 kWh | 120.3 V | 3.742 A | 192.168.1.100 |
| Office Lamp | P115 | 🟢 ON | 60.12 W | 1.456 kWh | 28.90 kWh | 119.8 V | 0.502 A | 192.168.1.101 |
| Kitchen Appliance | P110 | 🔴 OFF | 0.00 W | 0.655 kWh | 7.43 kWh | 0.0 V | 0.000 A | 192.168.1.102 |
```

### CSV Export

```csv
Timestamp,Device,Model,Status,PowerW,TodayKwh,MonthKwh,VoltageV,CurrentA,IpAddress,MacAddress
2025-11-04 18:30:00,Living Room Heater,P110,ON,450.23,6.123,120.45,120.3,3.742,192.168.1.100,AA:BB:CC:DD:EE:FF
2025-11-04 18:30:00,Office Lamp,P115,ON,60.12,1.456,28.90,119.8,0.502,192.168.1.101,11:22:33:44:55:66
2025-11-04 18:30:00,Kitchen Appliance,P110,OFF,0.00,0.655,7.43,0.0,0.000,192.168.1.102,AA:11:BB:22:CC:33
```

---

## 🏗️ Architecture

### Technology Stack

- **Framework:** .NET 8
- **UI Framework:** [Avalonia UI 11.2](https://avaloniaui.net/)
- **CLI Framework:** [Spectre.Console](https://spectreconsole.net/)
- **Tapo Library:** [TapoConnect 3.2.4](https://github.com/cwakefie27/TapoConnect)
- **CSV Export:** [CsvHelper](https://joshclose.github.io/CsvHelper/)
- **MVVM:** ReactiveUI

### Project Structure

```
TapoKeeper/
├── src/
│   └── TapoKeeper/
│       ├── Models/              # Data models (TapoDevice, PowerStats, AppConfig)
│       ├── Services/            # Business logic services
│       │   ├── TapoService.cs              # Tapo device communication
│       │   ├── DeviceDiscoveryService.cs   # Device discovery (ARP, subnet scan)
│       │   ├── DataExportService.cs        # Markdown/CSV export
│       │   └── ConfigurationService.cs     # Configuration loading
│       ├── ViewModels/          # Avalonia UI ViewModels (MVVM)
│       ├── Views/               # Avalonia UI Views (XAML)
│       ├── CLI/                 # Terminal UI implementation
│       │   └── CliRunner.cs                # CLI mode orchestrator
│       ├── Program.cs           # Entry point (mode selection)
│       ├── App.axaml            # Avalonia app definition
│       └── TapoKeeper.csproj    # Project file
├── env.example                  # Configuration template
├── TapoKeeper.sln               # Solution file
└── README.md
```

### Device Discovery Strategy

1. **Manual IPs** - Use pre-configured MAC → IP mappings
2. **Tapo Cloud** - Query TP-Link cloud for registered devices
3. **ARP Scan** - Scan local ARP table for TP-Link MAC prefixes
4. **Subnet Scan** - Ping sweep fallback (batched, 50 IPs at a time)
5. **5-minute cache** - Reduce network overhead

---

## 🔧 Development

### Building

```bash
# Debug build
dotnet build

# Release build
dotnet build -c Release

# Run tests (when available)
dotnet test
```

### IDE Support

- **Visual Studio 2022+** - Full support with Avalonia XAML designer
- **Visual Studio Code** - With C# extension
- **JetBrains Rider** - Full support with Avalonia plugin

### Dependencies

All dependencies are managed via NuGet:

```xml
<PackageReference Include="Avalonia" Version="11.2.2" />
<PackageReference Include="Spectre.Console" Version="0.49.1" />
<PackageReference Include="TapoConnect" Version="3.2.4" />
<PackageReference Include="CsvHelper" Version="33.0.1" />
```

---

## 📝 Migration from v1.x (Node.js)

TapoKeeper v2.0 is a **complete rewrite** from Node.js to C#/.NET with Avalonia UI. Key changes:

| Aspect | v1.x (Node.js) | v2.0 (C#/.NET) |
|--------|---------------|----------------|
| Language | JavaScript (ES Modules) | C# (.NET 8) |
| UI Framework | blessed/blessed-contrib | Avalonia UI + Spectre.Console |
| Tapo Library | tp-link-tapo-connect | TapoConnect (NuGet) |
| GUI Support | Terminal only | Full desktop GUI + Terminal |
| Platform | Node.js required | Standalone executable |
| Configuration | env file only | env file + CLI args + env vars |

**CLI Mode Preserved:** The `--cli` flag provides 100% feature parity with v1.x terminal UI.

---

## 🐛 Known Issues & Limitations

1. **TapoConnect Energy Monitoring:** The TapoConnect library (v3.2.4) does not yet fully expose P110/P115 energy monitoring APIs. Power stats may return zeros until the library is extended or replaced.

2. **Energy Data Workaround:** A custom implementation may be needed to directly call Tapo energy monitoring endpoints using the KLAP protocol.

3. **Device Discovery:** ARP scanning requires appropriate network permissions on some systems.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

**Priority Areas:**
- Extend TapoConnect library for full P110/P115 energy monitoring
- Add unit tests for services
- Improve device discovery reliability
- Add charting to GUI mode (LiveCharts integration)

---

## 📜 License

**Dual Licensed:**

- **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)** - For open source projects
- **Commercial License** - For proprietary use without AGPL restrictions

For commercial licensing inquiries, contact: **tapokeeper@redflux.nyc**

---

## 🙏 Acknowledgments

- [Avalonia UI](https://avaloniaui.net/) - Cross-platform UI framework
- [Spectre.Console](https://spectreconsole.net/) - Beautiful terminal UI
- [TapoConnect](https://github.com/cwakefie27/TapoConnect) - Unofficial Tapo C# library
- [tp-link-tapo-connect](https://github.com/Flogex/tapo-connect) - Original Node.js inspiration
- TP-Link - For the Tapo smart plug platform

---

## 📞 Support & Contact

- **Issues:** [GitHub Issues](https://github.com/audient-void/TapoKeeper/issues)
- **Email:** tapokeeper@redflux.nyc
- **Repository:** https://github.com/audient-void/TapoKeeper

---

## 🗺️ Roadmap

- [ ] Complete P110/P115 energy monitoring integration
- [ ] Add unit tests (xUnit)
- [ ] Live charting in GUI mode (LiveCharts)
- [ ] Device grouping and filtering
- [ ] Historical data tracking (SQLite)
- [ ] Multi-language support
- [ ] Plugin system for extensibility
- [ ] Docker container support

---

**Made with ❤️ for the home automation community**
