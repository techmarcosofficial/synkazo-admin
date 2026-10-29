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
  const es = new EventSource(`${BASE_URL}/events/stream`, {
    withCredentials: true,
  });

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
