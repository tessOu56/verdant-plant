import { describe, expect, it } from 'vitest';
import {
  allowServiceControl,
  controlTokenMatches,
  isAllowedControlOrigin,
  isLoopbackAddress,
} from './control-access.js';

describe('control-access', () => {
  it('accepts loopback addresses only', () => {
    expect(isLoopbackAddress('127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('::1')).toBe(true);
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('10.0.0.4')).toBe(false);
    expect(isLoopbackAddress('0.0.0.0')).toBe(false);
  });

  it('compares control tokens in constant time and rejects mismatches', () => {
    expect(controlTokenMatches('secret', 'secret')).toBe(true);
    expect(controlTokenMatches('secret', 'wrong1')).toBe(false);
    expect(controlTokenMatches('short', 'longer-token')).toBe(false);
    expect(controlTokenMatches('', 'secret')).toBe(false);
    expect(controlTokenMatches(undefined, 'secret')).toBe(false);
  });

  it('allows missing or local Origins and rejects foreign Origins', () => {
    expect(isAllowedControlOrigin(undefined)).toBe(true);
    expect(isAllowedControlOrigin('http://localhost:5173')).toBe(true);
    expect(isAllowedControlOrigin('http://127.0.0.1:4000')).toBe(true);
    expect(isAllowedControlOrigin('https://evil.example')).toBe(false);
  });

  it('denies remote start/stop without a token', () => {
    const req = { socket: { remoteAddress: '203.0.113.9' }, headers: {} };
    expect(allowServiceControl(req, {})).toBe(false);
  });

  it('allows loopback start/stop without a token', () => {
    const req = { socket: { remoteAddress: '127.0.0.1' }, headers: {} };
    expect(allowServiceControl(req, {})).toBe(true);
  });

  it('rejects loopback CSRF from a foreign Origin', () => {
    const req = {
      socket: { remoteAddress: '127.0.0.1' },
      headers: { origin: 'https://evil.example' },
    };
    expect(allowServiceControl(req, {})).toBe(false);
  });

  it('requires the control token header when CONTROL_TOKEN is set', () => {
    const env = { CONTROL_TOKEN: 'openseame' };
    const remote = { socket: { remoteAddress: '203.0.113.9' }, headers: { 'x-control-token': 'openseame' } };
    const missing = { socket: { remoteAddress: '127.0.0.1' }, headers: {} };
    const wrong = { socket: { remoteAddress: '203.0.113.9' }, headers: { 'x-control-token': 'nope' } };
    expect(allowServiceControl(remote, env)).toBe(true);
    expect(allowServiceControl(missing, env)).toBe(false);
    expect(allowServiceControl(wrong, env)).toBe(false);
  });
});
