/**
 * Configuration service for loading env files and parsing CLI arguments
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { AppConfig } from '../types/index.js';

export class ConfigService {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  getConfig(): AppConfig {
    return this.config;
  }

  private loadConfig(): AppConfig {
    // Default configuration
    const config: AppConfig = {
      tapoEmail: '',
      tapoPassword: '',
      pollInterval: 5000,
      manualIps: {},
      verbose: false,
      graphMode: false,
      graphTimeSeconds: 120,
      dumpMode: false,
      dumpFormat: 'md',
      dumpInterval: 10000,
    };

    // Load from env file
    this.loadEnvFile(config);

    // Parse command-line arguments (overrides env file)
    this.parseArgs(config);

    return config;
  }

  private loadEnvFile(config: AppConfig): void {
    const envPath = join(process.cwd(), 'env');

    if (!existsSync(envPath)) {
      return;
    }

    try {
      const envContent = readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();

        switch (key) {
          case 'TAPO_EMAIL':
            config.tapoEmail = value;
            break;
          case 'TAPO_PASSWORD':
            config.tapoPassword = value;
            break;
          case 'POLL_INTERVAL':
            config.pollInterval = parseInt(value, 10) || 5000;
            break;
          case 'MANUAL_IPS':
            config.manualIps = this.parseManualIps(value);
            break;
        }
      }
    } catch (error) {
      console.error('Failed to load env file:', error);
    }
  }

  private parseArgs(config: AppConfig): void {
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '-h':
        case '--help':
          this.showHelp();
          process.exit(0);
          break;

        case '-v':
        case '--verbose':
          config.verbose = true;
          break;

        case '-g':
        case '--graph':
          config.graphMode = true;
          break;

        case '-gt':
        case '--graph-time':
          config.graphTimeSeconds = parseInt(args[++i], 10) || 120;
          break;

        case '-i':
        case '--interval':
          config.pollInterval = parseInt(args[++i], 10) || 5000;
          break;

        case '--dump':
          config.dumpMode = true;
          // Check next arg for format/variant
          if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
            const nextArg = args[i + 1];
            if (nextArg === 'csv') {
              config.dumpFormat = 'csv';
              i++;
            } else if (nextArg === 'switchon') {
              config.dumpVariant = 'switchon';
              i++;
              // Check if next is 'csv'
              if (i + 1 < args.length && args[i + 1] === 'csv') {
                config.dumpFormat = 'csv';
                i++;
              }
            } else if (nextArg === 'togglecheck') {
              config.dumpVariant = 'togglecheck';
              i++;
              // Check if next is 'csv'
              if (i + 1 < args.length && args[i + 1] === 'csv') {
                config.dumpFormat = 'csv';
                i++;
              }
            }
          }
          break;

        case '-di':
        case '--dump-interval':
          config.dumpInterval = parseInt(args[++i], 10) || 10000;
          break;

        case '--cli':
          // This will be handled in main index
          break;
      }
    }
  }

  private parseManualIps(value: string): Record<string, string> {
    const result: Record<string, string> = {};

    if (!value) {
      return result;
    }

    const pairs = value.split(',');
    for (const pair of pairs) {
      const [mac, ip] = pair.split('=');
      if (mac && ip) {
        result[mac.trim()] = ip.trim();
      }
    }

    return result;
  }

  private showHelp(): void {
    console.log(`
TapoKeeper v2.0 - TypeScript + NodeGUI Edition
==============================================

Monitor and control TP-Link Tapo Smart Plugs with real-time power tracking.

USAGE:
  node dist/index.js [OPTIONS]
  npm start -- [OPTIONS]

MODES:
  (default)                 Launch NodeGUI native desktop application
  --cli                     Launch CLI/TUI mode (terminal interface)

CLI OPTIONS:
  -h, --help                Show this help message and exit
  -v, --verbose             Enable verbose debug output
  -g, --graph               Enable graphical power monitoring with real-time chart
  -gt, --graph-time <sec>   Set graph time window in seconds (default: 120)
  -i, --interval <ms>       Set polling interval in milliseconds (default: 5000)

DUMP MODE:
  --dump [format]           Run in dump mode: collect data and save to file then exit
                            Formats: md (default), csv, switchon, togglecheck
  -di, --dump-interval <ms> Set wait time before collecting data (default: 10000ms)

INTERACTIVE CONTROLS (CLI mode):
  1-9                       Toggle device on/off
  d                         Dump to markdown file
  c                         Dump to CSV file
  q                         Quit

CONFIGURATION:
  Create an 'env' file with:
    TAPO_EMAIL=your-email@example.com
    TAPO_PASSWORD=your-password
    POLL_INTERVAL=5000
    MANUAL_IPS=MAC1=IP1,MAC2=IP2

EXAMPLES:
  npm start                           # Launch GUI
  npm start -- --cli                  # Launch CLI
  npm start -- --cli --graph          # CLI with graphs
  npm start -- --dump                 # One-shot dump to markdown
  npm start -- --dump csv             # One-shot dump to CSV
  npm start -- --dump switchon        # Turn on devices, then dump

For more information, visit: https://github.com/audient-void/TapoKeeper
`);
  }
}
