import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncOperationsApi } from './syncOperations';

afterEach(() => vi.unstubAllGlobals());
describe('Selected-run monitor stream', () => {
  it('handles split SSE frames and CRLF boundaries using a header token, then releases the reader', async () => {
    const payload = {
      generatedAt: '2026-10-19T00:00:00Z',
      data: [],
      nextCursor: null,
    };
    const text = `event: sync-monitor\r\ndata: ${JSON.stringify(payload)}\r\n\r\n`;
    const split = text.length - 1;
    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(text.slice(0, split)),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(text.slice(split)),
        })
        .mockResolvedValueOnce({ done: true }),
      cancel: vi.fn().mockResolvedValue(undefined),
      releaseLock: vi.fn(),
    };
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, body: { getReader: () => reader } });
    vi.stubGlobal('fetch', fetch);
    const onData = vi.fn();
    await syncOperationsApi.stream(
      'run-1',
      new AbortController().signal,
      onData,
    );
    expect(onData).toHaveBeenCalledExactlyOnceWith(payload);
    expect(fetch.mock.calls[0][0]).not.toContain('?token=');
    expect(fetch.mock.calls[0][1].headers.Authorization).toMatch(/^Bearer /);
    expect(reader.cancel).toHaveBeenCalledOnce();
    expect(reader.releaseLock).toHaveBeenCalledOnce();
  });
  it('rejects disconnected or oversized frames without buffering indefinitely', async () => {
    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('x'.repeat(65537)),
        }),
      cancel: vi.fn().mockResolvedValue(undefined),
      releaseLock: vi.fn(),
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, body: { getReader: () => reader } }),
    );
    await expect(
      syncOperationsApi.stream('run', new AbortController().signal, vi.fn()),
    ).rejects.toThrow('too large');
    expect(reader.cancel).toHaveBeenCalledOnce();
  });
});
