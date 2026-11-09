import express from 'express';
import { verifyPassword } from '../password.js';
import { setSessionCookie, clearSessionCookie, isAuthenticated } from '../auth.js';

const router = express.Router();

// Brute-force protection: limit failed logins per client IP (in memory, resets on restart)
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const failedAttempts = new Map();

const getRecentFailures = (ip) => {
  const now = Date.now();
  const recent = (failedAttempts.get(ip) || []).filter((time) => now - time < LOCKOUT_WINDOW_MS);
  if (recent.length > 0) {
    failedAttempts.set(ip, recent);
  } else {
    failedAttempts.delete(ip);
  }
  return recent;
};

// Log in with the admin password
router.post('/login', (req, res) => {
  const ip = req.ip;
  const recentFailures = getRecentFailures(ip);

  if (recentFailures.length >= MAX_FAILED_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((recentFailures[0] + LOCKOUT_WINDOW_MS - Date.now()) / 1000);
    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      success: false,
      message: `Too many failed attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`
    });
  }

  const { password } = req.body || {};

  if (!password || !verifyPassword(password, process.env.ADMIN_PASSWORD_HASH)) {
    failedAttempts.set(ip, [...recentFailures, Date.now()]);
    return res.status(401).json({
      success: false,
      message: 'Incorrect password'
    });
  }

  failedAttempts.delete(ip);
  setSessionCookie(req, res);

  res.json({
    success: true,
    message: 'Logged in successfully'
  });
});

// Log out by clearing the session cookie
router.post('/logout', (req, res) => {
  clearSessionCookie(req, res);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Report whether the current browser has a valid admin session
router.get('/session', (req, res) => {
  res.json({
    success: true,
    data: { authenticated: isAuthenticated(req) }
  });
});

export default router;
