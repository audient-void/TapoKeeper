import axios from 'axios';
import { createHash, randomBytes } from 'crypto';

const email = 'charles@fluxbound.net';
const password = 'tplink1033--';

function sha256(data) {
  return createHash('sha256').update(data).digest();
}

function sha1(data) {
  return createHash('sha1').update(data).digest();
}

function generateAuthHash(email, password) {
  // IMPORTANT: Library uses SHA1 for email/password, then SHA256 for the combination
  return sha256(Buffer.concat([
    sha1(Buffer.from(email)),
    sha1(Buffer.from(password))
  ]));
}

function handshake1AuthHash(localSeed, remoteSeed, authHash) {
  return sha256(Buffer.concat([localSeed, remoteSeed, authHash]));
}

async function testKlapAuth(deviceName, deviceIp) {
  console.log(`\n=== ${deviceName} (${deviceIp}) ===`);

  try {
    // Step 1: Handshake1
    const localSeed = randomBytes(16);
    console.log('Local seed:', localSeed.toString('hex'));

    const response1 = await axios.post(`http://${deviceIp}/app/handshake1`, localSeed, {
      responseType: 'arraybuffer',
      withCredentials: true,
      timeout: 5000
    });

    const responseBytes = Buffer.from(response1.data);
    const remoteSeed = responseBytes.slice(0, 16);
    const serverHash = responseBytes.slice(16);

    console.log('Remote seed:', remoteSeed.toString('hex'));
    console.log('Server hash:', serverHash.toString('hex'));

    // Step 2: Calculate local auth hash
    const localAuthHash = generateAuthHash(email, password);
    console.log('Local auth hash:', localAuthHash.toString('hex'));

    const localSeedAuthHash = handshake1AuthHash(localSeed, remoteSeed, localAuthHash);
    console.log('Local seed+auth hash:', localSeedAuthHash.toString('hex'));

    // Step 3: Compare
    const matches = localSeedAuthHash.equals(serverHash);
    console.log('Hashes match:', matches);

    if (!matches) {
      console.log('❌ KLAP AUTH FAILED - Server expects different credentials');

      // Try to see if different email/password would work by showing what the server expects
      console.log('\nServer is expecting a hash based on different credentials.');
      console.log('The server hash suggests the device has different account credentials stored.');
    } else {
      console.log('✓ KLAP AUTH SUCCESS');
    }

  } catch (err) {
    console.log('Error:', err.message);
  }
}

// Test both devices
await testKlapAuth('Router Corner (WORKS)', '10.10.0.221');
await testKlapAuth('Workstation (FAILS)', '10.10.0.223');

// Now try credential variations on Workstation
console.log('\n\n=== Testing Workstation with credential variations ===');
const emailVariations = [
  'charles@fluxbound.net',
  'Charles@fluxbound.net',
  'CHARLES@FLUXBOUND.NET',
];

const localSeed = randomBytes(16);
const response = await axios.post('http://10.10.0.223/app/handshake1', localSeed, {
  responseType: 'arraybuffer',
  withCredentials: true,
  timeout: 5000
});

const responseBytes = Buffer.from(response.data);
const remoteSeed = responseBytes.slice(0, 16);
const serverHash = responseBytes.slice(16);

console.log('Server expects hash:', serverHash.toString('hex'), '\n');

let found = false;
for (const testEmail of emailVariations) {
  const authHash = generateAuthHash(testEmail, password);
  const calculatedHash = handshake1AuthHash(localSeed, remoteSeed, authHash);

  if (calculatedHash.equals(serverHash)) {
    console.log('✓✓✓ MATCH FOUND! ✓✓✓');
    console.log('Working email:', testEmail);
    console.log('Password:', password);
    found = true;
    break;
  } else {
    console.log(`✗ ${testEmail} - no match`);
  }
}

if (!found) {
  console.log('\n❌ No email variation matches. Device has completely different credentials.');
}