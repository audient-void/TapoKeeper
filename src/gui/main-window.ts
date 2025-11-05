/**
 * NodeGUI Main Window
 */

import {
  QMainWindow,
  QWidget,
  QLabel,
  QPushButton,
  QTableWidget,
  QTableWidgetItem,
  FlexLayout,
  QBoxLayout,
  Direction,
  AlignmentFlag,
} from '@nodegui/nodegui';
import type { DeviceWithPower } from '../types/index.js';
import { TapoService } from '../services/tapo.js';

export class MainWindow {
  private window: QMainWindow;
  private table: QTableWidget;
  private statusLabel: QLabel;
  private devices: DeviceWithPower[] = [];
  private tapoService: TapoService | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.window = new QMainWindow();
    this.window.setWindowTitle('TapoKeeper - Tapo Smart Plug Monitor');
    this.window.resize(1200, 700);

    // Create central widget
    const centralWidget = new QWidget();
    const layout = new QBoxLayout(Direction.TopToBottom);

    // Header
    const header = new QLabel();
    header.setText('<h1>TapoKeeper</h1><p>TP-Link Tapo Smart Plug Monitor</p>');
    header.setInlineStyle('font-size: 24px; padding: 20px;');
    layout.addWidget(header);

    // Buttons
    const buttonWidget = new QWidget();
    const buttonLayout = new QBoxLayout(Direction.LeftToRight);

    const connectBtn = new QPushButton();
    connectBtn.setText('Connect');
    connectBtn.addEventListener('clicked', () => this.handleConnect());
    buttonLayout.addWidget(connectBtn);

    const refreshBtn = new QPushButton();
    refreshBtn.setText('Refresh');
    refreshBtn.addEventListener('clicked', () => this.handleRefresh());
    buttonLayout.addWidget(refreshBtn);

    const exportBtn = new QPushButton();
    exportBtn.setText('Export to Markdown');
    exportBtn.addEventListener('clicked', () => this.handleExport('md'));
    buttonLayout.addWidget(exportBtn);

    const exportCsvBtn = new QPushButton();
    exportCsvBtn.setText('Export to CSV');
    exportCsvBtn.addEventListener('clicked', () => this.handleExport('csv'));
    buttonLayout.addWidget(exportCsvBtn);

    buttonWidget.setLayout(buttonLayout);
    layout.addWidget(buttonWidget);

    // Table
    this.table = new QTableWidget();
    this.table.setColumnCount(9);
    this.table.setHorizontalHeaderLabels([
      '#',
      'Device',
      'Model',
      'Status',
      'Power (W)',
      'Today (kWh)',
      'Month (kWh)',
      'IP Address',
      'Action',
    ]);
    this.table.setMinimumSize(1150, 400);
    layout.addWidget(this.table);

    // Status bar
    this.statusLabel = new QLabel();
    this.statusLabel.setText('Ready to connect...');
    this.statusLabel.setInlineStyle('padding: 10px; background: #f0f0f0;');
    layout.addWidget(this.statusLabel);

    centralWidget.setLayout(layout);
    this.window.setCentralWidget(centralWidget);
  }

  show(): void {
    this.window.show();
  }

  close(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.window.close();
  }

  private async handleConnect(): Promise<void> {
    this.statusLabel.setText('Connecting to Tapo Cloud...');

    // Load config (simplified - should use ConfigService)
    const email = process.env.TAPO_EMAIL || '';
    const password = process.env.TAPO_PASSWORD || '';

    if (!email || !password) {
      this.statusLabel.setText('Error: TAPO_EMAIL and TAPO_PASSWORD must be set in env file');
      return;
    }

    this.tapoService = new TapoService(email, password, false);

    const success = await this.tapoService.login();
    if (success) {
      this.statusLabel.setText('Connected to Tapo Cloud');
      await this.handleRefresh();

      // Start auto-refresh
      this.updateInterval = setInterval(() => {
        this.handleRefresh();
      }, 5000);
    } else {
      this.statusLabel.setText('Failed to connect to Tapo Cloud');
    }
  }

  private async handleRefresh(): Promise<void> {
    if (!this.tapoService) {
      this.statusLabel.setText('Not connected. Please connect first.');
      return;
    }

    this.statusLabel.setText('Scanning for devices...');

    try {
      const cloudDevices = await this.tapoService.getCloudDevices();

      // TODO: Discover IPs (simplified version)
      this.devices = [];
      for (const device of cloudDevices) {
        // In real implementation, we'd discover IPs via ARP/subnet scan
        // For now, just show cloud devices
        this.devices.push({ ...device, powerData: null });
      }

      this.updateTable();
      this.statusLabel.setText(`Found ${this.devices.length} device(s)`);
    } catch (error) {
      this.statusLabel.setText(`Error: ${error}`);
    }
  }

  private updateTable(): void {
    this.table.setRowCount(this.devices.length);

    for (let i = 0; i < this.devices.length; i++) {
      const device = this.devices[i];

      this.table.setItem(i, 0, new QTableWidgetItem((i + 1).toString()));
      this.table.setItem(i, 1, new QTableWidgetItem(device.alias));
      this.table.setItem(i, 2, new QTableWidgetItem(device.model));
      this.table.setItem(i, 3, new QTableWidgetItem(device.deviceOn ? '🟢 ON' : '🔴 OFF'));

      if (device.powerData) {
        this.table.setItem(i, 4, new QTableWidgetItem(device.powerData.currentPowerW.toFixed(2)));
        this.table.setItem(i, 5, new QTableWidgetItem((device.powerData.todayEnergyWh / 1000).toFixed(3)));
        this.table.setItem(i, 6, new QTableWidgetItem((device.powerData.monthEnergyWh / 1000).toFixed(3)));
      } else {
        this.table.setItem(i, 4, new QTableWidgetItem('N/A'));
        this.table.setItem(i, 5, new QTableWidgetItem('N/A'));
        this.table.setItem(i, 6, new QTableWidgetItem('N/A'));
      }

      this.table.setItem(i, 7, new QTableWidgetItem(device.ip || 'Unknown'));

      const toggleBtn = new QPushButton();
      toggleBtn.setText('Toggle');
      toggleBtn.addEventListener('clicked', () => this.handleToggle(i));
      this.table.setCellWidget(i, 8, toggleBtn);
    }
  }

  private async handleToggle(index: number): Promise<void> {
    if (!this.tapoService) return;

    const device = this.devices[index];
    if (!device.ip) {
      this.statusLabel.setText('Cannot toggle: device IP unknown');
      return;
    }

    const newState = !device.deviceOn;
    const success = await this.tapoService.toggleDevice(device.ip, newState);

    if (success) {
      device.deviceOn = newState;
      this.updateTable();
      this.statusLabel.setText(`${device.alias} turned ${newState ? 'ON' : 'OFF'}`);
    } else {
      this.statusLabel.setText(`Failed to toggle ${device.alias}`);
    }
  }

  private async handleExport(format: 'md' | 'csv'): Promise<void> {
    this.statusLabel.setText(`Exporting to ${format.toUpperCase()}...`);
    // TODO: Implement export logic
    this.statusLabel.setText(`Export to ${format.toUpperCase()} not yet implemented`);
  }
}
