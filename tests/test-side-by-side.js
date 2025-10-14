import axios from 'axios';
import { createHash, randomBytes } from 'crypto';

function sha256(data) {
  return createHash('sha256').update(data).digest();
}

function sha1(data) {
  return createHash('sha1').update(data).digest();
}

function generateAuthHash(email, password) {
  return sha256(Buffer.concat([
    sha1(Buffer.from(email)),
    sha1(Buffer.from(password))
  ]));
}

function handshake1AuthHash(localSeed, remoteSeed, authHash) {
  return sha256(Buffer.concat([localSeed, remoteSeed, authHash]));
}

const email = 'charles@fluxbound.net';
const password = 'tplink1033--';

console.log('Testing SAME credentials on both devices simultaneously...');
console.log('Email:', email);
console.log('Password:', password);
console.log('');

// Use the SAME localSeed for both to ensure we're testing the same way
const localSeed = randomBytes(16);
const authHash = generateAuthHash(email, password);

console.log('Local seed (same for both):', localSeed.toString('hex'));
console.log('Auth hash (same for both):', authHash.toString('hex'));
console.log('');

// Test Router Corner
console.log('=== Router Corner (10.10.0.221) ===');
try {
  const response1 = await axios.post('http://10.10.0.221/app/handshake1', localSeed, {
    responseType: 'arraybuffer',
    withCredentials: true
  });

  const responseBytes1 = Buffer.from(response1.data);
  const remoteSeed1 = responseBytes1.slice(0, 16);
  const serverHash1 = responseBytes1.slice(16);
  const calculatedHash1 = handshake1AuthHash(localSeed, remoteSeed1, authHash);

  console.log('Remote seed:', remoteSeed1.toString('hex'));
  console.log('Server hash:', serverHash1.toString('hex'));
  console.log('Our hash:   ', calculatedHash1.toString('hex'));
  console.log('Match:', calculatedHash1.equals(serverHash1) ? '✓ YES' : '✗ NO');
} catch (err) {
  console.log('Error:', err.message);
}

console.log('');

// Test Workstation
console.log('=== Workstation (10.10.0.223) ===');
try {
  const response2 = await axios.post('http://10.10.0.223/app/handshake1', localSeed, {
    responseType: 'arraybuffer',
    withCredentials: true
  });

  const responseBytes2 = Buffer.from(response2.data);
  const remoteSeed2 = responseBytes2.slice(0, 16);
  const serverHash2 = responseBytes2.slice(16);
  const calculatedHash2 = handshake1AuthHash(localSeed, remoteSeed2, authHash);

  console.log('Remote seed:', remoteSeed2.toString('hex'));
  console.log('Server hash:', serverHash2.toString('hex'));
  console.log('Our hash:   ', calculatedHash2.toString('hex'));
  console.log('Match:', calculatedHash2.equals(serverHash2) ? '✓ YES' : '✗ NO');
} catch (err) {
  console.log('Error:', err.message);
}

console.log('');
console.log('CONCLUSION:');
console.log('If Router Corner matches but Workstation doesn\'t with the SAME credentials,');
console.log('then the devices have different account credentials stored locally.');
console.log('This should be impossible after a proper factory reset.');