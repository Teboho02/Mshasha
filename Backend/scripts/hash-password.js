// Prints .env lines for the admin password: `npm run hash-password`
// Reads the password from stdin so it never appears in shell history or the process list.
import crypto from 'crypto';
import readline from 'readline';
import { hashPassword } from '../src/password.js';

const MIN_LENGTH = 12;

const ask = (question) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });

  // Hide typed characters when running in a terminal
  if (process.stdin.isTTY) {
    rl._writeToOutput = (text) => {
      if (text.includes(question)) rl.output.write(text);
    };
  }

  rl.question(question, (answer) => {
    rl.close();
    if (process.stdin.isTTY) process.stdout.write('\n');
    resolve(answer);
  });
});

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
