"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Search,
  Swords,
  Loader2,
  ArrowLeft,
  Target,
  ShieldAlert,
  Zap,
  Trophy,
  Star,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { Orbitron } from "next/font/google";
import Link from "next/link";
import { useGlobalWS } from "@/components/WebSocketProvider";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["700", "900"] });
const API = process.env.NEXT_PUBLIC_API_URL || "";

interface NodeUser {
  id: string;
  name: string;
  image_url?: string;
  current_rating: number;
  contests_played: number;
  tier: string;
}

const TIER_CONFIG: Record<string, { color: string; glow: string; bg: string }> =
  {
    newbie: {
      color: "#71717a",
      glow: "rgba(113,113,122,0.2)",
      bg: "rgba(113,113,122,0.08)",
    },
    apprentice: {
      color: "#34d399",
      glow: "rgba(52,211,153,0.2)",
      bg: "rgba(52,211,153,0.08)",
    },
    specialist: {
      color: "#22d3ee",
      glow: "rgba(34,211,238,0.2)",
      bg: "rgba(34,211,238,0.08)",
    },
    expert: {
      color: "#818cf8",
      glow: "rgba(129,140,248,0.25)",
      bg: "rgba(129,140,248,0.08)",
    },
    master: {
      color: "#fbbf24",
      glow: "rgba(251,191,36,0.25)",
      bg: "rgba(251,191,36,0.08)",
    },
    grandmaster: {
      color: "#f87171",
      glow: "rgba(248,113,113,0.35)",
      bg: "rgba(248,113,113,0.08)",
    },
  };
const getTier = (tier: string) =>
  TIER_CONFIG[tier.toLowerCase()] || TIER_CONFIG["newbie"];

const DIFF_COLORS: Record<string, string> = {
  Easy: "#4ade80",
  Medium: "#fbbf24",
  Hard: "#f87171",
};

function RatingBar({ rating }: { rating: number }) {
  const pct = Math.min(100, (rating / 1800) * 100);
  const color =
    rating >= 1800
      ? "#f87171"
      : rating >= 1400
        ? "#fbbf24"
        : rating >= 1200
          ? "#818cf8"
          : rating >= 1100
            ? "#22d3ee"
            : "#71717a";
  return (
    <div
      style={{
        height: 2,
        background: "rgba(255,255,255,0.05)",
        borderRadius: 1,
        marginTop: 6,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 1,
          transition: "width 0.8s ease",
        }}
      />
    </div>
  );
}

export default function ArenaPage() {
  const { isLoaded, user } = useUser();
  const [allUsers, setAllUsers] = useState<NodeUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [myNodeId, setMyNodeId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">(
    "Easy",
  );
  const [mode, setMode] = useState<"same" | "random">("same");

  const {
    send,
    connected,
    onlineUsers,
    challenging,
    setChallenging,
    waitingFor,
    setWaitingFor,
  } = useGlobalWS();

  useEffect(() => {
    const uid = localStorage.getItem("elonode_db_id");
    setMyNodeId(uid);
    fetch(`${API}users`)
      .then((r) => r.json())
      .then((data) =>
        setAllUsers(
          data.sort(
            (a: NodeUser, b: NodeUser) => b.current_rating - a.current_rating,
          ),
        ),
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChallenge = async (opponent: NodeUser) => {
    const isOnline = onlineUsers.some((u) => u.user_id === opponent.id);
    if (!isOnline) {
      alert(`${opponent.name} is currently offline.`);
      return;
    }
    setChallenging(opponent.id);
    try {
      const myNode = allUsers.find((u) => u.id === myNodeId);
      const myName = myNode?.name || user?.username || "Unknown";
      const res = await fetch(`${API}contests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `1v1: ${myName} vs ${opponent.name}`,
          total_participants: 2,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const contestId = data.id || data.ID;

      send("challenge", {
        to_id: opponent.id,
        contest_id: contestId,
        difficulty,
        mode,
      });
      setWaitingFor(contestId);
    } catch {
      alert("Failed to create challenge.");
      setChallenging(null);
    }
  };

  const onlineIds = new Set(onlineUsers.map((u) => u.user_id));
  const opponents = allUsers
    .filter(
      (u) =>
        u.id !== myNodeId &&
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      const aOnline = onlineIds.has(a.id) ? 1 : 0;
      const bOnline = onlineIds.has(b.id) ? 1 : 0;
      return bOnline - aOnline || b.current_rating - a.current_rating;
    });

  if (!isLoaded || loading)
    return (
      <div
        className="min-h-screen relative"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "ui-monospace,monospace",
        }}
      >
        <Loader2
          style={{
            width: 28,
            height: 28,
            color: "#6366f1",
            animation: "spin 1s linear infinite",
          }}
        />
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.3em",
            color: "#3f3f46",
            textTransform: "uppercase",
          }}
        >
          Scanning grid...
        </span>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  return (
    <div
      className="min-h-screen relative p-6"
      style={{
        fontFamily: "ui-monospace,monospace",
        color: "#e4e4e7",
      }}
    >
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cardIn{from{opacity:0;transform:translateY(24px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .node-card{transition:all 0.25s ease}
        .node-card:hover{transform:translateY(-3px)}
        .challenge-btn{transition:all 0.2s ease}
      `}</style>

      {waitingFor && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999,
            background: "#0f1015",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 12,
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          <Loader2
            size={14}
            style={{ color: "#6366f1", animation: "spin 1s linear infinite" }}
          />
          <span
            style={{
              fontSize: 10,
              color: "#818cf8",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Waiting for opponent to accept...
          </span>
          <button
            onClick={() => {
              setWaitingFor(null);
              setChallenging(null);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#52525b",
              padding: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="w-full max-w-5xl mx-auto mt-2">
        <div style={{ animation: "fadeUp 0.5s ease-out", marginBottom: 24 }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#52525b",
              textDecoration: "none",
              fontSize: 10,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#818cf8")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
          >
            <ArrowLeft size={12} /> Return to Hub
          </Link>
        </div>

        <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="flex flex-wrap items-center gap-4 p-6 border-b border-zinc-800 bg-zinc-900/20">
            <Swords className="w-6 h-6 text-indigo-500" />
            <h2
              className={`${orbitron.className} text-xl text-white tracking-widest uppercase m-0`}
            >
              MATCH<span className="text-zinc-600">MAKING</span>
            </h2>

            <div
              className="ml-2"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                borderRadius: 20,
                background: connected
                  ? "rgba(74,222,128,0.08)"
                  : "rgba(248,113,113,0.08)",
                border: `1px solid ${connected ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
              }}
            >
              {connected ? (
                <Wifi size={10} style={{ color: "#4ade80" }} />
              ) : (
                <WifiOff size={10} style={{ color: "#f87171" }} />
              )}
              <span
                style={{
                  fontSize: 8,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: connected ? "#4ade80" : "#f87171",
                }}
              >
                {connected ? "Live" : "Offline"}
              </span>
            </div>

            <div className="ml-auto relative">
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#52525b",
                }}
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Target specific node..."
                style={{
                  background: "rgba(0, 0, 0, 0.4)", // Darkened
                  border: "1px solid rgba(255,255,255,0.04)",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)", // Added depth
                  borderRadius: 10,
                  padding: "10px 14px 10px 36px",
                  color: "#e4e4e7",
                  fontFamily: "ui-monospace,monospace",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  width: 240,
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)")
                }
              />
            </div>
          </div>

          <div className="p-6">
            <div
              style={{
                display: "flex",
                gap: 24,
                marginBottom: 24,
                flexWrap: "wrap",
                animation: "fadeUp 0.5s ease-out 0.05s both",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: "#52525b",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}
                >
                  Difficulty:
                </span>
                {(["Easy", "Medium", "Hard"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 8,
                      border: `1px solid ${difficulty === d ? DIFF_COLORS[d] + "60" : "rgba(255,255,255,0.04)"}`,
                      background:
                        difficulty === d
                          ? DIFF_COLORS[d] + "15"
                          : "rgba(0, 0, 0, 0.4)", // Darkened unselected
                      boxShadow:
                        difficulty === d
                          ? "none"
                          : "inset 0 2px 4px rgba(0,0,0,0.2)",
                      color: difficulty === d ? DIFF_COLORS[d] : "#52525b",
                      fontFamily: "ui-monospace,monospace",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <div
                style={{
                  width: 1,
                  background: "rgba(255,255,255,0.05)",
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: "#52525b",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}
                >
                  Problem:
                </span>
                {(["same", "random"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 8,
                      border: `1px solid ${mode === m ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.04)"}`,
                      background:
                        mode === m
                          ? "rgba(99,102,241,0.15)"
                          : "rgba(0, 0, 0, 0.4)", // Darkened unselected
                      boxShadow:
                        mode === m ? "none" : "inset 0 2px 4px rgba(0,0,0,0.2)",
                      color: mode === m ? "#818cf8" : "#52525b",
                      fontFamily: "ui-monospace,monospace",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {m === "same" ? "⚔ Same" : "🎲 Random"}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 32,
                animation: "fadeUp 0.5s ease-out 0.1s both",
              }}
            >
              {[
                {
                  icon: <Target size={12} />,
                  label: "Online Now",
                  value: onlineUsers.length,
                  color: "#4ade80",
                },
                {
                  icon: <Trophy size={12} />,
                  label: "Total Nodes",
                  value: allUsers.length,
                  color: "#fbbf24",
                },
                {
                  icon: <Star size={12} />,
                  label: "Top Rating",
                  value: allUsers[0]?.current_rating || 0,
                  color: "#818cf8",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    background: "rgba(0, 0, 0, 0.4)", // Darkened stats blocks
                    border: "1px solid rgba(255,255,255,0.04)",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)", // Added depth
                    borderRadius: 8,
                    fontSize: 10,
                  }}
                >
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                  <span
                    style={{
                      color: "#52525b",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {stat.label}:
                  </span>
                  <span style={{ color: "#e4e4e7", fontWeight: 700 }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>

            {opponents.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "80px 0",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <ShieldAlert size={32} style={{ color: "#27272a" }} />
                <p
                  style={{
                    fontSize: 11,
                    color: "#3f3f46",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}
                >
                  No nodes found
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: 16,
                }}
              >
                {opponents.map((opponent, i) => {
                  const tier = getTier(opponent.tier);
                  const isOnline = onlineIds.has(opponent.id);
                  const isChallenging = challenging === opponent.id;
                  return (
                    <div
                      key={opponent.id}
                      className="node-card"
                      style={{
                        background: "rgba(0, 0, 0, 0.4)", // Darkened the cards
                        boxShadow: "inset 0 2px 10px rgba(0,0,0,0.3)", // Added inner depth
                        border: `1px solid ${isOnline ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.04)"}`,
                        borderRadius: 16,
                        padding: 20,
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        animation: `cardIn 0.4s ease-out ${i * 0.06}s both`,
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor =
                          isOnline ? "rgba(74,222,128,0.3)" : `${tier.color}40`;
                        (e.currentTarget as HTMLDivElement).style.boxShadow =
                          `0 8px 32px ${tier.glow}, inset 0 2px 10px rgba(0,0,0,0.3)`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor =
                          isOnline
                            ? "rgba(74,222,128,0.15)"
                            : "rgba(255,255,255,0.04)";
                        (e.currentTarget as HTMLDivElement).style.boxShadow =
                          "inset 0 2px 10px rgba(0,0,0,0.3)";
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          width: 60,
                          height: 60,
                          background: `radial-gradient(circle at top right, ${tier.color}10, transparent 70%)`,
                          pointerEvents: "none",
                        }}
                      />

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              overflow: "hidden",
                              border: `1.5px solid ${tier.color}40`,
                              background: tier.bg,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 14,
                              fontWeight: 900,
                              color: tier.color,
                            }}
                          >
                            {opponent.image_url ? (
                              <img
                                src={opponent.image_url}
                                alt={opponent.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              opponent.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                color: "#fff",
                                textTransform: "uppercase",
                              }}
                            >
                              {opponent.name}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginTop: 3,
                              }}
                            >
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  background: tier.bg,
                                  border: `1px solid ${tier.color}30`,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 8,
                                    fontWeight: 900,
                                    letterSpacing: "0.15em",
                                    color: tier.color,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {opponent.tier}
                                </span>
                              </div>
                              {isOnline && (
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    background: "rgba(74,222,128,0.1)",
                                    border: "1px solid rgba(74,222,128,0.2)",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 4,
                                      height: 4,
                                      borderRadius: "50%",
                                      background: "#4ade80",
                                      animation: "pulse 2s ease infinite",
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontSize: 8,
                                      color: "#4ade80",
                                      letterSpacing: "0.15em",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    Online
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div
                            className={orbitron.className}
                            style={{
                              fontSize: 24,
                              fontWeight: 900,
                              color: "#fff",
                              lineHeight: 1,
                            }}
                          >
                            {opponent.current_rating}
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              color: "#52525b",
                              letterSpacing: "0.1em",
                              marginTop: 3,
                            }}
                          >
                            {opponent.contests_played} MATCHES
                          </div>
                          <RatingBar rating={opponent.current_rating} />
                        </div>
                      </div>

                      <button
                        className="challenge-btn"
                        onClick={() => handleChallenge(opponent)}
                        disabled={!!challenging || !isOnline}
                        style={{
                          width: "100%",
                          padding: 11,
                          borderRadius: 10,
                          border: "none",
                          cursor:
                            isOnline && !challenging
                              ? "pointer"
                              : "not-allowed",
                          background: !isOnline
                            ? "rgba(255,255,255,0.03)"
                            : isChallenging
                              ? "rgba(99,102,241,0.3)"
                              : "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.08))",
                          color: !isOnline
                            ? "#52525b"
                            : isChallenging
                              ? "#818cf8"
                              : "#a5b4fc",
                          fontFamily: "ui-monospace,monospace",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          borderTop: `1px solid ${isOnline ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.02)"}`,
                          opacity: challenging && !isChallenging ? 0.4 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (isOnline && !challenging) {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background =
                              "linear-gradient(135deg,#6366f1,#4f46e5)";
                            (e.currentTarget as HTMLButtonElement).style.color =
                              "#fff";
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.boxShadow =
                              "0 4px 20px rgba(99,102,241,0.4)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isOnline && !challenging) {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background =
                              "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.08))";
                            (e.currentTarget as HTMLButtonElement).style.color =
                              "#a5b4fc";
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.boxShadow = "none";
                          }
                        }}
                      >
                        {isChallenging ? (
                          <>
                            <Loader2
                              size={12}
                              style={{ animation: "spin 1s linear infinite" }}
                            />{" "}
                            Waiting for response...
                          </>
                        ) : !isOnline ? (
                          "Offline"
                        ) : (
                          <>
                            <Zap size={12} /> Issue Challenge
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
