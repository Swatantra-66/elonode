"use client";

import Link from "next/link";
import { Orbitron } from "next/font/google";
import { Swords, Trophy, Activity } from "lucide-react";

const futuristicFont = Orbitron({
  subsets: ["latin"],
  weight: ["700", "900"],
});

export default function PlayerArena() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full space-y-12 text-center">
        <div className="space-y-4">
          <h1
            className={`text-4xl md:text-6xl text-white tracking-wider uppercase whitespace-nowrap ${futuristicFont.className}`}
          >
            ELO<span className="text-zinc-600">NODE</span>
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto font-mono tracking-wide">
            WELCOME TO THE ELONODE ARENA. CHOOSE YOUR NEXT MOVE.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <button className="flex flex-col items-center justify-center p-8 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-indigo-500/50 transition-all group cursor-pointer">
            <Swords className="w-12 h-12 text-zinc-500 group-hover:text-indigo-400 mb-4 transition-colors" />
            <h2 className="text-lg font-bold font-mono uppercase tracking-widest text-zinc-100 mb-2">
              Challenge
            </h2>
            <p className="text-xs text-zinc-500 font-mono text-center">
              Initiate a 1v1 rated match against another node.
            </p>
          </button>

          <Link
            href="/leaderboard"
            className="flex flex-col items-center justify-center p-8 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-amber-500/50 transition-all group cursor-pointer"
          >
            <Trophy className="w-12 h-12 text-zinc-500 group-hover:text-amber-400 mb-4 transition-colors" />
            <h2 className="text-lg font-bold font-mono uppercase tracking-widest text-zinc-100 mb-2">
              Rankings
            </h2>
            <p className="text-xs text-zinc-500 font-mono text-center">
              View the global Elo distribution and top tiers.
            </p>
          </Link>

          <button className="flex flex-col items-center justify-center p-8 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-cyan-500/50 transition-all group cursor-pointer">
            <Activity className="w-12 h-12 text-zinc-500 group-hover:text-cyan-400 mb-4 transition-colors" />
            <h2 className="text-lg font-bold font-mono uppercase tracking-widest text-zinc-100 mb-2">
              My Stats
            </h2>
            <p className="text-xs text-zinc-500 font-mono text-center">
              Analyze your performance trajectory and match history.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
