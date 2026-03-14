"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  useWebSocket,
  OnlineUser,
  ChallengePayload,
} from "@/hooks/useWebSocket";
import { Swords, Check, X } from "lucide-react";

function ChallengeNotification({
  challenge,
  onAccept,
  onDecline,
}: {
  challenge: ChallengePayload;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(30);
  useEffect(() => {
    const iv = setInterval(
      () =>
        setTimeLeft((t) => {
          if (t <= 1) {
            onDecline();
            return 0;
          }
          return t - 1;
        }),
      1000,
    );
    return () => clearInterval(iv);
  }, [onDecline]);

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        width: 320,
        background: "#0f1015",
        border: "1px solid rgba(99,102,241,0.4)",
        borderRadius: 16,
        padding: 20,
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.2)",
        animation: "slideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        fontFamily: "ui-monospace,monospace",
      }}
    >
      <style>{`@keyframes slideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(99,102,241,0.15)",
            border: "1px solid rgba(99,102,241,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Swords size={16} style={{ color: "#818cf8" }} />
        </div>
        <div>
          <p
            style={{
              fontSize: 10,
              color: "#52525b",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Challenge Received
          </p>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "0.05em",
            }}
          >
            {challenge.from_name}
          </p>
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: timeLeft <= 10 ? "#f87171" : "#52525b",
            fontWeight: 700,
          }}
        >
          {timeLeft}s
        </div>
      </div>
      <p
        style={{
          fontSize: 10,
          color: "#52525b",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        Rating:{" "}
        <span style={{ color: "#e4e4e7" }}>{challenge.from_rating}</span>{" "}
        &nbsp;·&nbsp; Wants to duel you
      </p>
      <div
        style={{
          height: 2,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 1,
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "#6366f1",
            borderRadius: 1,
            transition: "width 1s linear",
            width: `${(timeLeft / 30) * 100}%`,
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onAccept}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            background: "linear-gradient(135deg,#6366f1,#4f46e5)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Check size={12} /> Accept
        </button>
        <button
          onClick={onDecline}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 10,
            cursor: "pointer",
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.2)",
            color: "#f87171",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <X size={12} /> Decline
        </button>
      </div>
    </div>
  );
}

interface WSContextType {
  send: (type: string, payload: object) => void;
  connected: boolean;
  onlineUsers: OnlineUser[];
  challenging: string | null;
  setChallenging: (val: string | null) => void;
  waitingFor: string | null;
  setWaitingFor: (val: string | null) => void;
}

const WSContext = createContext<WSContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { isLoaded, user } = useUser();
  const router = useRouter();

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [pendingChallenge, setPendingChallenge] =
    useState<ChallengePayload | null>(null);
  const [challenging, setChallenging] = useState<string | null>(null);
  const [waitingFor, setWaitingFor] = useState<string | null>(null);

  const [myNodeId, setMyNodeId] = useState<string | null>(null);
  const [myTier, setMyTier] = useState("Newbie");

  useEffect(() => {
    const uid = localStorage.getItem("elonode_db_id");
    if (uid && uid !== "null" && uid !== "undefined") {
      setTimeout(() => {
        setMyNodeId(uid);
      }, 0);

      fetch(`${process.env.NEXT_PUBLIC_API_URL}users/${uid}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.tier) setMyTier(data.tier);
        })
        .catch(console.error);
    }
  }, [isLoaded]);

  const handleOnlineUsers = useCallback(
    (users: OnlineUser[]) => setOnlineUsers(users),
    [],
  );
  const handleChallengeRecv = useCallback(
    (payload: ChallengePayload) => setPendingChallenge(payload),
    [],
  );

  const handleChallengeResp = useCallback(
    (payload: {
      contest_id: string;
      from_id: string;
      to_id: string;
      accepted: boolean;
    }) => {
      setChallenging(null);
      if (payload.accepted) {
        router.push(
          `/duel/${payload.contest_id}?opponent=${encodeURIComponent(payload.to_id)}&opponentId=${payload.to_id}`,
        );
      } else {
        alert("Opponent declined the challenge.");
        setWaitingFor(null);
      }
    },
    [router],
  );

  const { send, connected } = useWebSocket({
    userId: myNodeId || "",
    userName: user?.username || user?.firstName || "Unknown",
    tier: myTier,
    imageUrl: user?.imageUrl || "",
    enabled: !!myNodeId && isLoaded && myNodeId !== "null",
    handlers: {
      onOnlineUsers: handleOnlineUsers,
      onChallengeReceived: handleChallengeRecv,
      onChallengeResponse: handleChallengeResp,
    },
  });

  const handleAccept = useCallback(() => {
    if (!pendingChallenge) return;
    send("challenge_response", {
      contest_id: pendingChallenge.contest_id,
      from_id: pendingChallenge.from_id,
      to_id: myNodeId,
      accepted: true,
    });
    const contestId = pendingChallenge.contest_id;
    const opponentName = encodeURIComponent(pendingChallenge.from_name);
    const opponentId = pendingChallenge.from_id;
    setPendingChallenge(null);
    router.push(
      `/duel/${contestId}?opponent=${opponentName}&opponentId=${opponentId}`,
    );
  }, [pendingChallenge, myNodeId, router, send]);

  const handleDecline = useCallback(() => {
    if (!pendingChallenge) return;
    send("challenge_response", {
      contest_id: pendingChallenge.contest_id,
      from_id: pendingChallenge.from_id,
      to_id: myNodeId,
      accepted: false,
    });
    setPendingChallenge(null);
  }, [pendingChallenge, myNodeId, send]);

  return (
    <WSContext.Provider
      value={{
        send,
        connected,
        onlineUsers,
        challenging,
        setChallenging,
        waitingFor,
        setWaitingFor,
      }}
    >
      {pendingChallenge && (
        <ChallengeNotification
          challenge={pendingChallenge}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
      {children}
    </WSContext.Provider>
  );
}

export function useGlobalWS() {
  const context = useContext(WSContext);
  if (context === undefined) {
    throw new Error("useGlobalWS must be used within a WebSocketProvider");
  }
  return context;
}
