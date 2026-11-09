import crypto from 'crypto';

const { ADMIN_PASSWORD_HASH, SESSION_SECRET } = process.env;

if (!ADMIN_PASSWORD_HASH || !SESSION_SECRET) {
  throw new Error('ADMIN_PASSWORD_HASH and SESSION_SECRET must be set (see .env.example, run `npm run hash-password`)');
}

const COOKIE_NAME = 'mshasha_admin';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // sliding: renewed while the admin keeps using the panel
const SESSION_RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

// Signing key is tied to the password hash, so changing the password logs out every session
const signingKey = crypto.createHmac('sha256', SESSION_SECRET).update(ADMIN_PASSWORD_HASH).digest();

const sign = (payload) => crypto.createHmac('sha256', signingKey).update(payload).digest('base64url');

const createSessionToken = () => {
  const payload = Buffer.from(JSON.stringify({ iat: Date.now() })).toString('base64url');
  return `${payload}.${sign(payload)}`;
};

// Returns the session payload, or null when the token is missing, tampered with or expired
const readSessionToken = (token) => {
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof session.iat !== 'number' || Date.now() - session.iat > SESSION_MAX_AGE_MS) return null;
    return session;
  } catch {
    return null;
  }
};

const getCookie = (req, name) => {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
};

const cookieOptions = (req) => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: req.secure || process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE_MS
});

const setSessionCookie = (req, res) => {
  res.cookie(COOKIE_NAME, createSessionToken(), cookieOptions(req));
};

const clearSessionCookie = (req, res) => {
  const { maxAge, ...options } = cookieOptions(req);
  res.clearCookie(COOKIE_NAME, options);
};

const isAuthenticated = (req) => readSessionToken(getCookie(req, COOKIE_NAME)) !== null;

// Protects admin-only routes and renews the session cookie once a day while it is in use
const requireAdmin = (req, res, next) => {
  const session = readSessionToken(getCookie(req, COOKIE_NAME));

  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (Date.now() - session.iat > SESSION_RENEW_AFTER_MS) {
    setSessionCookie(req, res);
  }

  next();
};

export {
  setSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  requireAdmin
};
