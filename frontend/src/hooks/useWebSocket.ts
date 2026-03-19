import { useEffect, useRef, useCallback, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/api/ws";

export interface OnlineUser {
  user_id: string;
  user_name: string;
  rating: number;
  tier: string;
  image_url: string;
}

export interface ChallengePayload {
  from_id: string;
  from_name: string;
  from_rating: number;
  to_id: string;
  contest_id: string;
  difficulty: string;
  mode: string;
  timer_secs?: number;
}

export interface WSHandlers {
  onOnlineUsers?: (users: OnlineUser[]) => void;
  onChallengeReceived?: (payload: ChallengePayload) => void;
  onChallengeResponse?: (payload: {
    contest_id: string;
    from_id: string;
    to_id: string;
    accepted: boolean;
  }) => void;
  onReadyUpdate?: (payload: {
    contest_id: string;
    ready_count: number;
    user_id: string;
  }) => void;
  onDuelStart?: (payload: { contest_id: string }) => void;
  onOpponentLeft?: (payload: { contest_id: string; user_id: string }) => void;
  onOpponentWon?: (payload: { contest_id: string }) => void;
}

export function useWebSocket(params: {
  userId: string;
  userName: string;
  tier: string;
  imageUrl: string;
  handlers: WSHandlers;
  enabled: boolean;
}) {
  const { enabled, userId, userName, tier, imageUrl, handlers } = params;
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<WSHandlers>(handlers);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const send = useCallback((type: string, payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  useEffect(() => {
    if (!enabled || !userId) return;

    const url = `${WS_URL}?user_id=${userId}&user_name=${encodeURIComponent(userName)}&tier=${tier}&image_url=${encodeURIComponent(imageUrl)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const payload =
          typeof msg.payload === "string"
            ? JSON.parse(msg.payload)
            : msg.payload;

        switch (msg.type) {
          case "online_users":
            handlersRef.current.onOnlineUsers?.(payload);
            break;
          case "challenge_received":
            handlersRef.current.onChallengeReceived?.(payload);
            break;
          case "challenge_response":
            handlersRef.current.onChallengeResponse?.(payload);
            break;
          case "ready_update":
            handlersRef.current.onReadyUpdate?.(payload);
            break;
          case "duel_start":
            handlersRef.current.onDuelStart?.(payload);
            break;
          case "opponent_left":
            handlersRef.current.onOpponentLeft?.(payload);
            break;
          case "opponent_won":
            handlersRef.current.onOpponentWon?.(payload);
            break;
        }
      } catch {}
    };

    return () => {
      ws.close();
    };
  }, [enabled, userId, userName, tier, imageUrl]);

  return { send, connected };
}
