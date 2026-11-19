import { useEffect, useRef, useState, useCallback } from 'react';
import { SensorReading } from '../types';

export type StreamStatus = 'connected' | 'connecting' | 'fallback-polling' | 'disconnected';

export interface UseLiveStreamOptions {
  zoneId: string;
  onReadingUpdate?: (readings: Record<string, SensorReading>) => void;
}

export function useLiveStream(options: UseLiveStreamOptions) {
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('connecting');
  const [latestReadings, setLatestReadings] = useState<Record<string, SensorReading>>({});
  const [latencyMs, setLatencyMs] = useState<number>(24);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);
  const pollingIntervalRef = useRef<any>(null);
  const reconnectAttempts = useRef<number>(0);

  const fallbackPoll = useCallback(async () => {
    try {
      const res = await fetch('/api/sensors/current');
      if (res.ok) {
        const data = await res.json();
        const extracted: Record<string, SensorReading> = {};
        for (const [key, val] of Object.entries<any>(data)) {
          if (val?.latest_reading) {
            extracted[key] = val.latest_reading;
          }
        }
        if (Object.keys(extracted).length > 0) {
          setLatestReadings(extracted);
          setLastUpdated(new Date());
          options.onReadingUpdate?.(extracted);
        }
      }
    } catch (e) {
      // Graceful silence in poll error
    }
  }, [options]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setStreamStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const connectStart = Date.now();

      ws.onopen = () => {
        reconnectAttempts.current = 0;
        setStreamStatus('connected');
        setLatencyMs(Math.max(12, Date.now() - connectStart));

        // Start ping interval
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 12000);

        // Stop fallback polling if active
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'TELEMETRY_UPDATE' || msg.type === 'INITIAL_SNAPSHOT') {
            if (msg.readings) {
              setLatestReadings((prev) => ({
                ...prev,
                ...msg.readings,
              }));
              setLastUpdated(new Date());
              options.onReadingUpdate?.(msg.readings);
            }
          }
        } catch (e) {
          console.warn('Failed to parse WS telemetry message', e);
        }
      };

      ws.onclose = () => {
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        reconnectAttempts.current += 1;
        // If multiple reconnections fail, enter seamless fallback polling
        if (reconnectAttempts.current >= 2) {
          setStreamStatus('fallback-polling');
          if (!pollingIntervalRef.current) {
            fallbackPoll();
            pollingIntervalRef.current = setInterval(fallbackPoll, 3000);
          }
        } else {
          setStreamStatus('connecting');
        }

        // Schedule reconnect
        const delay = Math.min(6000, 1000 * Math.pow(1.5, reconnectAttempts.current));
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
      };

      ws.onerror = () => {
        // Will trigger onclose and attempt reconnect/fallback
      };
    } catch (err) {
      setStreamStatus('fallback-polling');
      if (!pollingIntervalRef.current) {
        fallbackPoll();
        pollingIntervalRef.current = setInterval(fallbackPoll, 3000);
      }
    }
  }, [fallbackPoll, options]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [connectWebSocket]);

  return {
    streamStatus,
    latestReadings,
    currentZoneReading: latestReadings[options.zoneId],
    latencyMs,
    lastUpdated,
  };
}
