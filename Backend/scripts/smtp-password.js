// Converts the SMTP user's IAM secret access key into an Amazon SES SMTP password: `npm run smtp-password`
// Reads the key from stdin so it never appears in shell history or the process list.
// Algorithm: https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html
import crypto from 'crypto';
import { askSecret } from './prompt.js';

const REGION = process.env.AWS_REGION || 'af-south-1';

// Fixed inputs defined by SES for deriving SMTP passwords
const DATE = '11111111';
const SERVICE = 'ses';
const MESSAGE = 'SendRawEmail';
const TERMINAL = 'aws4_request';
const VERSION = 0x04;

const sign = (key, message) => crypto.createHmac('sha256', key).update(message).digest();

const smtpPassword = (secretAccessKey, region) => {
  let signature = sign(`AWS4${secretAccessKey}`, DATE);
  for (const part of [region, SERVICE, TERMINAL, MESSAGE]) {
    signature = sign(signature, part);
  }
  return Buffer.concat([Buffer.from([VERSION]), signature]).toString('base64');
};

const secretAccessKey = (await askSecret('IAM secret access key: ')).trim();

if (!/^[A-Za-z0-9/+]{40}$/.test(secretAccessKey)) {
  console.error('That does not look like an IAM secret access key (40 characters).');
  process.exit(1);
}

console.log(`\nSMTP settings for Gmail "Send mail as" (region ${REGION}):\n`);
console.log(`  SMTP server: email-smtp.${REGION}.amazonaws.com`);
console.log('  Port:        587 (TLS)');
console.log('  Username:    the access key ID (starts with AKIA)');
console.log(`  Password:    ${smtpPassword(secretAccessKey, REGION)}`);
