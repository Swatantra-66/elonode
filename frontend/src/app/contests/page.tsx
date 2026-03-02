"use client";

import { useState, useEffect } from "react";
import { Orbitron } from "next/font/google";
import { Zap, Copy, Check, Activity } from "lucide-react";

const futuristicFont = Orbitron({
  subsets: ["latin"],
  weight: ["700"],
});

interface Contest {
  name?: string;
  id: string;
  total_participants: number;
  finalized: boolean;
  created_at?: string;
}

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}contests`);
        if (res.ok) {
          const data = await res.json();
          setContests(data);
        }
      } catch (err) {
        console.error("Failed to fetch contests", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContests();
  }, []);

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-500 flex items-center justify-center font-mono text-xs tracking-widest uppercase animate-pulse">
        Querying Contest Logs...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="w-full max-w-5xl mx-auto mt-8 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-4 p-6 border-b border-zinc-800 bg-zinc-900/20">
          <Activity className="w-6 h-6 text-indigo-500" />
          <h2
            className={`${futuristicFont.className} text-xl text-white tracking-widest uppercase`}
          >
            System <span className="text-zinc-600">Contest Logs</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 text-zinc-500 text-[10px] uppercase tracking-[0.2em]">
                <th className="p-4 font-bold">Contest ID</th>
                <th className="p-4 font-bold">Contest Name</th>
                <th className="p-4 font-bold text-center">Participants</th>
                <th className="p-4 font-bold text-right">Engine Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {contests.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest"
                  >
                    No matching records found.
                  </td>
                </tr>
              ) : (
                contests.map((contest) => (
                  <tr
                    key={contest.id}
                    className="hover:bg-zinc-800/20 transition-all group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Zap
                          size={14}
                          className={
                            contest.finalized
                              ? "text-zinc-600"
                              : "text-amber-500"
                          }
                        />
                        <span className="font-mono text-[11px] text-zinc-300 truncate max-w-[150px]">
                          {contest.id}
                        </span>
                        <button
                          onClick={() => copyToClipboard(contest.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-800 rounded-md transition-all text-zinc-500 hover:text-white"
                          title="Copy ID"
                        >
                          {copiedId === contest.id ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="p-4 font-bold text-zinc-100 uppercase tracking-tight text-sm">
                      {contest.name || (
                        <span className="text-zinc-600 font-mono text-[10px]">
                          UNREGISTERED_BOUT
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <span className="font-mono font-bold text-zinc-400">
                        {contest.total_participants}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded-sm border ${
                          contest.finalized
                            ? "bg-emerald-950/30 text-emerald-500 border-emerald-900/50"
                            : "bg-amber-950/30 text-amber-500 border-amber-900/50"
                        }`}
                      >
                        {contest.finalized ? "FINALIZED" : "ACTIVE / PENDING"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
