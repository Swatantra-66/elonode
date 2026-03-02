"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Copy, Check } from "lucide-react";
import { Orbitron } from "next/font/google";

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
}

export default function Leaderboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  if (loading)
    return (
      <div className="text-center text-zinc-500 py-12 animate-pulse">
        Synchronizing Data...
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
    <div className="w-full max-w-5xl mx-auto mt-8 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="flex items-center gap-4 p-6 border-b border-zinc-800 bg-zinc-900/20">
        <Trophy className="w-6 h-6 text-zinc-100" />
        <h2
          className={`${futuristicFont.className} text-xl text-white tracking-widest uppercase`}
        >
          Global <span className="text-zinc-600">Leaderboard</span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-900/50 text-zinc-500 text-[10px] uppercase tracking-[0.2em]">
              <th className="p-4 font-bold">Rank</th>
              <th className="p-4 font-bold">Identification</th>
              <th className="p-4 font-bold text-center">Tier</th>
              <th className="p-4 font-bold text-right">Rating</th>
              <th className="p-4 font-bold text-right">Matches</th>
              <th className="p-4 font-bold">Node UUID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {users.map((user, index) => (
              <tr
                key={user.id}
                className="hover:bg-zinc-800/20 transition-all group"
              >
                <td className="p-4 flex items-center gap-2 font-mono text-sm text-zinc-400">
                  {index === 0 && (
                    <Medal size={18} className="text-amber-400" />
                  )}
                  {index === 1 && <Medal size={18} className="text-zinc-300" />}
                  {index === 2 && (
                    <Medal size={18} className="text-amber-700" />
                  )}
                  {index > 2 && (
                    <span className="w-5 text-center text-xs">{index + 1}</span>
                  )}
                </td>

                <td className="p-4 font-bold text-zinc-100 uppercase tracking-tight">
                  {user.name}
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
                    <span className="font-mono font-bold text-zinc-100 tracking-tighter">
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
                    <span className="font-mono text-[9px] text-zinc-600 truncate max-w-[80px]">
                      {user.id}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
