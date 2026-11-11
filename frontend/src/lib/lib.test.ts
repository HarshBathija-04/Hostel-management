import { afterEach, describe, expect, test, vi } from 'vitest';
import { date, label, money, monthLabel, percent } from './format';
import { api, ApiError, SLOW_AFTER_MS, wakeStore } from './api';

describe('format', () => {
  test('money uses Indian grouping', () => {
    expect(money(150000)).toBe('₹1,50,000');
    expect(money(null)).toBe('₹0');
  });
  test('date handles plain dates, timestamps and blanks', () => {
    expect(date('2026-07-15')).toBe('15 Jul 2026');
    expect(date(null)).toBe('—');
    expect(date('nonsense')).toBe('—');
  });
  test('labels and months', () => {
    expect(label('in_progress')).toBe('In progress');
    expect(monthLabel('2026-09')).toMatch(/^Sept? 2026$/);
    expect(monthLabel('bad')).toBe('—');
    expect(percent(1, 3)).toBe(33);
    expect(percent(1, 0)).toBe(0);
  });
});

describe('api', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('returns data and maps field errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { ok: 1 } }))));
    await expect(api('/x')).resolves.toEqual({ ok: 1 });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, message: 'Validation failed', errors: [{ field: 'title', message: 'Too short' }] }), { status: 400 }),
      ),
    );
    const error = (await api('/x').catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.fieldErrors).toEqual({ title: 'Too short' });
  });

  test('flags a slow (cold-start) request and clears it when done', async () => {
    vi.useFakeTimers();
    let resolve!: (r: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => (resolve = r))));
    const pending = api('/slow');
    expect(wakeStore.isWaking()).toBe(false);
    await vi.advanceTimersByTimeAsync(SLOW_AFTER_MS + 1);
    expect(wakeStore.isWaking()).toBe(true);
    resolve(new Response(JSON.stringify({ success: true, data: null })));
    await pending;
    expect(wakeStore.isWaking()).toBe(false);
  });

  test('network failure becomes a friendly ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')));
    await expect(api('/x')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('Cannot reach the server') });
  });
});
