"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Copy, Check, Search, Loader2 } from "lucide-react";
import { Orbitron } from "next/font/google";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

const futuristicFont = Orbitron({
  subsets: ["latin"],
  weight: ["700"],
});

interface User {
  id: string;
  name: string;
  current_rating: number;
  contests_played: number;
  tier: string;
  rating_change?: number;
  globalRankIndex?: number;
}

export default function Leaderboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { userId, isLoaded } = useAuth();
  const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  const isAdmin = isLoaded && userId === ADMIN_USER_ID;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}users`);
        if (!response.ok) throw new Error("Failed to fetch leaderboard");

        const data = await response.json();

        const sortedUsers = data.sort(
          (a: User, b: User) => b.current_rating - a.current_rating,
        );
        setUsers(sortedUsers);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "newbie":
        return "text-zinc-500";
      case "apprentice":
        return "text-emerald-500";
      case "specialist":
        return "text-cyan-500";
      case "expert":
        return "text-indigo-500";
      case "master":
        return "text-amber-500";
      case "grandmaster":
        return "text-red-500";
      default:
        return "text-zinc-400";
    }
  };

  const filteredUsers = users
    .map((user, index) => ({
      ...user,
      globalRankIndex: index,
    }))
    .filter((user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  if (loading)
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 font-mono text-sm uppercase tracking-widest gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        Synchronizing Leaderboard Details
      </div>
    );

  if (error)
    return (
      <div className="text-center text-red-500 py-12 border border-red-900/50 bg-red-950/10 rounded-xl">
        {error}
      </div>
    );

  if (!loading && users.length === 0) {
    return (
      <div className="text-center p-12 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
        <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold">
          No active nodes detected.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto mt-8">
      <Link
        href={isAdmin ? "/admin" : "/"}
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-indigo-400 transition-colors text-xs font-mono uppercase tracking-widest mb-6 group"
      >
        <ArrowLeft
          size={14}
          className="group-hover:-translate-x-1 transition-transform"
        />
        {isAdmin ? "Return to Admin Panel" : "Return to Arena"}
      </Link>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-zinc-800 bg-zinc-900/20">
          <div className="flex items-center gap-4">
            <Trophy className="w-6 h-6 text-indigo-500" />
            <h2
              className={`${futuristicFont.className} text-xl text-white tracking-widest uppercase`}
            >
              Global <span className="text-zinc-600">Leaderboard</span>
            </h2>
          </div>

          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-zinc-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="QUERY NODE NAME..."
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-md py-2 pl-10 pr-4 focus:outline-none focus:border-zinc-500 transition-colors font-mono text-xs placeholder:text-zinc-600 uppercase tracking-widest"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 text-zinc-500 text-[10px] uppercase tracking-[0.2em]">
                <th className="py-4 pl-8 pr-4 font-bold">Rank</th>
                <th className="p-4 font-bold">Identification</th>
                <th className="p-4 font-bold text-center">Tier</th>
                <th className="p-4 font-bold text-right">Rating</th>
                <th className="p-4 font-bold text-right">Matches</th>
                <th className="p-4 font-bold">Node UUID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filteredUsers.map((user) => {
                const rank = user.globalRankIndex ?? 0;

                let rowClasses = "hover:bg-zinc-800/20 transition-all group";
                if (rank === 0)
                  rowClasses =
                    "bg-gradient-to-r from-amber-500/10 to-transparent hover:from-amber-500/20 transition-all group";
                else if (rank === 1)
                  rowClasses =
                    "bg-gradient-to-r from-zinc-300/10 to-transparent hover:from-zinc-300/20 transition-all group";
                else if (rank === 2)
                  rowClasses =
                    "bg-gradient-to-r from-amber-700/10 to-transparent hover:from-amber-700/20 transition-all group";

                return (
                  <tr key={user.id} className={rowClasses}>
                    <td className="py-4 pl-8 pr-4">
                      <div className="flex items-center font-mono text-sm text-zinc-400">
                        {rank === 0 && (
                          <Medal
                            size={18}
                            className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                          />
                        )}

                        {rank === 1 && (
                          <Medal
                            size={18}
                            className="text-zinc-300 drop-shadow-[0_0_8px_rgba(212,212,216,0.4)]"
                          />
                        )}

                        {rank === 2 && (
                          <Medal
                            size={18}
                            className="text-amber-700 drop-shadow-[0_0_8px_rgba(180,83,9,0.5)]"
                          />
                        )}

                        {rank > 2 && (
                          <span className="w-6 text-center text-xs font-bold text-zinc-600 tracking-widest">
                            {String(rank + 1).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 font-bold uppercase tracking-tight">
                      <Link
                        href={`/profile/${user.id}`}
                        className="text-zinc-100 hover:text-indigo-400 hover:underline decoration-indigo-500/50 underline-offset-4 transition-all cursor-pointer"
                      >
                        {user.name}
                      </Link>
                    </td>

                    <td className="p-4 text-center">
                      <span
                        className={`${getTierColor(user.tier)} text-[10px] font-black uppercase px-2 py-1 bg-zinc-900 rounded-sm border border-zinc-800/50`}
                      >
                        {user.tier}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-bold text-lg text-zinc-100 tracking-tighter">
                          {user.current_rating}
                        </span>

                        {user.rating_change !== undefined &&
                        user.rating_change !== 0 ? (
                          <span
                            className={`text-[10px] font-mono flex items-center gap-0.5 mt-0.5 ${
                              user.rating_change > 0
                                ? "text-emerald-500"
                                : "text-red-500"
                            }`}
                          >
                            {user.rating_change > 0 ? "▲" : "▼"}
                            {Math.abs(user.rating_change)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-700 mt-0.5">
                            --
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-right text-zinc-500 font-mono text-xs">
                      {user.contests_played}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-zinc-500">
                          {user.id.length > 12
                            ? `${user.id.slice(0, 8)}...${user.id.slice(-4)}`
                            : user.id}
                        </span>
                        <button
                          onClick={() => copyToClipboard(user.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-800 rounded-md transition-all text-zinc-500 hover:text-white"
                          title="Copy User ID"
                        >
                          {copiedId === user.id ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
