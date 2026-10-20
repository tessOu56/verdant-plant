import { describe, expect, it } from 'vitest';
import {
  fmtUptime,
  humanizeCraftError,
  resolveConsoleHref,
} from './nav';

describe('resolveConsoleHref', () => {
  it('sends station ports back to the referring console', () => {
    expect(
      resolveConsoleHref({
        port: '4101',
        pathname: '/',
        referrer: 'http://localhost:5173/',
        protocol: 'http:',
        hostname: 'localhost',
      }),
    ).toBe('http://localhost:5173/');
  });

  it('falls back to :4000 when a station has no referrer', () => {
    expect(
      resolveConsoleHref({
        port: '4102',
        pathname: '/',
        referrer: '',
        protocol: 'http:',
        hostname: 'localhost',
      }),
    ).toBe('http://localhost:4000/');
  });

  it('returns / from a console-hosted station html page', () => {
    expect(
      resolveConsoleHref({
        port: '5173',
        pathname: '/atelier.html',
        referrer: '',
        protocol: 'http:',
        hostname: 'localhost',
      }),
    ).toBe('/');
  });

  it('hides the back link on console index and Capacitor-style /index.html', () => {
    expect(
      resolveConsoleHref({
        port: '4000',
        pathname: '/',
        referrer: '',
        protocol: 'http:',
        hostname: 'localhost',
      }),
    ).toBeNull();
    expect(
      resolveConsoleHref({
        port: '',
        pathname: '/index.html',
        referrer: '',
        protocol: 'https:',
        hostname: 'localhost',
      }),
    ).toBeNull();
  });
});

describe('fmtUptime', () => {
  it('formats seconds, minutes, hours', () => {
    expect(fmtUptime(0)).toBe('—');
    expect(fmtUptime(4000)).toBe('4s');
    expect(fmtUptime(65_000)).toBe('1m 5s');
    expect(fmtUptime(3_700_000)).toBe('1h 1m');
  });
});

describe('humanizeCraftError', () => {
  it('maps engine codes to Chinese', () => {
    expect(humanizeCraftError('insufficient:malachite')).toBe('材料不足，無法開始提煉');
    expect(humanizeCraftError('craft_in_progress')).toBe('已有提煉進行中');
    expect(humanizeCraftError('weird')).toBe('weird');
  });
});
