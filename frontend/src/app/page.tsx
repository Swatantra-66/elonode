"use client";

import { useEffect, useState, useRef, ReactNode } from "react";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { Orbitron } from "next/font/google";
import {
  Swords,
  Trophy,
  Activity,
  Loader2,
  Terminal,
  Zap,
  Shield,
  Network,
  Cpu,
  ChevronDown,
} from "lucide-react";
import UnicornScene from "unicornstudio-react";

const futuristicFont = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const FadeIn = ({
  children,
  delay = 0,
  yOffset = 40,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  yOffset?: number;
  className?: string;
}) => {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -50px 0px" },
    );

    if (domRef.current) observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={domRef}
      className={`transition-all duration-[800ms] ease-out hardware-accelerated ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? "translateY(0) translateZ(0)"
          : `translateY(${yOffset}px) translateZ(0)`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

export default function NodeHub() {
  const { user, isLoaded } = useUser();
  const [isSyncing, setIsSyncing] = useState(true);
  const [nodeId, setNodeId] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const syncUserToDatabase = async () => {
      if (!isLoaded || !user) return;

      const playerName =
        user.username ||
        user.firstName ||
        user.primaryEmailAddress?.emailAddress.split("@")[0] ||
        "Unknown_Node";

      try {
        const res = await fetch(`${API_BASE_URL}users`);
        if (!res.ok) throw new Error("Failed to fetch users");
        const users = await res.json();

        const existingUser = users.find(
          (u: { id: string; name: string }) => u.name === playerName,
        );

        if (existingUser) {
          setNodeId(existingUser.id);
          localStorage.setItem("elonode_db_id", existingUser.id);
        } else {
          const createRes = await fetch(`${API_BASE_URL}users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: playerName,
              image_url: user.imageUrl,
            }),
          });

          if (!createRes.ok) throw new Error("Failed to auto-create user");

          const newUser = await createRes.json();
          setNodeId(newUser.id);
          localStorage.setItem("elonode_db_id", newUser.id);
        }
      } catch (error) {
        console.error("Database sync failed:", error);
      } finally {
        setIsSyncing(false);
      }
    };

    syncUserToDatabase();
  }, [isLoaded, user, API_BASE_URL]);

  if (isSyncing || !isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 font-mono text-sm uppercase tracking-widest gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        Synchronizing Node Details...
      </div>
    );
  }

  const handleScroll = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          a[href*="unicorn.studio"] {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          html { 
            scroll-behavior: smooth; 
            will-change: scroll-position;
          }
          .hardware-accelerated {
            transform: translateZ(0);
            backface-visibility: hidden;
            perspective: 1000px;
          }
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-track { background: #09090b; }
          ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }

          @keyframes fadeDown {
            from { opacity: 0; transform: translateY(-20px) translateZ(0); }
            to { opacity: 1; transform: translateY(0) translateZ(0); }
          }
          .animate-fade-down {
            animation: fadeDown 0.8s ease-out forwards;
          }
        `,
        }}
      />

      <div
        className="fixed inset-y-0 right-0 left-0 md:left-64 -z-10 h-screen overflow-hidden pointer-events-none bg-black hardware-accelerated"
        style={{ willChange: "transform" }}
      >
        <div className="absolute top-0 left-0 w-full h-[calc(100vh+80px)]">
          <UnicornScene
            projectId="iWEVjdOYv0tYrCvCauok"
            width="100%"
            height="100%"
            scale={1}
            dpi={1}
            sdkUrl="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@2.1.2/dist/unicornStudio.umd.js"
          />
        </div>
      </div>

      <div className="relative z-10 w-full overflow-x-hidden">
        <section className="relative w-full h-screen flex flex-col justify-between pointer-events-none">
          <div className="absolute top-8 left-8 right-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pointer-events-auto animate-fade-down">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox:
                      "w-9 h-9 border-2 border-indigo-500/50 hover:border-indigo-400 transition-colors",
                  },
                }}
              />
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                  Active Node
                </span>
                <span className="text-[13px] font-bold text-white uppercase tracking-wider">
                  {user?.username || user?.firstName || "Unknown"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/arena"
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 backdrop-blur-md text-zinc-100 font-mono text-[11px] font-bold uppercase tracking-widest rounded-lg border border-indigo-500/50 shadow-[0_3px_0_rgba(79,70,229,0.5)] hover:bg-indigo-500/20 hover:shadow-[0_1px_0_rgba(79,70,229,0.5)] hover:translate-y-[2px] active:shadow-none active:translate-y-[3px] transition-all cursor-pointer"
              >
                <Swords size={14} className="text-indigo-400" />
                Enter Arena
              </Link>

              <Link
                href="/leaderboard"
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 backdrop-blur-md text-zinc-100 font-mono text-[11px] font-bold uppercase tracking-widest rounded-lg border border-amber-500/50 shadow-[0_3px_0_rgba(245,158,11,0.5)] hover:bg-amber-500/20 hover:shadow-[0_1px_0_rgba(245,158,11,0.5)] hover:translate-y-[2px] active:shadow-none active:translate-y-[3px] transition-all cursor-pointer"
              >
                <Trophy size={14} className="text-amber-400" />
                Rankings
              </Link>

              <Link
                href={`/profile/${nodeId}`}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 backdrop-blur-md text-zinc-100 font-mono text-[11px] font-bold uppercase tracking-widest rounded-lg border border-cyan-500/50 shadow-[0_3px_0_rgba(6,182,212,0.5)] hover:bg-cyan-500/20 hover:shadow-[0_1px_0_rgba(6,182,212,0.5)] hover:translate-y-[2px] active:shadow-none active:translate-y-[3px] transition-all cursor-pointer"
              >
                <Activity size={14} className="text-cyan-400" />
                My Node
              </Link>

              <Link
                href="/docs"
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 backdrop-blur-md text-zinc-100 font-mono text-[11px] font-bold uppercase tracking-widest rounded-lg border border-blue-500/50 shadow-[0_3px_0_rgba(59,130,246,0.5)] hover:bg-blue-500/20 hover:shadow-[0_1px_0_rgba(59,130,246,0.5)] hover:translate-y-[2px] active:shadow-none active:translate-y-[3px] transition-all cursor-pointer"
              >
                <Terminal size={14} className="text-blue-400" />
                System Docs
              </Link>
            </div>
          </div>

          <div
            className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-auto animate-fade-down"
            style={{
              animationDelay: "1s",
              opacity: 0,
              animationFillMode: "forwards",
            }}
          >
            <button
              onClick={handleScroll}
              className="group flex flex-col items-center gap-2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <span className="text-[10px] font-mono uppercase tracking-[0.3em]">
                Initialize Info
              </span>
              <ChevronDown className="w-5 h-5 animate-bounce text-zinc-400 group-hover:text-indigo-400" />
            </button>
          </div>
        </section>

        <section className="w-full bg-zinc-950 border-t border-zinc-800 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] pt-24 pb-32 pointer-events-auto hardware-accelerated">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn className="text-center mb-20 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold uppercase tracking-widest">
                <Zap size={12} /> System Architecture
              </div>
              <h2
                className={`${futuristicFont.className} text-3xl md:text-5xl font-black text-white uppercase tracking-tighter`}
              >
                Deterministic{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                  Matchmaking
                </span>
              </h2>
              <p className="text-zinc-400 text-sm font-mono leading-relaxed max-w-2xl mx-auto tracking-wide">
                ELONODE evaluates combat metrics using a proprietary Go-based
                rating algorithm. Participants battle in multi-node domains to
                secure placement on the global hierarchy.
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
              <FadeIn
                delay={100}
                yOffset={50}
                className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-2xl hover:border-indigo-500/50 hover:bg-zinc-900/60 transition-all group h-full"
              >
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 mb-6">
                  <Cpu className="text-indigo-400 w-6 h-6 group-hover:scale-110 transition-transform" />
                </div>
                <h3
                  className={`${futuristicFont.className} text-lg text-white tracking-widest uppercase mb-3`}
                >
                  Algorithmic Elo
                </h3>
                <p className="text-zinc-500 text-xs font-mono leading-loose">
                  Ratings are calculated mathematically via Go-routines using
                  dynamic percentile brackets to assure competitive integrity.
                </p>
              </FadeIn>

              <FadeIn
                delay={250}
                yOffset={50}
                className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-2xl hover:border-amber-500/50 hover:bg-zinc-900/60 transition-all group h-full"
              >
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 mb-6">
                  <Network className="text-amber-400 w-6 h-6 group-hover:scale-110 transition-transform" />
                </div>
                <h3
                  className={`${futuristicFont.className} text-lg text-white tracking-widest uppercase mb-3`}
                >
                  Node Protocol
                </h3>
                <p className="text-zinc-500 text-xs font-mono leading-loose">
                  Challenge the grid via 1v1 duels or multi-participant Royale
                  events. Data is synchronized continuously to the frontend.
                </p>
              </FadeIn>

              <FadeIn
                delay={400}
                yOffset={50}
                className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-2xl hover:border-cyan-500/50 hover:bg-zinc-900/60 transition-all group h-full"
              >
                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 mb-6">
                  <Shield className="text-cyan-400 w-6 h-6 group-hover:scale-110 transition-transform" />
                </div>
                <h3
                  className={`${futuristicFont.className} text-lg text-white tracking-widest uppercase mb-3`}
                >
                  Immutable Logs
                </h3>
                <p className="text-zinc-500 text-xs font-mono leading-loose">
                  Every encounter is logged securely. Track your performance
                  trajectory and specific rating deviations in your Node
                  Profile.
                </p>
              </FadeIn>
            </div>

            <FadeIn
              yOffset={30}
              className="bg-zinc-900/20 border border-zinc-800/50 rounded-2xl p-8 md:p-12"
            >
              <div className="text-center mb-10">
                <h2
                  className={`${futuristicFont.className} text-2xl text-white tracking-widest uppercase mb-2`}
                >
                  The Tier Hierarchy
                </h2>
                <p className="text-zinc-500 text-[10px] font-mono tracking-[0.2em] uppercase">
                  Base initialization rating is 1000.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[
                  {
                    name: "Newbie",
                    color: "text-zinc-400 border-zinc-700 bg-zinc-900",
                    range: "1000 - 1099",
                  },
                  {
                    name: "Apprentice",
                    color:
                      "text-emerald-400 border-emerald-900/50 bg-emerald-950/30",
                    range: "1100 - 1149",
                  },
                  {
                    name: "Specialist",
                    color: "text-cyan-400 border-cyan-900/50 bg-cyan-950/30",
                    range: "1150 - 1199",
                  },
                  {
                    name: "Expert",
                    color: "text-blue-400 border-blue-900/50 bg-blue-950/30",
                    range: "1200 - 1399",
                  },
                  {
                    name: "Master",
                    color:
                      "text-purple-400 border-purple-900/50 bg-purple-950/30",
                    range: "1400 - 1799",
                  },
                  {
                    name: "Grandmaster",
                    color:
                      "text-rose-500 border-rose-900/50 bg-rose-950/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]",
                    range: "1800+",
                  },
                ].map((tier, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center gap-3 p-4 border border-zinc-800/50 rounded-xl bg-zinc-950"
                  >
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${tier.color}`}
                    >
                      {tier.name}
                    </span>
                    <span className="text-zinc-600 font-mono text-[10px] tracking-widest">
                      {tier.range}
                    </span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          <footer className="w-full mt-24 text-center">
            <div className="flex items-center justify-center gap-2 text-zinc-600 font-mono text-[10px] uppercase tracking-widest">
              <Terminal size={12} />
              <span>ELONODE CORE ENGINE v1.0</span>
            </div>
          </footer>
        </section>
      </div>
    </>
  );
}
