import crypto from 'crypto';

// Password hashes are stored as scrypt$<N>$<saltBase64>$<hashBase64>
const SCRYPT_N = 16384;
const SCRYPT_KEY_LENGTH = 64;

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH, { N: SCRYPT_N });
  return `scrypt$${SCRYPT_N}$${salt.toString('base64')}$${hash.toString('base64')}`;
};

const verifyPassword = (password, stored) => {
  const [scheme, n, salt, hash] = String(stored).split('$');
  if (scheme !== 'scrypt' || !n || !salt || !hash) return false;

  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(String(password), Buffer.from(salt, 'base64'), expected.length, { N: Number(n) });
  return crypto.timingSafeEqual(actual, expected);
};

export { hashPassword, verifyPassword };
