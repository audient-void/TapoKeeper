/**
 * TypeScript type definitions for TapoKeeper
 */

export interface AppConfig {
  tapoEmail: string;
  tapoPassword: string;
  pollInterval: number;
  manualIps: Record<string, string>;
  verbose: boolean;
  graphMode: boolean;
  graphTimeSeconds: number;
  dumpMode: boolean;
  dumpFormat: 'md' | 'csv';
  dumpInterval: number;
  dumpVariant?: 'switchon' | 'togglecheck';
}

export interface TapoDevice {
  deviceId: string;
  alias: string;
  model: string;
  mac: string;
  ip: string;
  firmwareVersion: string;
  hardwareVersion: string;
  deviceOn: boolean;
  onTime: number;
}

export interface PowerData {
  currentPowerW: number;
  todayEnergyWh: number;
  monthEnergyWh: number;
  currentVoltage: number;
  currentCurrent: number;
  timestamp: Date;
}

export interface DeviceWithPower extends TapoDevice {
  powerData: PowerData | null;
}

export interface DumpOptions {
  format: 'md' | 'csv';
  variant?: 'switchon' | 'togglecheck';
  interval: number;
}

export interface CLI {
  start(): Promise<void>;
  stop(): void;
}

export interface GUI {
  start(): Promise<void>;
  stop(): void;
}
