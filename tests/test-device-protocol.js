import pkg from 'tp-link-tapo-connect';
import klapTransport from './node_modules/tp-link-tapo-connect/dist/klap-transport.js';
import securePassthrough from './node_modules/tp-link-tapo-connect/dist/secure-passthrough-transport.js';

const email = 'charles@fluxbound.net';
const password = 'tplink1033--';

const devices = [
  { name: 'Router Corner (WORKS)', ip: '10.10.0.221' },
  { name: 'Workstation (FAILS)', ip: '10.10.0.223' }
];

for (const device of devices) {
  console.log(`\n=== Testing ${device.name} ===`);

  // Try KLAP first
  console.log('Attempting KLAP protocol...');
  try {
    const client = await klapTransport.loginDeviceByIp(email, password, device.ip);
    console.log('✓ KLAP WORKS!');
    const info = await client.getDeviceInfo();
    console.log(`  Device: ${info.nickname}, Status: ${info.device_on ? 'ON' : 'OFF'}`);
  } catch (err) {
    console.log(`✗ KLAP failed: ${err.message}`);

    // Try legacy protocol
    console.log('Attempting legacy secure-passthrough protocol...');
    try {
      const client = await securePassthrough.loginDeviceByIp(email, password, device.ip);
      console.log('✓ LEGACY WORKS!');
      const info = await client.getDeviceInfo();
      console.log(`  Device: ${info.nickname}, Status: ${info.device_on ? 'ON' : 'OFF'}`);
    } catch (legacyErr) {
      console.log(`✗ Legacy failed: ${legacyErr.message}`);
    }
  }
}