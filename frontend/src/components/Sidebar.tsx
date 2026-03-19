"use client";

import Link from "next/link";
import { Menu, X, Database, Zap, Trophy, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Orbitron } from "next/font/google";
import { UserButton, SignOutButton, useAuth } from "@clerk/nextjs";
import UnicornScene from "unicornstudio-react";

const futuristicFont = Orbitron({
  subsets: ["latin"],
  weight: ["700", "900"],
});

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const { userId, isLoaded } = useAuth();
  const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  const isAdmin = isLoaded && userId === ADMIN_USER_ID;

  const [stats, setStats] = useState({
    total_nodes: 0,
    active_contests: 0,
    average_elo: 0,
    live_nodes: 0,
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
            live_nodes: data.live_nodes || 0,
          });
        }

        const healthRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}health`,
        );
        setIsOnline(healthRes.ok);
      } catch {
        setIsOnline(false);
      }
    };

    fetchSystemData();
    const interval = setInterval(fetchSystemData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{`
        a[href*="unicorn.studio"] {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `}</style>

      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 rounded-md border border-zinc-800 text-zinc-400"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-black border-r border-zinc-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 overflow-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div
          className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
          style={{ width: "150%", height: "150%", top: "-25%", left: "-25%" }}
        >
          <UnicornScene
            projectId="jQFuPrfohqDwL6UqkSt8"
            width="100%"
            height="100%"
            scale={1}
            dpi={1.5}
            sdkUrl="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@2.1.4/dist/unicornStudio.umd.js"
          />
        </div>

        <div className="absolute inset-0 z-10 bg-zinc-950/80 backdrop-blur-[2px]" />

        <div className="relative z-20 flex flex-col h-full p-8 overflow-y-auto">
          <Link
            href="/"
            className="inline-block transition-opacity hover:opacity-75 cursor-pointer"
          >
            <h2
              className={`text-2xl text-white tracking-wider uppercase whitespace-nowrap ${futuristicFont.className}`}
            >
              Elo<span className="text-zinc-600">Node</span>
            </h2>
          </Link>

          <div className="w-full h-[1px] bg-zinc-800/80 mt-6 mb-8" />

          <nav className="flex flex-col gap-8 flex-1">
            <div className="space-y-4">
              <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-[0.3em] mb-4">
                Core Interface
              </p>

              <Link
                href={isAdmin ? "/admin" : "#"}
                className={`uppercase tracking-widest text-[11px] font-bold transition-all border-l-2 pl-4 py-1 flex items-center gap-3 ${pathname === "/admin" ? "border-emerald-400 text-white" : "border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"}`}
              >
                <span>Admin Panel</span>
                {!isAdmin && (
                  <Lock size={12} className="text-zinc-600 mb-0.5" />
                )}
              </Link>

              <Link
                href="/arena"
                className={`uppercase tracking-widest text-[11px] font-bold transition-all border-l-2 pl-4 py-1 flex items-center gap-3 ${pathname === "/arena" ? "border-emerald-400 text-white" : "border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"}`}
              >
                Join Contest
              </Link>

              <Link
                href="/leaderboard"
                className={`uppercase tracking-widest text-[11px] font-bold transition-all border-l-2 pl-4 py-1 flex items-center gap-3 ${pathname === "/leaderboard" ? "border-emerald-400 text-white" : "border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"}`}
              >
                Leaderboard
              </Link>

              <Link
                href="/contests"
                className={`uppercase tracking-widest text-[11px] font-bold transition-all border-l-2 pl-4 py-1 flex items-center gap-3 ${pathname === "/contests" ? "border-emerald-400 text-white" : "border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"}`}
              >
                Contest Log
              </Link>

              <Link
                href="/history"
                className={`uppercase tracking-widest text-[11px] font-bold transition-all border-l-2 pl-4 py-1 flex items-center gap-3 ${pathname === "/history" ? "border-emerald-400 text-white" : "border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"}`}
              >
                Rating History
              </Link>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-[0.3em] mb-4">
                System Metrics
              </p>
              <div className="flex flex-col gap-3 pl-4">
                <div className="flex items-center gap-2 group">
                  <Database
                    size={14}
                    className="text-zinc-600 group-hover:text-emerald-400 transition-colors"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                      Total Nodes:
                    </span>
                    <span className="text-xs text-zinc-200 font-mono">
                      {stats.total_nodes}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 group">
                  <Zap
                    size={14}
                    className={`transition-colors ${stats.live_nodes > 0 ? "text-emerald-400" : "text-zinc-600 group-hover:text-emerald-400"}`}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                      Live Nodes:
                    </span>
                    <span className="text-xs text-zinc-200 font-mono">
                      {stats.live_nodes}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 group">
                  <Trophy
                    size={14}
                    className="text-zinc-600 group-hover:text-emerald-400 transition-colors"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                      System Avg:
                    </span>
                    <span className="text-xs text-zinc-200 font-mono">
                      {stats.average_elo}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          <div className="mt-8 px-2">
            <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-1 bg-emerald-500/50 rounded-full" />
              Sync:{" "}
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="mt-auto pt-6">
            <div className="flex items-center gap-3 px-2 mb-6 border-t border-zinc-800/80 pt-6">
              <div className="relative">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`}
                />
                {isOnline && (
                  <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping opacity-75" />
                )}
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-zinc-200 uppercase tracking-tighter">
                  {isOnline ? "Engine Healthy" : "Engine Offline"}
                </p>
                <p className="text-[9px] text-zinc-500 font-mono tracking-tighter">
                  {isOnline
                    ? "RENDER :: DB_CONNECTED"
                    : "CONNECTION_ERROR :: 500"}
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-800/80 pt-4 px-2 space-y-4">
              <SignOutButton>
                <button className="flex items-center gap-3 w-full p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all rounded-md group cursor-pointer">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="group-hover:-translate-x-1 transition-transform"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span className="font-bold tracking-widest uppercase text-[10px]">
                    System Logout
                  </span>
                </button>
              </SignOutButton>

              <div className="flex items-center gap-3 p-2">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox:
                        "w-8 h-8 border border-zinc-700 hover:border-emerald-500 transition-colors",
                      userButtonPopoverCard:
                        "bg-zinc-900 border border-zinc-800 shadow-2xl",
                    },
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                    System Access
                  </span>
                  <span className="text-[10px] text-zinc-200 font-bold tracking-wider uppercase">
                    Authenticated
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
