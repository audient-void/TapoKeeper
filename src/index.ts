#!/usr/bin/env node

/**
 * TapoKeeper v2.0 - TypeScript + NodeGUI Edition
 * Main entry point - decides between GUI and CLI mode
 */

import { ConfigService } from './services/config.js';
import { MainWindow } from './gui/main-window.js';

async function main() {
  // Check if CLI mode is requested
  const isCliMode = process.argv.includes('--cli') ||
                   process.argv.includes('--dump') ||
                   process.argv.includes('--graph') ||
                   process.argv.includes('-h') ||
                   process.argv.includes('--help');

  if (isCliMode) {
    // Run in CLI mode (use original JavaScript implementation)
    console.log('CLI mode: Please use the original JavaScript version for now.');
    console.log('Run: node src/index-cli.js ' + process.argv.slice(2).join(' '));
    console.log('\nAlternatively, run the TypeScript CLI (work in progress):');
    console.log('The full CLI port to TypeScript is in progress.');
    process.exit(0);
  } else {
    // Run in GUI mode with NodeGUI
    console.log('Starting TapoKeeper GUI...');

    try {
      // Create and show main window
      const mainWindow = new MainWindow();
      mainWindow.show();

      // Keep process alive
      (global as any).win = mainWindow; // Prevent GC from collecting window

    } catch (error) {
      console.error('Error starting GUI:', error);
      process.exit(1);
    }
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start application
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
