import { tokenStorage } from '@/lib/tokenStorage';

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/**
 * Opens an SSE connection to /events/stream.
 * Returns a cleanup function — call it on component unmount.
 */
export function createSyncStream(
  onEvent: (data: Record<string, unknown>) => void,
  onError?: (err: Event) => void,
): () => void {
  const token = tokenStorage.getToken('accessToken');
  const url = `${BASE_URL}/events/stream?token=${encodeURIComponent(token ?? '')}`;
  const es = new EventSource(url);

  es.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data) as Record<string, unknown>);
    } catch {
      // malformed event — silently ignore
    }
  };

  if (onError) es.onerror = onError;

  return () => es.close();
}
