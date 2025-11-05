# TapoKeeper v2.0 - TypeScript + NodeGUI Edition

**Monitor and control TP-Link Tapo Smart Plugs with real-time power tracking**

TapoKeeper is a cross-platform desktop application built with TypeScript and NodeGUI that provides both a native Qt-based GUI and a full-featured CLI/TUI mode for monitoring TP-Link Tapo smart plugs with energy monitoring capabilities.

![License](https://img.shields.io/badge/license-AGPL%20v3-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)
![NodeGUI](https://img.shields.io/badge/NodeGUI-Qt-green.svg)

---

## ✨ Features

### Dual Mode Operation
- 🖥️ **GUI Mode (Default)** - Native Qt-based desktop UI via NodeGUI
- 💻 **CLI/TUI Mode** - Full terminal interface with original JavaScript functionality preserved
- 🎯 **Seamless Switching** - Use `npm run cli` for terminal mode

### Core Capabilities
- 📊 **Real-time Monitoring** - Live power consumption with auto-refresh
- 📈 **Graph Mode** - Visual power consumption charts in terminal (CLI mode)
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

- **Node.js 18+** ([Download](https://nodejs.org/))
- TP-Link Tapo account (email & password)
- Tapo devices on your local network

### Installation

```bash
# Clone the repository
git clone https://github.com/audient-void/TapoKeeper.git
cd TapoKeeper

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run GUI mode (NodeGUI)
npm start

# Or run CLI mode (original JavaScript implementation)
npm run cli
```

---

## ⚙️ Configuration

Create an `env` file in the project root:

```bash
# Tapo Account Credentials
TAPO_EMAIL=your-email@example.com
TAPO_PASSWORD=your-tapo-password

# Optional Settings
POLL_INTERVAL=5000                    # Update frequency in milliseconds
MANUAL_IPS=AA:BB:CC:DD:EE:FF=192.168.1.100,11:22:33:44:55:66=192.168.1.101
```

---

## 📖 Usage

### GUI Mode (NodeGUI - TypeScript)

Launch the native desktop application:

```bash
npm start
# or
npm run start:gui
```

**Features:**
- Native Qt-based interface
- Real-time device monitoring
- One-click device power toggle
- Export to Markdown or CSV
- Auto-refresh every 5 seconds

### CLI/TUI Mode (Original JavaScript)

The original full-featured CLI is preserved:

```bash
# Interactive mode with live table
npm run cli

# Graph mode with real-time charts
npm run graph

# One-shot data dump
npm run dump                   # Markdown format
npm run dump csv               # CSV format

# With custom options
npm run cli -- --verbose       # Verbose logging
npm run cli -- --graph --graph-time 300  # 5-minute graph window
npm run cli -- --dump switchon            # Turn ON devices, then dump
npm run cli -- --dump togglecheck         # Turn ON, dump, restore state
```

### CLI Controls (Interactive/Graph Mode)

| Key | Action |
|-----|--------|
| `1-9` | Toggle device on/off (numbered in display order) |
| `d` | Dump data to Markdown file |
| `c` | Dump data to CSV file |
| `q` | Quit application |

### Command-Line Options (CLI Mode)

```bash
# Interactive modes
npm run cli                           # Live table
npm run cli -- --graph                # Real-time power graph
npm run cli -- --graph --graph-time 300  # 5-minute window

# Configuration
npm run cli -- --interval 3000        # Update every 3 seconds
npm run cli -- --verbose              # Enable detailed logging

# Dump modes
npm run cli -- --dump                 # Markdown format
npm run cli -- --dump csv             # CSV format
npm run cli -- --dump switchon        # Turn ON all devices, then dump
npm run cli -- --dump togglecheck     # Turn ON, dump, restore original state

# Help
npm run help
```

---

## 📊 Example Output

### Markdown Export

```markdown
# TapoKeeper Power Report
**Generated:** 2025-11-05 03:30:00
**Devices:** 3

## Summary
- **Total Current Power:** 523.45 W
- **Total Today Energy:** 8.234 kWh
- **Total Month Energy:** 156.78 kWh

## Device Details
| # | Device | Model | Status | Current Power | Today | This Month | IP Address |
|---|--------|-------|--------|---------------|-------|------------|------------|
| 1 | Living Room | P110 | ON | 450.23 W | 6.123 kWh | 120.45 kWh | 192.168.1.100 |
| 2 | Office | P115 | ON | 60.12 W | 1.456 kWh | 28.90 kWh | 192.168.1.101 |
| 3 | Kitchen | P110 | OFF | 0.00 W | 0.655 kWh | 7.43 kWh | 192.168.1.102 |
```

---

## 🏗️ Architecture

### Technology Stack

- **Language:** TypeScript 5.3
- **Runtime:** Node.js 18+
- **GUI Framework:** [NodeGUI](https://docs.nodegui.org/) (Qt5 bindings)
- **CLI Framework:** blessed + blessed-contrib
- **Tapo Library:** tp-link-tapo-connect
- **Build System:** TypeScript Compiler (tsc)

### Project Structure

```
TapoKeeper/
├── src/
│   ├── index.ts              # Main entry point (GUI launcher)
│   ├── index-cli.js          # Original CLI implementation (preserved)
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── services/
│   │   ├── config.ts         # Configuration service
│   │   └── tapo.ts           # Tapo device service
│   ├── gui/
│   │   └── main-window.ts    # NodeGUI main window
│   └── cli/                  # (Future: TypeScript CLI port)
├── dist/                     # Compiled TypeScript output
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── env.example               # Configuration template
└── README.md
```

### Architecture Overview

1. **Dual Entry Points:**
   - `src/index.ts` → TypeScript/NodeGUI GUI (new)
   - `src/index-cli.js` → Original JavaScript CLI (preserved)

2. **TypeScript Modules:**
   - **Types:** Shared interfaces and type definitions
   - **Services:** Business logic (config, Tapo API communication)
   - **GUI:** NodeGUI Qt-based interface
   - **CLI:** (Future) TypeScript CLI implementation

3. **Device Discovery Strategy:**
   - Manual IPs from env file
   - Tapo Cloud device list
   - ARP table scanning
   - Subnet IP scanning (fallback)
   - 5-minute caching

---

## 🔧 Development

### Building

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode (auto-rebuild on changes)
npm run dev

# Clean build output
npm run clean
```

### Packaging

```bash
# Package for Windows
npm run package:win

# Package for macOS
npm run package:mac

# Package for Linux
npm run package:linux
```

### IDE Setup

- **VS Code:** Install "TypeScript + JavaScript" and "NodeGUI Snippets" extensions
- **WebStorm:** Full TypeScript support out of the box

---

## 📝 Migration from v1.x

TapoKeeper v2.0 adds TypeScript and NodeGUI while preserving the original JavaScript CLI:

| Aspect | v1.x | v2.0 |
|--------|------|------|
| Language | JavaScript (ES Modules) | TypeScript + JavaScript |
| GUI | Terminal only | Native Qt GUI + Terminal |
| CLI | blessed/blessed-contrib | **Preserved unchanged** |
| Type Safety | None | Full TypeScript support |
| Platform | Node.js required | Node.js required |

**CLI Mode Preserved:** The original JavaScript CLI (`src/index-cli.js`) is fully intact. Use `npm run cli` to access 100% of the original functionality.

---

## 🐛 Known Issues & Limitations

1. **NodeGUI Early Stage:** The GUI implementation is in early development. The CLI mode is recommended for production use.

2. **Device Discovery in GUI:** IP discovery (ARP/subnet scanning) is simplified in the GUI version. Use CLI mode for advanced discovery.

3. **Energy Monitoring:** Some P110/P115 devices may return zero power values due to firmware/protocol variations.

4. **NodeGUI Dependencies:** NodeGUI requires Qt5 to be installed on the system. See [NodeGUI docs](https://docs.nodegui.org/) for platform-specific setup.

---

## 🤝 Contributing

Contributions are welcome! Priority areas:

- Complete TypeScript CLI port
- Enhance NodeGUI GUI features
- Improve device discovery reliability
- Add unit tests
- Cross-platform packaging improvements

---

## 📜 License

**Dual Licensed:**

- **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)** - For open source projects
- **Commercial License** - For proprietary use without AGPL restrictions

For commercial licensing inquiries, contact: **tapokeeper@redflux.nyc**

---

## 🙏 Acknowledgments

- [NodeGUI](https://docs.nodegui.org/) - Qt5 bindings for Node.js
- [tp-link-tapo-connect](https://www.npmjs.com/package/tp-link-tapo-connect) - Tapo Cloud API client
- [blessed](https://github.com/chjj/blessed) - Terminal UI library
- [blessed-contrib](https://github.com/yaronn/blessed-contrib) - Terminal charts and widgets
- TP-Link - For the Tapo smart plug platform

---

## 📞 Support & Contact

- **Issues:** [GitHub Issues](https://github.com/audient-void/TapoKeeper/issues)
- **Email:** tapokeeper@redflux.nyc
- **Repository:** https://github.com/audient-void/TapoKeeper

---

## 🗺️ Roadmap

- [x] TypeScript migration (in progress)
- [x] NodeGUI native GUI
- [x] Preserve original CLI functionality
- [ ] Complete TypeScript CLI port
- [ ] Enhanced GUI features (charts, graphs)
- [ ] Improved device discovery in GUI
- [ ] Unit tests
- [ ] E2E tests
- [ ] Docker container support
- [ ] Historical data tracking

---

**Made with ❤️ for the home automation community**
