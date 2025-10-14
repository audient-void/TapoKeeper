#!/usr/bin/env node

import pkg from 'tp-link-tapo-connect';
const { cloudLogin, loginDeviceByIp } = pkg;
import localDevices from 'local-devices';
import Table from 'cli-table3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';
import blessed from 'blessed';
import contrib from 'blessed-contrib';
import colors from 'colors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Help text
function showHelp() {
  console.log(`
TapoKeeper
==========

Monitor and control TP-Link Tapo Smart Plugs with real-time power tracking.

USAGE:
  node index.js [OPTIONS]
  npm start -- [OPTIONS]

OPTIONS:
  -h, --help                Show this help message and exit

  -v, --verbose             Enable verbose debug output during network scanning

  -g, --graph               Enable graphical power monitoring with real-time chart
                            Shows device table with a rolling graph below

  -gt, --graph-time <sec>   Set graph time window in seconds (default: 120)
                            Example: --graph-time 300 (5 minutes)

  -i, --interval <ms>       Set polling interval in milliseconds (default: 5000)
                            Overrides POLL_INTERVAL from env file
                            Example: --interval 3000

  --dump [format]           Run in dump mode: collect data and save to file then exit.
                            Format can be 'md' (default), 'csv', 'switchon', or 'togglecheck'
                            Does not start interactive mode.
                            Examples:
                              --dump csv
                              --dump switchon (turns on OFF devices, waits 5s, dumps)
                              --dump togglecheck (turns on OFF devices, waits 5s, dumps, turns them back off)
                              --dump togglecheck csv (same as above but CSV format)

  -di, --dump-interval <ms> Set how long to wait before collecting data in dump mode
                            (default: 10000ms, ignored when using switchon or togglecheck)
                            Example: --dump --dump-interval 30000

INTERACTIVE MODE CONTROLS:
  Press 1-9                 Toggle device on/off (no Enter key needed)
  Press d                   Dump current data to markdown file (.md)
  Press c                   Dump current data to CSV file (.csv)
  Press q                   Quit the application
  Ctrl+C                    Force quit

DUMP MODE:
  Saves a report to: tapo-power-<timestamp>.md or .csv
  Report includes device table and summary statistics

  Formats:
    --dump or --dump md       Markdown format (default)
    --dump csv                CSV format
    --dump switchon           Turn on OFF devices, wait 5s, dump to markdown
    --dump switchon csv       Turn on OFF devices, wait 5s, dump to CSV
    --dump togglecheck        Turn on OFF devices, wait 5s, dump, turn them back OFF
    --dump togglecheck csv    Turn on OFF devices, wait 5s, dump to CSV, turn them back OFF

CONFIGURATION:
  Create an env file with the following variables:
    TAPO_EMAIL=your-email@example.com
    TAPO_PASSWORD=your-password
    POLL_INTERVAL=5000
    MANUAL_IPS=MAC1=IP1,MAC2=IP2  (optional, for devices that don't auto-discover)

EXAMPLES:
  # Start with default settings
  npm start

  # Start with 2 second polling interval
  npm start -- --interval 2000

  # Run in verbose mode to debug network issues
  npm start -- --verbose

  # Enable graph mode with default 2-minute window
  npm start -- --graph

  # Graph mode with 5-minute time window
  npm start -- --graph --graph-time 300

  # Graph mode with custom poll interval and 10-minute window
  npm start -- --graph --interval 10000 --graph-time 600

  # Dump report to markdown after waiting 15 seconds
  npm start -- --dump --dump-interval 15000

  # Dump report to CSV after waiting 15 seconds
  npm start -- --dump csv --dump-interval 15000

  # Turn on OFF devices and dump power consumption to markdown
  npm start -- --dump switchon

  # Turn on OFF devices and dump power consumption to CSV
  npm start -- --dump switchon csv

  # Check power consumption of OFF devices (turns on, dumps, turns back off)
  npm start -- --dump togglecheck

  # Check power consumption of OFF devices and save to CSV
  npm start -- --dump togglecheck csv

  # Combine options
  npm start -- --interval 1000 --verbose

REQUIREMENTS:
  - TP-Link Tapo account credentials
  - Tapo smart plugs on local network (P110, P115, etc.)
  - Node.js 16 or higher

`);
  process.exit(0);
}

// Parse command line arguments
function parseArgs() {
  // Check for help flag first
  if (process.argv.includes('-h') || process.argv.includes('--help')) {
    showHelp();
  }

  const args = {
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    graph: process.argv.includes('--graph') || process.argv.includes('-g'),
    dump: process.argv.includes('--dump') || process.argv.includes('-dump'),
    dumpFormat: 'md', // default to markdown
    dumpSwitchOn: false,
    dumpToggleCheck: false,
    pollInterval: null,
    dumpInterval: null,
    graphTime: null
  };

  // Parse --dump format (if --dump csv, use csv format)
  const dumpIndex = process.argv.findIndex(arg => arg === '--dump' || arg === '-dump');
  if (dumpIndex !== -1 && process.argv[dumpIndex + 1]) {
    const nextArg = process.argv[dumpIndex + 1].toLowerCase();
    if (nextArg === 'csv' || nextArg === 'md' || nextArg === 'markdown') {
      args.dumpFormat = nextArg === 'csv' ? 'csv' : 'md';
    } else if (nextArg === 'switchon') {
      args.dumpSwitchOn = true;
      // Check if there's another argument after switchon for format
      if (process.argv[dumpIndex + 2]) {
        const formatArg = process.argv[dumpIndex + 2].toLowerCase();
        if (formatArg === 'csv' || formatArg === 'md' || formatArg === 'markdown') {
          args.dumpFormat = formatArg === 'csv' ? 'csv' : 'md';
        }
      }
    } else if (nextArg === 'togglecheck') {
      args.dumpToggleCheck = true;
      // Check if there's another argument after togglecheck for format
      if (process.argv[dumpIndex + 2]) {
        const formatArg = process.argv[dumpIndex + 2].toLowerCase();
        if (formatArg === 'csv' || formatArg === 'md' || formatArg === 'markdown') {
          args.dumpFormat = formatArg === 'csv' ? 'csv' : 'md';
        }
      }
    }
  }

  // Parse --interval or -i
  const intervalIndex = process.argv.findIndex(arg => arg === '--interval' || arg === '-i');
  if (intervalIndex !== -1 && process.argv[intervalIndex + 1]) {
    args.pollInterval = parseInt(process.argv[intervalIndex + 1]);
  }

  // Parse --dump-interval or -di
  const dumpIntervalIndex = process.argv.findIndex(arg => arg === '--dump-interval' || arg === '-di');
  if (dumpIntervalIndex !== -1 && process.argv[dumpIntervalIndex + 1]) {
    args.dumpInterval = parseInt(process.argv[dumpIntervalIndex + 1]);
  }

  // Parse --graph-time or -gt
  const graphTimeIndex = process.argv.findIndex(arg => arg === '--graph-time' || arg === '-gt');
  if (graphTimeIndex !== -1 && process.argv[graphTimeIndex + 1]) {
    args.graphTime = parseInt(process.argv[graphTimeIndex + 1]);
  }

  return args;
}

const cmdArgs = parseArgs();

// Configuration
let config = {
  email: process.env.TAPO_EMAIL,
  password: process.env.TAPO_PASSWORD,
  pollInterval: cmdArgs.pollInterval || parseInt(process.env.POLL_INTERVAL || '5000'),
  manualIps: {},
  verbose: cmdArgs.verbose,
  graph: cmdArgs.graph,
  graphTime: cmdArgs.graphTime || 120, // Default 120 seconds (2 minutes)
  dump: cmdArgs.dump,
  dumpFormat: cmdArgs.dumpFormat,
  dumpSwitchOn: cmdArgs.dumpSwitchOn,
  dumpToggleCheck: cmdArgs.dumpToggleCheck,
  dumpInterval: cmdArgs.dumpInterval || 10000 // Default 10 seconds for dump mode
};

// Try to load from env file if exists
try {
  const envContent = readFileSync(join(__dirname, 'env'), 'utf-8');
  const envVars = envContent.split('\n').reduce((acc, line) => {
    const [key, ...values] = line.split('=');
    if (key && values.length) {
      acc[key.trim()] = values.join('=').trim();
    }
    return acc;
  }, {});

  config.email = config.email || envVars.TAPO_EMAIL;
  config.password = config.password || envVars.TAPO_PASSWORD;
  // Only use env pollInterval if not set via command line
  if (!cmdArgs.pollInterval) {
    config.pollInterval = parseInt(envVars.POLL_INTERVAL || config.pollInterval);
  }

  // Parse manual IP mappings
  if (envVars.MANUAL_IPS) {
    const pairs = envVars.MANUAL_IPS.split(',').map(p => p.trim()).filter(p => p);
    pairs.forEach(pair => {
      const [mac, ip] = pair.split('=').map(s => s.trim());
      if (mac && ip) {
        config.manualIps[mac.toUpperCase().replace(/[:-]/g, '')] = ip;
      }
    });
  }
} catch (err) {
  // env file doesn't exist, use environment variables
}

// Also check environment variable for manual IPs
if (process.env.MANUAL_IPS) {
  const pairs = process.env.MANUAL_IPS.split(',').map(p => p.trim()).filter(p => p);
  pairs.forEach(pair => {
    const [mac, ip] = pair.split('=').map(s => s.trim());
    if (mac && ip) {
      config.manualIps[mac.toUpperCase().replace(/[:-]/g, '')] = ip;
    }
  });
}

if (!config.email || !config.password) {
  console.error('Error: TAPO_EMAIL and TAPO_PASSWORD must be set');
  console.error('Either set environment variables or create an env file (see env.example)');
  process.exit(1);
}

// Cloud API instance
let cloudApi = null;
let localDeviceCache = null;
let deviceClients = {}; // Store connected device clients for control
let autoRefreshInterval = null;

// Graph mode data structures
let historicalData = {}; // { deviceName: { x: [timestamps], y: [watts] } }
let deviceColors = {}; // { deviceName: 'red', 'blue', etc. }
let screen = null;
let lineChart = null;
let statusBox = null;
let MAX_DATA_POINTS = 24; // Default: 2 minutes = 120 seconds, at 5 second intervals = 24 points (calculated dynamically)
const COLORS = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
let colorIndex = 0;

// Function to generate markdown table
function generateMarkdownTable(powerInfos) {
  let markdown = `# TapoKeeper Power Report\n\n`;
  markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
  markdown += `| # | Device Name | Model | Status | Current Power | Today | This Month | IP Address |\n`;
  markdown += `|---|-------------|-------|--------|---------------|-------|------------|------------|\n`;

  powerInfos.forEach((info, idx) => {
    markdown += `| ${idx + 1} | ${info.name} | ${info.model} | ${info.status} | ${info.currentPower} | ${info.todayEnergy} | ${info.monthEnergy} | ${info.ip} |\n`;
  });

  // Add summary statistics
  const onlineDevices = powerInfos.filter(d => d.status === 'ON' || d.status === 'OFF');
  const activeDevices = powerInfos.filter(d => d.status === 'ON');
  const totalPower = powerInfos
    .filter(d => d.currentPower !== 'N/A')
    .reduce((sum, d) => {
      const watts = parseFloat(d.currentPower);
      return sum + (isNaN(watts) ? 0 : watts);
    }, 0);

  markdown += `\n## Summary\n\n`;
  markdown += `- **Total Devices**: ${powerInfos.length}\n`;
  markdown += `- **Online**: ${onlineDevices.length}\n`;
  markdown += `- **Active (ON)**: ${activeDevices.length}\n`;
  markdown += `- **Total Power Consumption**: ${totalPower.toFixed(2)} W\n`;

  return markdown;
}

// Function to save current data to file
async function savePowerData(format = 'md') {
  if (!currentDevices || currentDevices.length === 0) {
    console.log('\nNo device data available to save');
    return;
  }

  const content = format === 'csv' ? generateCSV(currentDevices) : generateMarkdownTable(currentDevices);
  const extension = format === 'csv' ? 'csv' : 'md';
  const filename = `tapo-power-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;

  const { writeFileSync } = await import('fs');
  writeFileSync(join(__dirname, filename), content);
  console.log(`\nPower data saved to ${filename}`);

  // Refresh display after a short delay
  setTimeout(() => displayPowerStats(), 1000);
}

// Function to generate CSV
function generateCSV(powerInfos) {
  let csv = `# TapoKeeper Power Report - Generated: ${new Date().toLocaleString()}\n`;
  csv += `#,Device Name,Model,Status,Current Power,Today,This Month,IP Address\n`;

  powerInfos.forEach((info, idx) => {
    // Escape commas in device names
    const name = info.name.includes(',') ? `"${info.name}"` : info.name;

    // Strip units from power-related columns for CSV output
    const currentPower = info.currentPower !== 'N/A' ? info.currentPower.replace(' W', '') : 'N/A';
    const todayEnergy = info.todayEnergy !== 'N/A' ? info.todayEnergy.replace(' kWh', '') : 'N/A';
    const monthEnergy = info.monthEnergy !== 'N/A' ? info.monthEnergy.replace(' kWh', '') : 'N/A';

    csv += `${idx + 1},${name},${info.model},${info.status},${currentPower},${todayEnergy},${monthEnergy},${info.ip}\n`;
  });

  // Add summary statistics as comments
  const onlineDevices = powerInfos.filter(d => d.status === 'ON' || d.status === 'OFF');
  const activeDevices = powerInfos.filter(d => d.status === 'ON');
  const totalPower = powerInfos
    .filter(d => d.currentPower !== 'N/A')
    .reduce((sum, d) => {
      const watts = parseFloat(d.currentPower);
      return sum + (isNaN(watts) ? 0 : watts);
    }, 0);

  csv += `\n# Summary\n`;
  csv += `# Total Devices: ${powerInfos.length}\n`;
  csv += `# Online: ${onlineDevices.length}\n`;
  csv += `# Active (ON): ${activeDevices.length}\n`;
  csv += `# Total Power Consumption: ${totalPower.toFixed(2)} W\n`;

  return csv;
}

// Graph mode helper functions
function initializeGraphUI() {
  // Calculate MAX_DATA_POINTS based on graph time and poll interval
  // graphTime is in seconds, pollInterval is in milliseconds
  MAX_DATA_POINTS = Math.ceil((config.graphTime * 1000) / config.pollInterval);

  screen = blessed.screen({
    smartCSR: true,
    title: 'TapoKeeper - Power Monitoring'
  });

  // Create grid
  const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

  // Status/table box at the top (7 rows - 58% of screen)
  statusBox = grid.set(0, 0, 7, 12, blessed.box, {
    label: `TapoKeeper - Device Status - ${config.pollInterval}ms Polling Interval`,
    content: 'Loading...',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      border: {
        fg: 'cyan'
      }
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      style: {
        bg: 'blue'
      }
    }
  });

  // Line chart for power consumption below the table (5 rows - 42% of screen)
  const graphTimeLabel = config.graphTime >= 60
    ? `${(config.graphTime / 60).toFixed(1)} Minutes`
    : `${config.graphTime} Seconds`;

  lineChart = grid.set(7, 1, 5, 10, contrib.line, {
    style: {
      line: 'yellow',
      text: 'green',
      baseline: 'black'
    },
    xLabelPadding: 3,
    xPadding: 5,
    showLegend: false,
    wholeNumbersOnly: false,
    label: `Power Consumption (Watts) - Last ${graphTimeLabel}`
  });

  // Key bindings
  screen.key(['escape', 'q', 'C-c'], function() {
    return process.exit(0);
  });

  screen.key(['1', '2', '3', '4', '5', '6', '7', '8', '9'], async function(ch) {
    const deviceIndex = parseInt(ch) - 1;
    if (deviceIndex < currentDevices.length) {
      const device = currentDevices[deviceIndex];
      const newState = device.status === 'ON' ? false : true;
      await toggleDevice(device.alias, newState);
    }
  });

  screen.key(['d'], async function() {
    await savePowerData('md');
  });

  screen.key(['c'], async function() {
    await savePowerData('csv');
  });

  screen.render();
}

function assignDeviceColor(deviceName) {
  if (!deviceColors[deviceName]) {
    deviceColors[deviceName] = COLORS[colorIndex % COLORS.length];
    colorIndex++;
  }
  return deviceColors[deviceName];
}

function updateHistoricalData(powerInfos) {
  const now = new Date();
  const timeLabel = now.toLocaleTimeString();

  powerInfos.forEach(info => {
    const deviceName = info.name;

    // Initialize device data if not exists
    if (!historicalData[deviceName]) {
      historicalData[deviceName] = {
        title: deviceName,
        x: [],
        y: [],
        style: {
          line: assignDeviceColor(deviceName)
        }
      };
    }

    // Extract watts from currentPower string (e.g., "5.23 W")
    let watts = 0;
    if (info.currentPower !== 'N/A') {
      const match = info.currentPower.match(/[\d.]+/);
      if (match) {
        watts = parseFloat(match[0]);
      }
    }

    // Add new data point
    historicalData[deviceName].x.push(timeLabel);
    historicalData[deviceName].y.push(watts);

    // Keep only last MAX_DATA_POINTS
    if (historicalData[deviceName].x.length > MAX_DATA_POINTS) {
      historicalData[deviceName].x.shift();
      historicalData[deviceName].y.shift();
    }
  });
}

function updateGraphDisplay(powerInfos) {
  // Update line chart
  const series = Object.values(historicalData);
  if (series.length > 0) {
    lineChart.setData(series);
  }

  // Create table using cli-table3 (same format as standard mode)
  const table = new Table({
    head: ['#', 'Device Name', 'Model', 'Status', 'Current Power', 'Today', 'This Month', 'IP Address'],
    colWidths: [4, 20, 15, 10, 15, 12, 12, 18]
  });

  // Add rows with colored device names matching graph colors
  powerInfos.forEach((info, idx) => {
    const color = deviceColors[info.name] || 'white';

    // Apply color to device name using colors library
    let coloredName = info.name;
    switch(color) {
      case 'red': coloredName = info.name.red; break;
      case 'green': coloredName = info.name.green; break;
      case 'yellow': coloredName = info.name.yellow; break;
      case 'blue': coloredName = info.name.blue; break;
      case 'magenta': coloredName = info.name.magenta; break;
      case 'cyan': coloredName = info.name.cyan; break;
      case 'white': coloredName = info.name.white; break;
    }

    table.push([
      idx + 1,
      coloredName,
      info.model,
      info.status,
      info.currentPower,
      info.todayEnergy,
      info.monthEnergy,
      info.ip
    ]);
  });

  // Calculate total power
  const totalPower = powerInfos
    .filter(d => d.currentPower !== 'N/A')
    .reduce((sum, d) => {
      const match = d.currentPower.match(/[\d.]+/);
      return sum + (match ? parseFloat(match[0]) : 0);
    }, 0);

  // Create content with table and footer (no header lines)
  let content = table.toString();
  content += `\n\nTotal Power: ${totalPower.toFixed(2)} W`;
  content += ` | Updated: ${new Date().toLocaleTimeString()}`;
  content += `\nControls: [1-${powerInfos.length}] toggle device | [d] dump to .md | [c] dump to .csv | [q] quit`;

  statusBox.setContent(content);
  screen.render();
}

async function displayPowerStatsWithGraph() {
  try {
    // Initialize UI if not already done
    if (!screen) {
      initializeGraphUI();
    }

    // Login to Tapo Cloud (only once, then reuse)
    if (!cloudApi) {
      cloudApi = await cloudLogin(config.email, config.password);
    }

    // Get all devices
    const devices = await cloudApi.listDevices();

    if (devices.length === 0) {
      if (statusBox) {
        statusBox.setContent('No devices found in your Tapo account.');
        screen.render();
      }
      return;
    }

    // Discover local devices (cache for 5 minutes to avoid excessive scanning)
    if (!localDeviceCache || (Date.now() - localDeviceCache.timestamp) > 300000) {
      let macToIpMap = {};
      let localNetworkDevices = [];

      // First, use manual IP mappings if provided
      if (Object.keys(config.manualIps).length > 0) {
        macToIpMap = { ...config.manualIps };
      }

      // Then try automatic discovery
      try {
        localNetworkDevices = await localDevices({ skipNameResolution: true });

        // Create MAC to IP mapping (don't overwrite manual mappings)
        localNetworkDevices.forEach(device => {
          if (device.mac && device.mac !== 'dynamic') {
            const normalizedMac = device.mac.replace(/[:-]/g, '').toUpperCase();
            if (!macToIpMap[normalizedMac]) {
              macToIpMap[normalizedMac] = device.ip;
            }
          }
        });
      } catch (err) {
        if (config.verbose) console.log(`Local device discovery failed: ${err.message}`);
      }

      // If local-devices didn't find all Tapo devices, start direct scanning
      const targetMacs = devices.map(d => d.deviceMac.replace(/[:-]/g, '').toUpperCase());
      const foundMacs = Object.keys(macToIpMap);
      const missingMacs = targetMacs.filter(mac => !foundMacs.includes(mac));

      if (missingMacs.length > 0) {
        const scanPromise = scanForTapoDevices(missingMacs, localNetworkDevices);
        const timeout = new Promise(resolve => setTimeout(() => resolve({}), 10000));
        const scannedDevices = await Promise.race([scanPromise, timeout]);

        // Merge scanned results
        Object.keys(scannedDevices).forEach(mac => {
          if (!macToIpMap[mac]) {
            macToIpMap[mac] = scannedDevices[mac];
          }
        });
      }

      localDeviceCache = { map: macToIpMap, timestamp: Date.now() };
    }

    // Collect power info from all devices in parallel
    const powerInfoPromises = devices.map(device => getDevicePowerInfo(device, localDeviceCache.map));
    const powerInfos = await Promise.all(powerInfoPromises);

    // Store for control operations
    currentDevices = powerInfos;

    // Update graph data
    updateHistoricalData(powerInfos);
    updateGraphDisplay(powerInfos);

  } catch (err) {
    if (statusBox) {
      statusBox.setContent(`{red-fg}Error: ${err.message}{/}`);
      screen.render();
    }
    if (err.message.includes('Invalid credentials')) {
      console.error('\nPlease check your TAPO_EMAIL and TAPO_PASSWORD in env file');
      process.exit(1);
    }
  }
}

// Function to brute-force scan for Tapo devices
async function scanForTapoDevices(targetMacs, localDevicesData) {
  if (config.verbose) console.log('Attempting direct IP scan for Tapo devices...');
  const macToIp = {};

  // Extract unique subnets from the local devices scan
  const subnets = new Set();
  localDevicesData.forEach(device => {
    if (device.ip) {
      const subnet = device.ip.substring(0, device.ip.lastIndexOf('.'));
      subnets.add(subnet);
    }
  });

  // If no subnets found, try to get from local IP
  if (subnets.size === 0) {
    const os = await import('os');
    const interfaces = os.networkInterfaces();
    const localIp = Object.values(interfaces)
      .flat()
      .find(iface => iface && iface.family === 'IPv4' && !iface.internal)?.address;

    if (localIp) {
      const subnet = localIp.substring(0, localIp.lastIndexOf('.'));
      subnets.add(subnet);
    }
  }

  if (subnets.size === 0) {
    if (config.verbose) console.log('Could not determine subnets to scan');
    return macToIp;
  }

  // Limit to first 5 subnets to avoid excessive scanning
  const subnetsToScan = Array.from(subnets).slice(0, 5);
  if (config.verbose) console.log(`Scanning ${subnetsToScan.length} subnet(s): ${subnetsToScan.join(', ')}`);

  // Try IPs in parallel with a timeout - scan with higher concurrency
  const batchSize = 50; // Increased from 5 to 50 for much faster scanning
  let foundCount = 0;

  for (const subnet of subnetsToScan) {
    if (config.verbose) console.log(`Scanning ${subnet}.x...`);

    for (let batchStart = 1; batchStart <= 254; batchStart += batchSize) {
      const batchPromises = [];

      for (let i = batchStart; i < batchStart + batchSize && i <= 254; i++) {
        const ip = `${subnet}.${i}`;
        batchPromises.push(
          (async () => {
            try {
              const deviceClient = await Promise.race([
                loginDeviceByIp(config.email, config.password, ip),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('timeout')), 1500)
                )
              ]);

              // If we got here, we successfully connected
              const deviceInfo = await deviceClient.getDeviceInfo();
              const mac = deviceInfo.mac?.replace(/[:-]/g, '').toUpperCase();

              if (mac && targetMacs.includes(mac)) {
                if (config.verbose) console.log(`Found Tapo device at ${ip} with MAC ${mac}`);
                macToIp[mac] = ip;
                foundCount++;
              }

              return { ip, mac };
            } catch (err) {
              // Ignore errors - device not found at this IP
              return null;
            }
          })()
        );
      }

      await Promise.all(batchPromises);

      // If we found all devices, stop scanning
      if (foundCount >= targetMacs.length) {
        if (config.verbose) console.log(`Found all ${targetMacs.length} devices, stopping scan`);
        break;
      }
    }

    if (foundCount >= targetMacs.length) break;
  }

  if (config.verbose) console.log(`Direct scan found ${foundCount} of ${targetMacs.length} Tapo devices`);
  return macToIp;
}

async function getDevicePowerInfo(device, macToIpMap) {
  const timeoutMs = 10000; // 10 second timeout per device

  try {
    // Try to find IP from local network scan
    const normalizedMac = device.deviceMac.replace(/[:-]/g, '').toUpperCase();
    const deviceIp = macToIpMap[normalizedMac];

    if (!deviceIp) {
      throw new Error('Device not found on local network');
    }

    // Try to login to device with longer timeout
    const deviceClient = await Promise.race([
      loginDeviceByIp(config.email, config.password, deviceIp),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), timeoutMs)
      )
    ]);

    // Store device client for control operations
    deviceClients[device.alias] = deviceClient;

    const deviceInfo = await deviceClient.getDeviceInfo();
    let energyUsage = null;

    // Try to get energy usage for P110 and similar models
    try {
      energyUsage = await deviceClient.getEnergyUsage();
    } catch (err) {
      // Device doesn't support energy monitoring
    }

    return {
      name: deviceInfo.nickname || device.alias || 'Unknown',
      model: deviceInfo.model || device.deviceModel || 'Unknown',
      status: deviceInfo.device_on ? 'ON' : 'OFF',
      currentPower: energyUsage?.current_power ? `${(energyUsage.current_power / 1000).toFixed(2)} W` : 'N/A',
      todayEnergy: energyUsage?.today_energy ? `${(energyUsage.today_energy / 1000).toFixed(3)} kWh` : 'N/A',
      monthEnergy: energyUsage?.month_energy ? `${(energyUsage.month_energy / 1000).toFixed(3)} kWh` : 'N/A',
      ip: deviceIp,
      alias: device.alias
    };
  } catch (err) {
    return {
      name: device.alias || 'Unknown',
      model: device.deviceModel || 'Unknown',
      status: 'OFFLINE',
      currentPower: 'N/A',
      todayEnergy: 'N/A',
      monthEnergy: 'N/A',
      ip: macToIpMap[device.deviceMac.replace(/[:-]/g, '').toUpperCase()] || 'Not found',
      error: err.message,
      alias: device.alias
    };
  }
}

async function displayPowerStats() {
  try {
    // Login to Tapo Cloud (only once, then reuse)
    if (!cloudApi) {
      cloudApi = await cloudLogin(config.email, config.password);
    }

    // Get all devices
    const devices = await cloudApi.listDevices();

    if (devices.length === 0) {
      console.clear();
      console.log('No devices found in your Tapo account.');
      return;
    }

    // Discover local devices (cache for 5 minutes to avoid excessive scanning)
    if (!localDeviceCache || (Date.now() - localDeviceCache.timestamp) > 300000) {
      let macToIpMap = {};
      let localNetworkDevices = [];

      // First, use manual IP mappings if provided
      if (Object.keys(config.manualIps).length > 0) {
        macToIpMap = { ...config.manualIps };
      }

      // Then try automatic discovery
      try {
        localNetworkDevices = await localDevices({ skipNameResolution: true });

        // Create MAC to IP mapping (don't overwrite manual mappings)
        localNetworkDevices.forEach(device => {
          if (device.mac && device.mac !== 'dynamic') {
            const normalizedMac = device.mac.replace(/[:-]/g, '').toUpperCase();
            if (!macToIpMap[normalizedMac]) {
              macToIpMap[normalizedMac] = device.ip;
            }
          }
        });
      } catch (err) {
        if (config.verbose) console.log(`Local device discovery failed: ${err.message}`);
      }

      // If local-devices didn't find all Tapo devices, start direct scanning in background
      const targetMacs = devices.map(d => d.deviceMac.replace(/[:-]/g, '').toUpperCase());
      const foundMacs = Object.keys(macToIpMap);
      const missingMacs = targetMacs.filter(mac => !foundMacs.includes(mac));

      if (missingMacs.length > 0) {
        if (config.verbose) console.log(`${missingMacs.length} device(s) not found via ARP scan, starting direct IP scan...`);

        // Start background scan but don't wait for it
        const scanPromise = scanForTapoDevices(missingMacs, localNetworkDevices);

        // Wait max 10 seconds, then continue with whatever we have
        const timeout = new Promise(resolve => setTimeout(() => resolve({}), 10000));
        const scannedDevices = await Promise.race([scanPromise, timeout]);

        // Merge scanned results (don't overwrite manual or ARP-discovered mappings)
        Object.keys(scannedDevices).forEach(mac => {
          if (!macToIpMap[mac]) {
            macToIpMap[mac] = scannedDevices[mac];
          }
        });

        // Continue scanning in background if not complete
        if (Object.keys(scannedDevices).length < missingMacs.length) {
          scanPromise.then(fullResults => {
            Object.keys(fullResults).forEach(mac => {
              if (!localDeviceCache.map[mac]) {
                localDeviceCache.map[mac] = fullResults[mac];
              }
            });
          });
        }
      }

      localDeviceCache = { map: macToIpMap, timestamp: Date.now() };
    }

    // Collect power info from all devices in parallel
    const powerInfoPromises = devices.map(device => getDevicePowerInfo(device, localDeviceCache.map));
    const powerInfos = await Promise.all(powerInfoPromises);

    // If in dump mode and NOT switchon/togglecheck, generate output and exit
    // (switchon and togglecheck need to continue to the main loop to do their work)
    if (config.dump && !config.dumpSwitchOn && !config.dumpToggleCheck) {
      const content = config.dumpFormat === 'csv' ? generateCSV(powerInfos) : generateMarkdownTable(powerInfos);
      const extension = config.dumpFormat === 'csv' ? 'csv' : 'md';
      const filename = `tapo-power-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
      const { writeFileSync } = await import('fs');
      writeFileSync(join(__dirname, filename), content);
      console.log(`Power data saved to ${filename}`);
      process.exit(0);
    }

    // Clear and redraw
    console.clear();
    console.log('TapoKeeper');
    console.log(`Polling interval: ${config.pollInterval}ms\n`);

    // Create table
    const table = new Table({
      head: ['#', 'Device Name', 'Model', 'Status', 'Current Power', 'Today', 'This Month', 'IP Address'],
      colWidths: [4, 20, 15, 10, 15, 12, 12, 18]
    });

    // Add rows
    powerInfos.forEach((info, idx) => {
      table.push([
        idx + 1,
        info.name,
        info.model,
        info.status,
        info.currentPower,
        info.todayEnergy,
        info.monthEnergy,
        info.ip
      ]);
    });

    console.log(table.toString());
    console.log(`\nLast updated: ${new Date().toLocaleString()}`);
    console.log('\nControls: [1-' + powerInfos.length + '] toggle device | [d] dump to .md | [c] dump to .csv | [q] quit');

  } catch (err) {
    console.error('Error:', err.message);
    if (err.message.includes('Invalid credentials')) {
      console.error('\nPlease check your TAPO_EMAIL and TAPO_PASSWORD in env file');
      process.exit(1);
    }
  }
}

async function toggleDevice(deviceAlias, turnOn) {
  const client = deviceClients[deviceAlias];
  if (!client) {
    console.log('Device not connected');
    return;
  }

  try {
    if (turnOn) {
      await client.turnOn();
    } else {
      await client.turnOff();
    }
    // Refresh display immediately
    if (config.graph) {
      await displayPowerStatsWithGraph();
    } else {
      await displayPowerStats();
    }
  } catch (err) {
    console.log('Error controlling device:', err.message);
  }
}

// Function to turn on OFF devices using the same logic as interactive toggles
async function turnOnOffDevices(powerInfos) {
  // Find devices that are OFF
  const offDevices = powerInfos.filter(info => info.status === 'OFF');

  if (config.verbose) {
    console.log(`Checking device status...`);
    console.log(`Found ${offDevices.length} device(s) that are OFF`);
  }

  if (offDevices.length === 0) {
    if (config.verbose) console.log('All devices are already ON');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  // Turn on OFF devices in parallel using stored clients (same as interactive toggle)
  const promises = offDevices.map(async (deviceInfo) => {
    const client = deviceClients[deviceInfo.alias];
    if (client) {
      try {
        await client.turnOn();
        successCount++;
        if (config.verbose) console.log(`  ✓ ${deviceInfo.name} turned on`);
      } catch (err) {
        failCount++;
        if (config.verbose) console.log(`  ✗ ${deviceInfo.name} failed: ${err.message}`);
      }
    } else {
      failCount++;
      if (config.verbose) console.log(`  ✗ ${deviceInfo.name} no client available`);
    }
  });

  await Promise.all(promises);
  if (config.verbose) console.log(`Turned on ${successCount} device(s)${failCount > 0 ? `, ${failCount} failed` : ''}`);
}

// Setup keypress mode for instant input (no Enter required) - skip in dump mode and graph mode
if (!config.dump && !config.graph && process.stdin.isTTY) {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
}

// Store device list for control
let currentDevices = [];

if (!config.dump && !config.graph) {
  process.stdin.on('keypress', async (str, key) => {
    if (key.ctrl && key.name === 'c') {
      console.log('\nExiting...');
      process.exit(0);
    }

    if (key.name === 'q') {
      console.log('\nExiting...');
      process.exit(0);
    }

    // 'd' key - dump to markdown
    if (key.name === 'd') {
      await savePowerData('md');
      return;
    }

    // 'c' key - dump to CSV
    if (key.name === 'c') {
      await savePowerData('csv');
      return;
    }

    // Check if it's a number key
    const deviceNum = parseInt(str);
    if (!isNaN(deviceNum) && deviceNum >= 1 && deviceNum <= currentDevices.length) {
      const device = currentDevices[deviceNum - 1];
      const currentStatus = device.status === 'ON';
      console.log(`\nTurning ${currentStatus ? 'OFF' : 'ON'} ${device.name}...`);
      await toggleDevice(device.alias, !currentStatus);
    }
  });
}

// Modified displayPowerStats to store device list
const originalDisplayPowerStats = displayPowerStats;
displayPowerStats = async function() {
  await originalDisplayPowerStats();
  // Update current devices list after display
  const devices = await cloudApi.listDevices();
  const powerInfoPromises = devices.map(device => getDevicePowerInfo(device, localDeviceCache.map));
  const powerInfos = await Promise.all(powerInfoPromises);
  currentDevices = powerInfos.map((info, idx) => ({
    ...info,
    number: idx + 1
  }));
};

// Initial display
if (config.graph) {
  await displayPowerStatsWithGraph();
} else {
  await displayPowerStats();
}

// If in dump mode, wait for the specified interval then display and exit
if (config.dump) {
  // If togglecheck mode, turn on OFF devices, wait, dump, then turn them back off
  if (config.dumpToggleCheck) {
    // Find devices that are currently OFF
    const offDevices = currentDevices.filter(info => info.status === 'OFF');

    if (config.verbose) {
      console.log(`ToggleCheck mode: Found ${offDevices.length} device(s) that are OFF`);
    }

    if (offDevices.length > 0) {
      // Turn on OFF devices
      await turnOnOffDevices(currentDevices);

      // Wait 5 seconds for power readings to stabilize
      if (config.verbose) console.log('Waiting 5 seconds for power data to stabilize...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Refresh the device data
      if (config.verbose) console.log('Refreshing device data...');
      const devices = await cloudApi.listDevices();
      const powerInfoPromises = devices.map(device => getDevicePowerInfo(device, localDeviceCache.map));
      const powerInfos = await Promise.all(powerInfoPromises);

      // Save dump
      const content = config.dumpFormat === 'csv' ? generateCSV(powerInfos) : generateMarkdownTable(powerInfos);
      const extension = config.dumpFormat === 'csv' ? 'csv' : 'md';
      const filename = `tapo-power-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
      const { writeFileSync } = await import('fs');
      writeFileSync(join(__dirname, filename), content);
      console.log(`Power data saved to ${filename}`);

      // Turn back off the devices that were originally off
      if (config.verbose) console.log(`Turning back off ${offDevices.length} device(s)...`);
      let successCount = 0;
      let failCount = 0;

      const promises = offDevices.map(async (deviceInfo) => {
        const client = deviceClients[deviceInfo.alias];
        if (client) {
          try {
            await client.turnOff();
            successCount++;
            if (config.verbose) console.log(`  ✓ ${deviceInfo.name} turned back off`);
          } catch (err) {
            failCount++;
            if (config.verbose) console.log(`  ✗ ${deviceInfo.name} failed: ${err.message}`);
          }
        } else {
          failCount++;
          if (config.verbose) console.log(`  ✗ ${deviceInfo.name} no client available`);
        }
      });

      await Promise.all(promises);
      if (config.verbose) console.log(`Turned off ${successCount} device(s)${failCount > 0 ? `, ${failCount} failed` : ''}`);
    } else {
      if (config.verbose) console.log('All devices are already ON, dumping current state');
      const devices = await cloudApi.listDevices();
      const powerInfoPromises = devices.map(device => getDevicePowerInfo(device, localDeviceCache.map));
      const powerInfos = await Promise.all(powerInfoPromises);

      const content = config.dumpFormat === 'csv' ? generateCSV(powerInfos) : generateMarkdownTable(powerInfos);
      const extension = config.dumpFormat === 'csv' ? 'csv' : 'md';
      const filename = `tapo-power-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
      const { writeFileSync } = await import('fs');
      writeFileSync(join(__dirname, filename), content);
      console.log(`Power data saved to ${filename}`);
    }

    process.exit(0);
  }
  // If switchon mode, turn on OFF devices, wait, then refresh and save
  else if (config.dumpSwitchOn) {
    // currentDevices was populated by the initial displayPowerStats()
    // Turn on devices that are OFF
    await turnOnOffDevices(currentDevices);

    // Wait 5 seconds for power readings to stabilize
    if (config.verbose) console.log('Waiting 5 seconds for power data to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Refresh the device data
    if (config.verbose) console.log('Refreshing device data...');
    const devices = await cloudApi.listDevices();
    const powerInfoPromises = devices.map(device => getDevicePowerInfo(device, localDeviceCache.map));
    const powerInfos = await Promise.all(powerInfoPromises);

    // Save and exit
    const content = config.dumpFormat === 'csv' ? generateCSV(powerInfos) : generateMarkdownTable(powerInfos);
    const extension = config.dumpFormat === 'csv' ? 'csv' : 'md';
    const filename = `tapo-power-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
    const { writeFileSync } = await import('fs');
    writeFileSync(join(__dirname, filename), content);
    console.log(`Power data saved to ${filename}`);
    process.exit(0);
  } else {
    if (config.verbose) console.log(`Waiting ${config.dumpInterval}ms before collecting data...`);
    await new Promise(resolve => setTimeout(resolve, config.dumpInterval));
    await displayPowerStats();
  }
} else {
  // Set up periodic refresh for interactive mode
  if (config.graph) {
    autoRefreshInterval = setInterval(displayPowerStatsWithGraph, config.pollInterval);
  } else {
    autoRefreshInterval = setInterval(displayPowerStats, config.pollInterval);
  }
}