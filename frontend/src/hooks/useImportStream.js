import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";
import { isTerminal } from "../lib/status.js";

/**
 * Bir import'un durumunu SSE ile canlı izler.
 *
 * İki önemli ayrıntı:
 * - Backend akışı terminal durumda kapatıyor; EventSource kapanan bağlantıyı kendiliğinden
 *   yeniden açtığı için terminal mesajı gelince bağlantıyı biz kapatıyoruz.
 * - SSE hiç kurulamazsa (proxy, ağ vb.) yedek olarak periyodik GET ile yoklama yapıyoruz.
 */
export function useImportStream(importId, { enabled = true, onUpdate }) {
  const [connection, setConnection] = useState("idle");
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled || !importId) {
      setConnection("idle");
      return undefined;
    }

    let stopped = false;
    let pollTimer = null;
    const source = new EventSource(api.streamUrl(importId));

    const cleanup = () => {
      stopped = true;
      source.close();
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const startPolling = () => {
      if (stopped || pollTimer) return;
      setConnection("polling");
      pollTimer = setInterval(async () => {
        try {
          const data = await api.getImport(importId);
          onUpdateRef.current?.(data);
          if (isTerminal(data.status)) cleanup();
        } catch {
          // geçici hatalarda bir sonraki turda tekrar denenecek
        }
      }, 3000);
    };

    source.onopen = () => {
      if (!stopped) setConnection("live");
    };

    source.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      if (payload.error) {
        cleanup();
        setConnection("closed");
        return;
      }
      onUpdateRef.current?.(payload);
      if (isTerminal(payload.status)) {
        cleanup();
        setConnection("closed");
      }
    };

    source.onerror = () => {
      if (stopped) return;
      source.close();
      startPolling();
    };

    return cleanup;
  }, [importId, enabled]);

  return connection;
}
