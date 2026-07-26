import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const WS_URL = 'ws://localhost:8000/ws';
const RECONNECT_DELAY = 3000;

export default function useRealtimeSync() {
  const qc     = useQueryClient();
  const wsRef  = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === 'refresh') {
            qc.invalidateQueries({ queryKey: ['queue'] });
            qc.invalidateQueries({ queryKey: ['appointments'] });
            qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
            qc.invalidateQueries({ queryKey: ['portal-appt'] });
          } else if (msg.event === 'queue_update') {
            // Merge positions/statuses directly into the cache — no HTTP round-trip
            qc.setQueryData(['queue'], (old) => {
              if (!old?.data?.data?.queue) return old;
              const wsMap = Object.fromEntries(msg.queue.map(q => [q.appointmentId, q]));
              const allKnown = msg.queue.every(q =>
                old.data.data.queue.some(c => c.appointmentId === q.appointmentId)
              );
              if (!allKnown) {
                // New patient in queue — fall back to refetch so patient info loads
                qc.invalidateQueries({ queryKey: ['queue'] });
                return old;
              }
              const updated = old.data.data.queue
                .filter(c => wsMap[c.appointmentId])
                .map(c => {
                  const w = wsMap[c.appointmentId];
                  return { ...c, position: w.position, status: w.status, estimatedWaitMinutes: w.estimatedWait };
                })
                .sort((a, b) => a.position - b.position);
              return {
                ...old,
                data: { ...old.data, data: { ...old.data.data, count: updated.length, queue: updated } },
              };
            });
          }
        } catch { /* ignore malformed messages */ }
      };

      ws.onclose = () => {
        // auto-reconnect after delay
        timerRef.current = setTimeout(connect, RECONNECT_DELAY);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [qc]);
}
