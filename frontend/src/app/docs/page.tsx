"use client";

import React from "react";
import {
  BookOpen,
  Calculator,
  Database,
  Activity,
  Terminal,
} from "lucide-react";
import { Orbitron } from "next/font/google";

const futuristicFont = Orbitron({
  subsets: ["latin"],
  weight: ["700"],
});

export default function DocsPage() {
  return (
    <div className="min-h-screen text-zinc-50 font-sans selection:bg-zinc-700 pb-20">
      <header className="border-b border-zinc-800 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
          <BookOpen className="text-indigo-500 w-5 h-5" />
          <h1
            className={`${futuristicFont.className} text-lg text-white tracking-widest uppercase`}
          >
            System <span className="text-zinc-600">Documentation</span>
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        <section className="space-y-4">
          <h2 className="text-sm font-mono text-indigo-400 uppercase tracking-widest border-b border-zinc-800 pb-2">
            01. Core Rating Philosophy
          </h2>

          <p className="text-zinc-400 text-sm leading-relaxed max-w-3xl">
            The ELONODE rating engine is built on a transparent percentile
            model. The system calculates how many participants a user has
            outperformed to determine their percentile bracket. Each bracket is
            assigned a predefined standard performance rating, which is then
            used to update the users standing via a controlled algorithmic
            adjustment.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-sm font-mono text-indigo-400 uppercase tracking-widest border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Calculator size={14} /> Step-By-Step Logic
            </h2>

            <div className="bg-zinc-950 border border-zinc-800 rounded-md p-5 font-mono text-xs text-zinc-300 space-y-3 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">
              <p>
                <span className="text-zinc-500">1.</span> Beaten = Total
                Participants - Rank
              </p>
              <p>
                <span className="text-zinc-500">2.</span> Percentile = Beaten /
                Total Participants
              </p>
              <p>
                <span className="text-zinc-500">3.</span> Identify Percentile
                Bracket Target
              </p>
              <p>
                <span className="text-zinc-500">4.</span> Assign Standard
                Performance Rating
              </p>
              <p>
                <span className="text-zinc-500">5.</span> Rating Change =
                (Performance Rating - Actual Rating) / 2
              </p>
              <p>
                <span className="text-zinc-500">6.</span> New Rating = Old
                Rating + Rating Change
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-mono text-indigo-400 uppercase tracking-widest border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Activity size={14} /> Execution Example
            </h2>

            <div className="bg-zinc-950 border border-zinc-800 rounded-md p-5 font-mono text-xs text-zinc-300 space-y-3 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">
              <p>Total Participants = 100 | Rank = 10</p>
              <p>Beaten = 100 - 10 = 90</p>
              <p>Percentile = 90 / 100 = 0.90 (Top 10%)</p>
              <p>Assigned Standard Performance = 1200</p>

              <p className="border-t border-zinc-800 pt-3 mt-3">
                User Current Rating = 1000
              </p>

              <p className="text-amber-500">
                Rating Change = (1200 - 1000) / 2 = +100
              </p>

              <p className="text-emerald-500 font-bold">
                New Rating = 1000 + 100 = 1100
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-mono text-indigo-400 uppercase tracking-widest border-b border-zinc-800 pb-2">
            02. Performance Bracket Matrix
          </h2>

          <div className="bg-zinc-950 border border-zinc-800 rounded-md overflow-hidden transition-all duration-300 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800 bg-zinc-900">
                  <th className="p-4">Percentile Category</th>
                  <th className="p-4 text-right">
                    Standard Performance Rating
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-900 font-mono text-xs">
                <tr className="hover:bg-zinc-900/40">
                  <td className="p-4 text-zinc-400">Top 50%</td>
                  <td className="p-4 text-right text-zinc-100">1000</td>
                </tr>

                <tr className="hover:bg-zinc-900/40">
                  <td className="p-4 text-zinc-400">Top 30%</td>
                  <td className="p-4 text-right text-zinc-100">1100</td>
                </tr>

                <tr className="hover:bg-zinc-900/40">
                  <td className="p-4 text-zinc-400">Top 20%</td>
                  <td className="p-4 text-right text-zinc-100">1150</td>
                </tr>

                <tr className="hover:bg-zinc-900/40">
                  <td className="p-4 text-cyan-400">Top 10%</td>
                  <td className="p-4 text-right text-zinc-100">1200</td>
                </tr>

                <tr className="hover:bg-zinc-900/40">
                  <td className="p-4 text-purple-400">Top 5%</td>
                  <td className="p-4 text-right text-zinc-100">1400</td>
                </tr>

                <tr className="hover:bg-zinc-900/40">
                  <td className="p-4 text-rose-500 font-bold">Top 1%</td>
                  <td className="p-4 text-right text-zinc-100">1800+</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-sm font-mono text-indigo-400 uppercase tracking-widest border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Terminal size={14} /> Technology Stack
            </h2>

            <ul className="space-y-3 font-mono text-xs text-zinc-400">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
                <strong className="text-zinc-200">Frontend:</strong> Next.js
                (TypeScript)
              </li>

              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                <strong className="text-zinc-200">Backend:</strong> Go / Gin
              </li>

              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <strong className="text-zinc-200">Database:</strong> PostgreSQL
              </li>

              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <strong className="text-zinc-200">Architecture:</strong> REST
                API
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-mono text-indigo-400 uppercase tracking-widest border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Database size={14} /> Database Schemas
            </h2>

            <div className="space-y-4 font-mono text-[10px] text-zinc-400">
              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded transition-all duration-300 hover:border-indigo-500/40">
                <p className="text-zinc-200 font-bold mb-1">Users</p>
                <p>
                  id, name, current_rating, max_rating, contests_played, tier
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded transition-all duration-300 hover:border-indigo-500/40">
                <p className="text-zinc-200 font-bold mb-1">Contests</p>
                <p>id, name, date, total_participants, finalized</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded transition-all duration-300 hover:border-indigo-500/40">
                <p className="text-zinc-200 font-bold mb-1">RatingHistory</p>
                <p>
                  user_id, contest_id, old_rating, new_rating,
                  performance_rating, rank, percentile, rating_change
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
