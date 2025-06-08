/**
 * WebSocket service for real-time conversion updates
 */

interface ConversionUpdate {
  conversionId: number;
  status: string;
  progress: number;
  message?: string;
}

export class ConversionWebSocket {
  private ws: WebSocket | null = null;
  private listeners: Map<number, (update: ConversionUpdate) => void> = new Map();

  connect() {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/conversions`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const update: ConversionUpdate = JSON.parse(event.data);
        const listener = this.listeners.get(update.conversionId);
        if (listener) {
          listener(update);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Reconnect after 3 seconds
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  subscribe(conversionId: number, callback: (update: ConversionUpdate) => void) {
    this.listeners.set(conversionId, callback);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        conversionId
      }));
    }
  }

  unsubscribe(conversionId: number) {
    this.listeners.delete(conversionId);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        conversionId
      }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const conversionWS = new ConversionWebSocket();
