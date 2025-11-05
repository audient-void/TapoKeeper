/**
 * Tapo device service - wrapper around tp-link-tapo-connect
 */

import pkg from 'tp-link-tapo-connect';
const { cloudLogin, loginDeviceByIp } = pkg;
import type { TapoDevice, PowerData, DeviceWithPower } from '../types/index.js';

export class TapoService {
  private email: string;
  private password: string;
  private verbose: boolean;
  private cloudClient: any;

  constructor(email: string, password: string, verbose: boolean = false) {
    this.email = email;
    this.password = password;
    this.verbose = verbose;
  }

  async login(): Promise<boolean> {
    try {
      if (this.verbose) {
        console.log('Logging in to Tapo Cloud...');
      }

      this.cloudClient = await cloudLogin(this.email, this.password);

      if (this.verbose) {
        console.log('Successfully logged in to Tapo Cloud');
      }

      return true;
    } catch (error) {
      console.error('Error logging in to Tapo Cloud:', error);
      return false;
    }
  }

  async getCloudDevices(): Promise<TapoDevice[]> {
    try {
      const devices = await this.cloudClient.getDeviceList();
      return devices.map((d: any) => this.mapDevice(d));
    } catch (error) {
      if (this.verbose) {
        console.error('Error getting cloud devices:', error);
      }
      return [];
    }
  }

  async getDeviceInfo(ip: string): Promise<DeviceWithPower | null> {
    try {
      const deviceClient = await loginDeviceByIp(this.email, this.password, ip);
      const info = await deviceClient.getDeviceInfo();

      const device: TapoDevice = {
        deviceId: info.device_id || '',
        alias: info.nickname || info.alias || 'Unknown',
        model: info.model || '',
        mac: info.mac || '',
        ip: ip,
        firmwareVersion: info.fw_ver || '',
        hardwareVersion: info.hw_ver || '',
        deviceOn: info.device_on || false,
        onTime: info.on_time || 0,
      };

      // Try to get power data if device supports it
      let powerData: PowerData | null = null;
      if (this.supportsEnergyMonitoring(device.model)) {
        try {
          const energyUsage = await deviceClient.getEnergyUsage();
          const currentPower = energyUsage.current_power || 0;

          powerData = {
            currentPowerW: currentPower / 1000, // Convert from mW to W
            todayEnergyWh: energyUsage.today_energy || 0,
            monthEnergyWh: energyUsage.month_energy || 0,
            currentVoltage: energyUsage.local_time ? 120 : 0, // Placeholder
            currentCurrent: currentPower > 0 ? currentPower / 120000 : 0, // Estimate
            timestamp: new Date(),
          };
        } catch (error) {
          if (this.verbose) {
            console.error(`Failed to get power data for ${device.alias}:`, error);
          }
        }
      }

      return { ...device, powerData };
    } catch (error) {
      if (this.verbose) {
        console.error(`Error getting device info from ${ip}:`, error);
      }
      return null;
    }
  }

  async toggleDevice(ip: string, turnOn: boolean): Promise<boolean> {
    try {
      const deviceClient = await loginDeviceByIp(this.email, this.password, ip);
      await deviceClient.setPowerState(turnOn);
      return true;
    } catch (error) {
      console.error(`Error toggling device at ${ip}:`, error);
      return false;
    }
  }

  private mapDevice(d: any): TapoDevice {
    return {
      deviceId: d.deviceId || '',
      alias: d.alias || d.deviceName || 'Unknown',
      model: d.deviceModel || '',
      mac: d.deviceMac || '',
      ip: '',
      firmwareVersion: d.fwVer || '',
      hardwareVersion: d.hwVer || '',
      deviceOn: d.status === 1,
      onTime: 0,
    };
  }

  private supportsEnergyMonitoring(model: string): boolean {
    return model.includes('P110') || model.includes('P115');
  }
}
