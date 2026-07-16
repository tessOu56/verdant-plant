import { useEffect, useRef, useState, useCallback } from 'react';

export type ConnStatus = 'connecting' | 'open' | 'closed';

/**
 * 可重連的 WebSocket hook（技術棧展示重點）：
 * - 指數退避 + 抖動重連
 * - 應用層心跳偵測（>20s 無訊息即主動斷線重連）
 * - 用 ref 存 socket / callback，避免 re-render 重建與 stale closure
 */
export function useSocket(path: string, onMessage: (data: any) => void) {
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const sockRef = useRef<WebSocket | null>(null);
  const retries = useRef(0);
  const lastMsg = useRef(Date.now());
  const onMsg = useRef(onMessage);
  onMsg.current = onMessage;

  const connect = useCallback(() => {
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${path}`;
    const ws = new WebSocket(url);
    sockRef.current = ws;
    setStatus('connecting');
    ws.onopen = () => { retries.current = 0; setStatus('open'); };
    ws.onmessage = (e) => { lastMsg.current = Date.now(); try { onMsg.current(JSON.parse(e.data)); } catch {} };
    ws.onclose = () => {
      setStatus('closed');
      const delay = Math.min(1000 * 2 ** retries.current, 15000) + Math.random() * 400;
      retries.current++;
      setTimeout(connect, delay);
    };
    ws.onerror = () => ws.close();
  }, [path]);

  useEffect(() => {
    connect();
    const hb = setInterval(() => {
      if (Date.now() - lastMsg.current > 20000) sockRef.current?.close();
    }, 5000);
    return () => { clearInterval(hb); sockRef.current?.close(); };
  }, [connect]);

  const send = useCallback((data: unknown) => {
    if (sockRef.current?.readyState === WebSocket.OPEN) sockRef.current.send(JSON.stringify(data));
  }, []);

  return { status, send };
}
