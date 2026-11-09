// Prints .env lines for the admin password: `npm run hash-password`
// Reads the password from stdin so it never appears in shell history or the process list.
import crypto from 'crypto';
import { hashPassword } from '../src/password.js';
import { askSecret as ask } from './prompt.js';

const MIN_LENGTH = 12;

const password = await ask('New admin password: ');

if (password.length < MIN_LENGTH) {
  console.error(`Password must be at least ${MIN_LENGTH} characters.`);
  process.exit(1);
}

if (process.stdin.isTTY) {
  const confirmation = await ask('Confirm password: ');
  if (confirmation !== password) {
    console.error('Passwords do not match.');
    process.exit(1);
  }
}

console.log('\nAdd these lines to Backend/.env (replace any existing ones), then restart the server:\n');
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}`);
console.log(`SESSION_SECRET=${crypto.randomBytes(32).toString('base64url')}`);
