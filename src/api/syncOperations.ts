import apiClient from './apiClient';
import { tokenStorage } from '@/lib/tokenStorage';
import type {
  MonitorFilters,
  MonitorRunPage,
  MonitorSnapshot,
} from '@/types/syncOperations';

const path = '/super-admin/platform/sync-operations';
const readOptions = { timeout: 8000, _suppressGlobalError: true };
export const syncOperationsApi = {
  snapshot: (filters: MonitorFilters, recent: boolean, signal?: AbortSignal) =>
    apiClient
      .get<{ data: MonitorSnapshot }>(`${path}${recent ? '/recent' : ''}`, {
        params: filters,
        signal,
        ...readOptions,
      })
      .then((response) => response.data.data),
  detail: (id: string, signal?: AbortSignal) =>
    apiClient
      .get<{ data: MonitorRunPage }>(`${path}/runs/${id}`, {
        signal,
        ...readOptions,
      })
      .then((response) => response.data.data),
  async stream(
    id: string,
    signal: AbortSignal,
    onData: (data: MonitorRunPage) => void,
  ) {
    const base =
      import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    const response = await fetch(`${base}${path}/runs/${id}/stream`, {
      headers: {
        Authorization: `Bearer ${tokenStorage.getToken('accessToken') ?? ''}`,
        Accept: 'text/event-stream',
      },
      signal,
      credentials: 'include',
    });
    if (!response.ok || !response.body)
      throw new Error('Live progress connection unavailable');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (!signal.aborted) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer = (
          buffer + decoder.decode(chunk.value, { stream: true })
        ).replace(/\r\n/g, '\n');
        if (buffer.length > 65536)
          throw new Error('Live progress message too large');
        let end: number;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const data = frame
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trimStart())
            .join('\n');
          if (frame.includes('event: sync-monitor') && data)
            onData(JSON.parse(data) as MonitorRunPage);
          if (frame.includes('event: monitor-unavailable'))
            throw new Error('Live progress temporarily unavailable');
        }
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  },
};
