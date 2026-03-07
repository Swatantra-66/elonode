"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Search,
  Swords,
  Loader2,
  ArrowLeft,
  Target,
  ShieldAlert,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Orbitron } from "next/font/google";
import Link from "next/link";

const futuristicFont = Orbitron({
  subsets: ["latin"],
  weight: ["700", "900"],
});

interface NodeUser {
  id: string;
  name: string;
  image_url?: string;
  current_rating: number;
  contests_played: number;
  tier: string;
}

export default function ArenaPage() {
  const { isLoaded, user } = useUser();
  const [users, setUsers] = useState<NodeUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [myNodeId, setMyNodeId] = useState<string | null>(null);

  const [activeMatch, setActiveMatch] = useState<{
    contestId: string;
    opponent: NodeUser;
  } | null>(null);
  const [matchStatus, setMatchStatus] = useState<
    "idle" | "creating" | "reporting" | "finished"
  >("idle");

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const localId = localStorage.getItem("elonode_db_id");
    setMyNodeId(localId);

    const fetchOpponents = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}users`);
        if (!response.ok) throw new Error("Failed to fetch grid nodes");

        const data = await response.json();

        const sortedUsers = data.sort(
          (a: NodeUser, b: NodeUser) => b.current_rating - a.current_rating,
        );
        console.log("DATABASE USERS:", sortedUsers);

        setUsers(sortedUsers);
      } catch (error) {
        console.error("Error connecting to matchmaking grid:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOpponents();
  }, [API_BASE_URL]);

  const handleChallenge = async (opponent: NodeUser) => {
    setMatchStatus("creating");

    try {
      const myNode = users.find((u) => u.id === myNodeId);
      const myName = myNode
        ? myNode.name
        : user?.username || user?.firstName || "Unknown_Node";
      const matchTitle = `1v1: ${myName} vs ${opponent.name}`;

      const res = await fetch(`${API_BASE_URL}contests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: matchTitle,
          total_participants: 2,
        }),
      });

      if (!res.ok) throw new Error("Failed to create match");
      const data = await res.json();

      setActiveMatch({ contestId: data.id || data.ID, opponent });
      setMatchStatus("idle");
    } catch (error) {
      console.error(error);
      setMatchStatus("idle");
      alert("Grid Interference: Failed to initialize match protocol.");
    }
  };

  const handleReportScore = async (iWon: boolean) => {
    if (!activeMatch || !myNodeId) return;
    setMatchStatus("reporting");

    const winnerId = iWon ? myNodeId : activeMatch.opponent.id;
    const loserId = iWon ? activeMatch.opponent.id : myNodeId;

    const payload = [
      { user_id: winnerId, rank: 1 },
      { user_id: loserId, rank: 2 },
    ];

    try {
      const res = await fetch(
        `${API_BASE_URL}contests/${activeMatch.contestId}/finalize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error("Failed to finalize match");

      setMatchStatus("finished");

      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error(error);
      setMatchStatus("idle");
      alert("Error transmitting results to central database.");
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "newbie":
        return "text-zinc-500 border-zinc-500/30";
      case "apprentice":
        return "text-emerald-500 border-emerald-500/30";
      case "specialist":
        return "text-cyan-500 border-cyan-500/30";
      case "expert":
        return "text-indigo-500 border-indigo-500/30";
      case "master":
        return "text-amber-500 border-amber-500/30";
      case "grandmaster":
        return "text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
      default:
        return "text-zinc-400 border-zinc-800";
    }
  };

  const availableOpponents = users.filter(
    (u) =>
      u.id !== myNodeId &&
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 font-mono text-sm uppercase tracking-widest gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        Scanning Grid for Active Nodes...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 font-sans selection:bg-indigo-500/30">
      <div className="max-w-5xl mx-auto space-y-8 mt-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-zinc-800/60 pb-6">
          <div className="space-y-4">
            {activeMatch ? (
              <button
                onClick={() => {
                  setActiveMatch(null);
                  setMatchStatus("idle");
                }}
                className="inline-flex items-center gap-2 text-zinc-500 hover:text-indigo-400 transition-colors text-xs font-mono uppercase tracking-widest group cursor-pointer bg-transparent border-none p-0"
              >
                <ArrowLeft
                  size={14}
                  className="group-hover:-translate-x-1 transition-transform"
                />
                Return to Arena
              </button>
            ) : (
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-zinc-500 hover:text-indigo-400 transition-colors text-xs font-mono uppercase tracking-widest group"
              >
                <ArrowLeft
                  size={14}
                  className="group-hover:-translate-x-1 transition-transform"
                />
                Return to Hub
              </Link>
            )}

            <h1
              className={`text-4xl text-white tracking-widest uppercase flex items-center gap-4 ${futuristicFont.className}`}
            >
              <Swords className="text-indigo-500 w-8 h-8" />
              MATCH<span className="text-zinc-600">MAKING</span>
            </h1>
          </div>

          {!activeMatch && (
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="TARGET SPECIFIC NODE..."
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-md py-2.5 pl-10 pr-4 focus:outline-none focus:border-indigo-500/50 transition-all font-mono text-xs uppercase tracking-widest placeholder:text-zinc-600"
              />
            </div>
          )}
        </div>

        {activeMatch ? (
          <div className="bg-zinc-900/40 border border-indigo-500/50 rounded-xl p-8 sm:p-12 shadow-[0_0_30px_rgba(79,70,229,0.1)] flex flex-col items-center text-center animate-in zoom-in-95 fade-in duration-300">
            <h2 className="text-sm font-bold text-indigo-400 font-mono uppercase tracking-widest mb-12 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Live Contest
            </h2>

            <div className="flex items-center justify-center gap-4 sm:gap-12 w-full max-w-2xl mb-12">
              <div className="flex-1 flex flex-col items-center gap-3">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg bg-zinc-800 border-2 border-zinc-600 overflow-hidden shadow-lg">
                  <img
                    src={user?.imageUrl}
                    alt="Your Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-bold text-white uppercase tracking-wider text-xs sm:text-base">
                  {user?.username || user?.firstName || "Unknown Node"}
                </span>
              </div>

              <div className="flex-shrink-0">
                <Swords className="w-8 h-8 sm:w-12 sm:h-12 text-zinc-600 animate-pulse" />
              </div>

              {/* OPPONENT PROFILE */}
              <div className="flex-1 flex flex-col items-center gap-3">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg bg-zinc-800 border-2 border-red-500/50 overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <img
                    src={
                      activeMatch.opponent.image_url ||
                      `https://ui-avatars.com/api/?name=${activeMatch.opponent.name}&background=27272a&color=ef4444&size=128&bold=true`
                    }
                    alt={`${activeMatch.opponent.name}'s Profile`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-bold text-white uppercase tracking-wider text-xs sm:text-base">
                  {activeMatch.opponent.name}
                </span>
              </div>
            </div>

            {matchStatus === "reporting" ? (
              <div className="flex items-center gap-3 text-indigo-400 font-mono text-xs sm:text-sm uppercase tracking-widest h-16">
                <Loader2 className="w-5 h-5 animate-spin" />
                Transmitting Result to Database...
              </div>
            ) : matchStatus === "finished" ? (
              <div className="flex flex-col items-center gap-2 text-emerald-400 font-mono text-xs sm:text-sm uppercase tracking-widest h-16">
                <CheckCircle className="w-8 h-8 mb-1" />
                Match Finalized! Ratings Recalculated.
                <span className="text-zinc-500 text-[10px] mt-1">
                  Refreshing grid...
                </span>
              </div>
            ) : (
              <div className="w-full max-w-md space-y-4">
                <p className="text-[10px] sm:text-xs text-zinc-500 font-mono uppercase tracking-widest mb-4">
                  Report Match Outcome
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleReportScore(true)}
                    className="flex items-center justify-center gap-2 py-4 sm:py-5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 hover:border-emerald-500 rounded-lg font-bold uppercase tracking-widest transition-all active:scale-95 text-xs sm:text-sm cursor-pointer"
                  >
                    <CheckCircle size={18} /> I Won
                  </button>
                  <button
                    onClick={() => handleReportScore(false)}
                    className="flex items-center justify-center gap-2 py-4 sm:py-5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 hover:border-red-500 rounded-lg font-bold uppercase tracking-widest transition-all active:scale-95 text-xs sm:text-sm cursor-pointer"
                  >
                    <XCircle size={18} /> I Lost
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest mb-6">
              <Target size={14} className="text-emerald-500" />
              <span>{availableOpponents.length} Targets Acquired</span>
            </div>

            {availableOpponents.length === 0 ? (
              <div className="text-center p-12 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-zinc-600" />
                <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold">
                  No active targets match your parameters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableOpponents.map((opponent) => (
                  <div
                    key={opponent.id}
                    className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5 hover:bg-zinc-800/60 hover:border-indigo-500/30 transition-all group flex flex-col justify-between h-full"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-lg font-bold uppercase tracking-wider text-zinc-100 group-hover:text-indigo-400 transition-colors">
                          {opponent.name}
                        </h3>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 border rounded-sm text-[9px] font-black uppercase tracking-widest ${getTierColor(opponent.tier)} bg-zinc-950`}
                        >
                          {opponent.tier}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-mono font-bold text-white tracking-tighter">
                          {opponent.current_rating}
                        </div>
                        <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mt-1">
                          Matches: {opponent.contests_played}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleChallenge(opponent)}
                      disabled={matchStatus === "creating"}
                      className="cursor-pointer w-full py-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md text-xs font-mono font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {matchStatus === "creating" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : null}
                      Issue Challenge
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
