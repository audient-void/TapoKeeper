import { createHash } from 'crypto';

const email = 'charles@fluxbound.net';
const password = 'tplink1033--';

function sha256(data) {
  return createHash('sha256').update(data).digest();
}

function generateAuthHash(email, password) {
  return sha256(Buffer.concat([
    sha256(Buffer.from(email.normalize('NFKC'))),
    sha256(Buffer.from(password.normalize('NFKC')))
  ]));
}

const authHash = generateAuthHash(email, password);
console.log('Auth hash for credentials:', authHash.toString('hex'));
console.log('\nEmail:', email);
console.log('Email length:', email.length);
console.log('Password length:', password.length);
console.log('\nEmail bytes:', Buffer.from(email).toString('hex'));
console.log('Password bytes:', Buffer.from(password).toString('hex'));