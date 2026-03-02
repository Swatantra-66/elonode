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

import { Orbitron } from "next/font/google";

const futuristicFont = Orbitron({
  subsets: ["latin"],
  weight: ["700"],
});

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
  rating?: number;
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
            Current: <span className="text-zinc-100">{data.rating}</span>
          </p>
          <p className="text-zinc-500">
            Change:{" "}
            <span className={isPositive ? "text-green-400" : "text-red-400"}>
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

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const userRes = await fetch(`${API_URL}users/${userId}`);
        if (!userRes.ok) {
          if (userRes.status === 404)
            throw new Error("User UUID not found in system");
          throw new Error("Backend connection failed");
        }
        const userData = await userRes.json();

        const histRes = await fetch(`${API_URL}users/${userId}/history`);
        if (!histRes.ok) throw new Error("History synchronization failed");
        const histData = await histRes.json();

        setUser(userData);
        setHistory(Array.isArray(histData) ? histData : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Critical system failure",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, API_URL]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-500 font-mono text-sm">
        Fetching encrypted profile data...
      </div>
    );

  if (error)
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-center space-y-4">
          <p className="text-red-400 font-mono border border-red-900/50 px-4 py-2 rounded-md bg-red-950/20">
            ERR: {error}
          </p>
          <Link
            href="/"
            className="text-zinc-500 text-xs hover:text-zinc-300 underline underline-offset-4"
          >
            Return to Terminal
          </Link>
        </div>
      </div>
    );

  if (!user) return null;

  let runningRating = 1200;
  const chartData = [...history].reverse().map((h, index) => {
    runningRating += h.rating_change;
    return {
      ...h,
      rating: runningRating,
      index: index + 1,
    };
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-700">
      <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/leaderboard"
            className="flex items-center gap-2 w-fit text-zinc-500 hover:text-indigo-400 transition-all text-xs font-mono font-bold uppercase tracking-[0.2em] my-8 group"
          >
            <ArrowLeft
              size={14}
              className="group-hover:-translate-x-1 transition-transform"
            />
            Return to Directory
          </Link>
          <div className="flex items-center gap-3">
            <div
              className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono font-bold border rounded-sm ${getTierColor(user.tier)}`}
            >
              {user.tier || "Unranked"}
            </div>
            <span className="font-medium text-sm tracking-tight text-zinc-300">
              {user.name}
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="border-b border-zinc-800/60 pb-8">
          <h1
            className={`${futuristicFont.className} text-3xl text-white tracking-widest uppercase`}
          >
            Node<span className="text-zinc-600"> Profile</span>
          </h1>
          <p className="text-zinc-500 text-[10px] mt-3 font-mono uppercase tracking-[0.3em]">
            Internal ID <span className="text-zinc-400 ml-2">{user.id}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-md hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                Rating
              </span>
              <Activity className="text-zinc-700 w-4 h-4" />
            </div>
            <span className="mt-3 block text-3xl font-mono text-white">
              {user.current_rating}
            </span>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-md hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                Peak
              </span>
              <Trophy className="text-amber-500/50 w-4 h-4" />
            </div>
            <span className="mt-3 block text-3xl font-mono text-white">
              {user.max_rating}
            </span>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-md hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                Played
              </span>
              <Hash className="text-zinc-700 w-4 h-4" />
            </div>
            <span className="mt-3 block text-3xl font-mono text-white">
              {user.contests_played}
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-md">
          <h3 className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-8">
            Performance Trajectory
          </h3>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#18181b"
                />
                <XAxis dataKey="index" hide />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "#27272a", strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke="#71717a"
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: "#09090b",
                    strokeWidth: 2,
                    stroke: "#a1a1aa",
                  }}
                  activeDot={{ r: 4, fill: "#ffffff", strokeWidth: 0 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
