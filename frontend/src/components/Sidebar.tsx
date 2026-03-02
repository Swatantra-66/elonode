"use client";

import Link from "next/link";
import { Menu, X, Database, Zap, Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Orbitron } from "next/font/google";

const futuristicFont = Orbitron({
  subsets: ["latin"],
  weight: ["700", "900"],
});

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const [stats, setStats] = useState({
    total_nodes: 0,
    active_contests: 0,
    average_elo: 0,
  });

  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}stats`);
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats({
            total_nodes: data.total_nodes,
            active_contests: data.active_contests,
            average_elo: data.average_elo,
          });
        }

        const healthRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}health`,
        );
        setIsOnline(healthRes.ok);
      } catch (err) {
        console.error("System sync failed", err);
        setIsOnline(false);
      }
    };

    fetchSystemData();
    const interval = setInterval(fetchSystemData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 rounded-md border border-zinc-800 text-zinc-400"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-zinc-950 border-r border-zinc-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full p-8">
          <h2
            className={`text-2xl text-white mb-10 tracking-wider uppercase whitespace-nowrap ${futuristicFont.className}`}
          >
            Elo<span className="text-zinc-600">Node</span>
          </h2>

          <nav className="flex flex-col gap-8 flex-1">
            <div className="space-y-4">
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mb-4">
                Core Interface
              </p>
              <Link
                href="/"
                className={`uppercase tracking-widest text-[11px] font-bold transition-all border-l-2 pl-4 py-1 flex items-center gap-3 ${
                  pathname === "/"
                    ? "border-white text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Admin Panel
              </Link>
              <Link
                href="/leaderboard"
                className={`uppercase tracking-widest text-[11px] font-bold transition-all border-l-2 pl-4 py-1 flex items-center gap-3 ${
                  pathname === "/leaderboard"
                    ? "border-white text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Leaderboard
              </Link>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mb-4">
                System Metrics
              </p>
              <div className="flex flex-col gap-3 pl-4">
                <div className="flex items-center gap-2 group">
                  <Database
                    size={14}
                    className="text-zinc-700 group-hover:text-zinc-500 transition-colors"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                      Total Nodes:
                    </span>
                    <span className="text-xs text-zinc-300 font-mono">
                      {stats.total_nodes}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 group">
                  <Trophy
                    size={14}
                    className="text-zinc-700 group-hover:text-zinc-500 transition-colors"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                      System Avg:
                    </span>
                    <span className="text-xs text-zinc-300 font-mono">
                      {stats.average_elo}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 group">
                  <Zap
                    size={14}
                    className="text-zinc-700 group-hover:text-zinc-500 transition-colors"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                      Active Contests:
                    </span>
                    <span className="text-xs text-zinc-300 font-mono">
                      {stats.active_contests}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          <div className="mt-8 px-2">
            <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              Sync:{" "}
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="pt-6 border-t border-zinc-900 mt-auto">
            <div className="flex items-center gap-3 px-2">
              <div className="relative">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`}
                />
                {isOnline && (
                  <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping opacity-75" />
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-bold text-zinc-200 uppercase tracking-tighter">
                    {isOnline ? "Engine Healthy" : "Engine Offline"}
                  </p>
                </div>
                <p className="text-[9px] text-zinc-600 font-mono tracking-tighter">
                  {isOnline
                    ? "RENDER :: DB_CONNECTED"
                    : "CONNECTION_ERROR :: 500"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
