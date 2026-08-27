import { tokenStorage } from './tokenStorage';

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

type SseCallback = (data: unknown) => void;

class SseClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<SseCallback>> = new Map();
  private attachedEvents: Set<string> = new Set();
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 30_000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;

  connect(): void {
    const token = tokenStorage.getToken('accessToken');
    if (!token || this.eventSource) return;

    try {
      this.eventSource = new EventSource(
        `${BASE_URL}/events/stream?token=${encodeURIComponent(token)}`,
      );
      this.attachedEvents.clear();

      for (const event of this.listeners.keys()) {
        this._attach(event);
      }

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        this.connected = true;
      };
      this.eventSource.onerror = () => this._handleDisconnect();
    } catch {
      this._handleDisconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.eventSource?.close();
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private _handleDisconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
    this.connected = false;
    this.reconnectAttempts += 1;
    const delay = Math.min(
      1000 * this.reconnectAttempts,
      this.maxReconnectDelay,
    );
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private _attach(event: string): void {
    if (!this.eventSource || this.attachedEvents.has(event)) return;
    this.attachedEvents.add(event);
    this.eventSource.addEventListener(event, (e: MessageEvent) => {
      let data: unknown = null;
      try {
        data = JSON.parse(e.data);
      } catch {
        /* ignore malformed payload */
      }
      this.listeners.get(event)?.forEach((cb) => {
        try {
          cb(data);
        } catch {
          /* one bad listener shouldn't break others */
        }
      });
    });
  }

  on(event: string, callback: SseCallback): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    if (this.eventSource) this._attach(event);
    return () => this.off(event, callback);
  }

  off(event: string, callback: SseCallback): void {
    this.listeners.get(event)?.delete(callback);
  }
}

export const sseClient = new SseClient();
