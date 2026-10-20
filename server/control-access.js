import crypto from 'crypto';

export function isLoopbackAddress(addr) {
  return addr === '127.0.0.1' || addr === '::1' || addr === ':ffff:127.0.0.1' || addr === '::ffff:127.0.0.1';
}

export function controlTokenMatches(provided, expected) {
  if (!expected || provided == null || provided === '') return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isLocalHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

/** Browser CSRF from a non-local Origin, while still allowing curl (no Origin) on loopback. */
export function isAllowedControlOrigin(origin) {
  if (!origin) return true;
  try {
    return isLocalHostname(new URL(origin).hostname);
  } catch {
    return false;
  }
}

/**
 * Start/stop is process control. Allow when:
 * - CONTROL_TOKEN is set and `x-control-token` matches, or
 * - the peer is loopback and Origin is absent or local (localhost / 127.0.0.1 / ::1).
 */
export function allowServiceControl(req, env = process.env) {
  const expected = env.CONTROL_TOKEN;
  if (expected) return controlTokenMatches(req.headers?.['x-control-token'], expected);
  if (!isLoopbackAddress(req.socket?.remoteAddress)) return false;
  return isAllowedControlOrigin(req.headers?.origin);
}
