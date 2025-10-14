import pkg from 'tp-link-tapo-connect';
const { loginDeviceByIp } = pkg;
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load credentials from .env
const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
const envVars = envContent.split('\n').reduce((acc, line) => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    acc[key.trim()] = values.join('=').trim();
  }
  return acc;
}, {});

const email = envVars.TAPO_EMAIL;
const password = envVars.TAPO_PASSWORD;

console.log('Testing with updated credentials from .env:');
console.log('Email:', email);
console.log('Password:', password);
console.log('');

const devices = [
  { name: 'Router Corner', ip: '10.10.0.221', expected: 'Should work if not yet updated' },
  { name: 'Workstation', ip: '10.10.0.223', expected: 'Should work after re-adding with new password' },
];

for (const device of devices) {
  console.log(`Testing ${device.name} (${device.ip})...`);
  console.log(`  Expected: ${device.expected}`);

  try {
    const client = await loginDeviceByIp(email, password, device.ip);
    const info = await client.getDeviceInfo();
    console.log(`  ✓ SUCCESS! Connected to ${info.nickname}`);
    console.log(`  Status: ${info.device_on ? 'ON' : 'OFF'}`);

    try {
      const energy = await client.getEnergyUsage();
      console.log(`  Power: ${(energy.current_power / 1000).toFixed(2)} W`);
    } catch (e) {
      console.log(`  Power: Not available`);
    }
  } catch (err) {
    console.log(`  ✗ FAILED: ${err.message}`);
  }

  console.log('');
}

console.log('Next steps:');
console.log('1. If Router Corner now fails, you need to re-add it with the new password');
console.log('2. If Workstation now works, the password change fixed it!');
console.log('3. Factory reset and re-add each failing device one by one');