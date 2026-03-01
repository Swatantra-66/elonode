"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Trophy, Activity, Hash, ArrowLeft } from "lucide-react";

interface User {
  id: string;
  name: string;
  current_rating: number;
  max_rating: number;
  contests_played: number;
  tier: string;
}

interface RatingHistory {
  contest_id: string;
  contest_name: string;
  rank: number;
  rating_change: number;
  performance_rating: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: RatingHistory }[];
}

const getTierColor = (tier: string) => {
  const normalized = tier?.toLowerCase() || "";
  if (normalized.includes("newbie"))
    return "text-zinc-400 border-zinc-700 bg-zinc-900";
  if (normalized.includes("pupil"))
    return "text-emerald-400 border-emerald-900/50 bg-emerald-950/30";
  if (normalized.includes("specialist"))
    return "text-cyan-400 border-cyan-900/50 bg-cyan-950/30";
  if (normalized.includes("expert"))
    return "text-blue-400 border-blue-900/50 bg-blue-950/30";
  if (normalized.includes("master"))
    return "text-purple-400 border-purple-900/50 bg-purple-950/30";
  if (normalized.includes("grandmaster"))
    return "text-rose-500 border-rose-900/50 bg-rose-950/30";
  return "text-zinc-400 border-zinc-700 bg-zinc-900";
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isPositive = data.rating_change >= 0;

    return (
      <div className="bg-zinc-950 p-3 border border-zinc-800 rounded-md shadow-lg text-zinc-100 font-mono text-sm">
        <p className="font-semibold text-zinc-300 mb-2 border-b border-zinc-800 pb-2">
          {data.contest_name}
        </p>
        <div className="space-y-1">
          <p className="text-zinc-500">
            Rank: <span className="text-zinc-100">{data.rank}</span>
          </p>
          <p className="text-zinc-500">
            Change:{" "}
            <span className={isPositive ? "text-zinc-100" : "text-zinc-500"}>
              {isPositive ? "+" : ""}
              {data.rating_change}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function ProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<RatingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const userRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}users/${userId}`,
        );

        if (!userRes.ok) {
          if (userRes.status === 404) throw new Error("User not found");
          throw new Error("System communication error");
        }
        const userData = await userRes.json();

        const histRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}users/${userId}/history`,
        );

        if (!histRes.ok) throw new Error("Rating history unavailable");
        const histData = await histRes.json();

        setUser(userData);
        setHistory(Array.isArray(histData) ? histData : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-500 font-mono text-sm">
        Loading system data...
      </div>
    );
  if (error)
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-400 font-mono border border-zinc-800 px-4 py-2 rounded-md">
          ERR: {error}
        </p>
      </div>
    );
  if (!user) return null;

  const chartData = [...history].reverse().map((h, index) => ({
    ...h,
    rating: index === 0 ? 1200 + h.rating_change : 1200 + h.rating_change,
    index: index + 1,
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-700">
      <nav className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Link>
          <div className="flex items-center gap-3">
            <div
              className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono font-bold border rounded-sm ${getTierColor(user.tier)}`}
            >
              {user.tier || "Unranked"}
            </div>
            <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-mono font-bold text-zinc-300">
              {user.name.charAt(0)}
            </div>
            <span className="font-medium text-sm tracking-tight text-zinc-300">
              {user.name}
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="border-b border-zinc-800/60 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            System Profile
          </h1>
          <p className="text-zinc-500 text-sm mt-2 font-mono">
            UUID: {user.id}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md">
            <div className="flex justify-between items-start">
              <span className="text-zinc-400 text-xs uppercase tracking-widest font-semibold">
                Current Rating
              </span>
              <Activity className="text-zinc-600 w-4 h-4" />
            </div>
            <span className="mt-3 block text-3xl font-mono text-white">
              {user.current_rating}
            </span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md">
            <div className="flex justify-between items-start">
              <span className="text-zinc-400 text-xs uppercase tracking-widest font-semibold">
                Max Rating
              </span>
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-amber-500">
                <Trophy className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-widest font-mono font-bold">
                  All-Time High
                </span>
              </div>
            </div>
            <span className="mt-3 block text-3xl font-mono text-white">
              {user.max_rating}
            </span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md">
            <div className="flex justify-between items-start">
              <span className="text-zinc-400 text-xs uppercase tracking-widest font-semibold">
                Total Contests
              </span>
              <Hash className="text-zinc-600 w-4 h-4" />
            </div>
            <span className="mt-3 block text-3xl font-mono text-white">
              {user.contests_played}
            </span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md">
          <h3 className="text-zinc-400 text-xs uppercase tracking-widest font-semibold mb-6">
            Rating Trajectory
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#27272a"
                />
                <XAxis dataKey="index" hide />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{
                    stroke: "#52525b",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke="#e4e4e7"
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: "#18181b",
                    strokeWidth: 2,
                    stroke: "#e4e4e7",
                  }}
                  activeDot={{ r: 5, fill: "#ffffff", strokeWidth: 0 }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
