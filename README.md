# TapoKeeper

**Monitor and control TP-Link Tapo Smart Plugs with real-time power tracking**

A Node.js CLI tool that connects to the Tapo Cloud API to retrieve real-time power consumption data from compatible devices (P110, P115, etc.) and displays it in a formatted table with periodic updates. Includes interactive device control and data export functionality.

![License](https://img.shields.io/badge/license-AGPL%20v3%20%7C%20Commercial-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16-brightgreen.svg)

## Features

- 📊 **Real-time monitoring** - Live power consumption display with auto-refresh
- 🎮 **Interactive control** - Toggle devices on/off with keyboard shortcuts
- 📁 **Data export** - Save reports in Markdown or CSV format
- 🔍 **Smart discovery** - Automatic device detection via ARP or IP scanning
- 💾 **Dump modes** - One-shot data collection and phantom power testing
- 🖥️ **Standalone executable** - No Node.js required for end users

## Quick Start

### Option 1: Use Pre-built Executable (Recommended)

Download `tapokeeper.exe` from [Releases](../../releases) and run it directly:

```bash
tapokeeper.exe --help
```

### Option 2: Run from Source

```bash
# Install dependencies
npm install

# Create .env file with your credentials
cp .env.example .env
# Edit .env and add your TAPO_EMAIL and TAPO_PASSWORD

# Run the monitor
npm start
```

## Configuration

Create a `.env` file with your Tapo account credentials:

```env
TAPO_EMAIL=your-tapo-account@email.com
TAPO_PASSWORD=your-password
POLL_INTERVAL=5000

# Optional: Manual IP mappings for devices that don't auto-discover
# Format: MAC=IP (MAC addresses without colons/dashes)
MANUAL_IPS=BC071DD58CD6=192.168.1.100,BC071D24B090=192.168.1.101
```

## Usage

### Interactive Mode (Default)

```bash
npm start
```

**Keyboard Controls:**
- `1-9` - Toggle device on/off by number
- `d` - Dump current data to markdown file
- `c` - Dump current data to CSV file
- `q` - Quit

### Command Line Options

```bash
# Show help
npm start -- --help

# Enable verbose debug output
npm start -- --verbose

# Set custom polling interval (2 seconds)
npm start -- --interval 2000

# Dump mode: collect data and exit
npm start -- --dump                    # Markdown format
npm start -- --dump csv                # CSV format

# Turn on OFF devices, wait 5s, then dump power readings
npm start -- --dump switchon

# Check phantom power of OFF devices (turns on, dumps, turns back off)
npm start -- --dump togglecheck

# Wait 15 seconds before dumping (useful for stabilizing readings)
npm start -- --dump --dump-interval 15000
```

## Building from Source

### Build Standalone Executable

```bash
# Install dependencies
npm install

# Build Windows executable (~37MB)
npm run build

# Build for all platforms (Windows, macOS, Linux)
npm run build:all
```

The executable will be created in `dist/tapokeeper.exe`.

**How it works:** The build uses webpack to bundle ES modules into CommonJS, then pkg packages it into a standalone executable with the Node.js runtime included.

See [BUILD.md](BUILD.md) for detailed build documentation.

## Screenshots

```
TapoKeeper
Polling interval: 5000ms

┌───┬────────────────────┬─────────────┬────────┬─────────────────┬──────────────┬──────────────┬──────────────────┐
│ # │ Device Name        │ Model       │ Status │ Current Power   │ Today        │ This Month   │ IP Address       │
├───┼────────────────────┼─────────────┼────────┼─────────────────┼──────────────┼──────────────┼──────────────────┤
│ 1 │ Router Corner      │ P115        │ ON     │ 8.45 W          │ 0.123 kWh    │ 3.456 kWh    │ 192.168.1.100    │
│ 2 │ Office Desk        │ P115        │ OFF    │ 0.00 W          │ 0.045 kWh    │ 1.234 kWh    │ 192.168.1.101    │
└───┴────────────────────┴─────────────┴────────┴─────────────────┴──────────────┴──────────────┴──────────────────┘

Last updated: 10/1/2025, 5:31:45 PM

Controls: [1-2] toggle device | [d] dump to .md | [c] dump to .csv | [q] quit
```

## Architecture

**Single-file application** - All logic in `index.js` (837 lines)

**Key features:**
- ES Modules with top-level await
- Intelligent device discovery (manual IPs → ARP scan → IP subnet scan)
- 5-minute device cache to reduce network load
- Batch parallel IP scanning (50 IPs at a time, 1.5s timeout)
- Graceful handling of devices without energy monitoring support

## Supported Devices

**Energy monitoring support:**
- ✅ P110 (Energy Monitoring Smart Plug)
- ✅ P115 (Mini Energy Monitoring Smart Plug)

**Basic control only:**
- ⚠️ P100 (Smart Plug)
- ⚠️ P105 (Mini Smart Plug)

## Known Issues

### KLAP Protocol Authentication Failure

**Symptom:** Devices show "email or password incorrect" then "Device supports KLAP protocol - Legacy login not supported"

**Cause:** Devices have mismatched local KLAP credentials (different from cloud account, often from previous owner)

**Solution:**
Change your password on the Tapo App and it should upload new credentials to the Tapo Plugs.

## Troubleshooting

### Devices not discovered

1. Try manual IP mappings in `.env`:
   ```env
   MANUAL_IPS=MAC1=IP1,MAC2=IP2
   ```
2. Run with `--verbose` flag to debug network scanning
3. Ensure devices are on the same network

### Connection timeouts

- Devices have 10-second connection timeout
- IP scanning uses 1.5s timeout per IP
- If devices are slow, increase timeouts in `index.js`

## Development

```bash
# Install dependencies
npm install

# Run with verbose logging
npm start -- --verbose

# Bundle ES modules to CommonJS
npm run bundle

# Test the bundled file
node dist/tapokeeper.cjs --help
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is dual-licensed:

### Open Source License - AGPL v3

For open source projects, this software is licensed under the **GNU Affero General Public License v3.0 (AGPL v3)**.

**Key requirements:**
- ✅ You can use, modify, and distribute this software freely
- ✅ Source code must be made available
- ⚠️ If you modify and use this software to provide a network service, you **must** make your modified source code available to users
- ⚠️ Any derivative work must also be licensed under AGPL v3

This ensures the software remains free and open source.

### Commercial License

For commercial use without AGPL v3 obligations, a **commercial license** is available.

**Benefits:**
- ✅ Use in proprietary applications without releasing source code
- ✅ Modify the software privately
- ✅ No requirement to license your application under AGPL v3
- ✅ Include in commercial products or services

**For commercial licensing inquiries, contact:** tapokeeper@redflux.nyc



**Not sure which license you need?** Contact us before using this software commercially.

## Acknowledgments

- [tp-link-tapo-connect](https://www.npmjs.com/package/tp-link-tapo-connect) - Tapo Cloud API client
- [cli-table3](https://www.npmjs.com/package/cli-table3) - Terminal table formatting
- [webpack](https://webpack.js.org/) - ES module bundling
- [pkg](https://github.com/vercel/pkg) - Executable packaging
- [Claude](https://claude.ai) - Claude AI (Wrote most of this)

## Support

For issues, questions, or suggestions, please [open an issue](../../issues) on GitHub.
