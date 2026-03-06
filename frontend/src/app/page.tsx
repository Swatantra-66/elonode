"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { Orbitron } from "next/font/google";
import { Swords, Trophy, Activity, Loader2 } from "lucide-react";
import UnicornScene from "unicornstudio-react";

const futuristicFont = Orbitron({
  subsets: ["latin"],
  weight: ["700", "900"],
});

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
          console.log(
            "New node detected. Registering to database with image...",
          );

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
        `,
        }}
      />

      <div className="fixed inset-y-0 right-0 left-0 md:left-64 -z-10 h-screen overflow-hidden pointer-events-none bg-black">
        <div className="absolute top-0 left-0 w-full h-[calc(100vh+80px)]">
          <UnicornScene
            projectId="iWEVjdOYv0tYrCvCauok"
            width="100%"
            height="100%"
            scale={1}
            dpi={1.5}
            sdkUrl="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@2.1.2/dist/unicornStudio.umd.js"
          />
        </div>
      </div>

      <div className="min-h-screen bg-transparent relative z-10 font-sans pointer-events-none">
        <div className="absolute top-8 left-8 right-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pointer-events-auto">
          <div className="flex items-center gap-4 px-5 py-3 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox:
                    "w-10 h-10 border-2 border-indigo-500/50 hover:border-indigo-400 transition-colors",
                },
              }}
            />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                Active Node
              </span>
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                {user?.username || user?.firstName || "Unknown"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <Link
              href="/arena"
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900/80 backdrop-blur-md text-zinc-100 font-mono text-xs font-bold uppercase tracking-widest rounded-lg border border-indigo-500/50 shadow-[0_5px_0_rgba(79,70,229,0.5)] hover:bg-indigo-500/20 hover:shadow-[0_2px_0_rgba(79,70,229,0.5)] hover:translate-y-[3px] active:shadow-none active:translate-y-[5px] transition-all cursor-pointer"
            >
              <Swords size={16} className="text-indigo-400" />
              Enter Arena
            </Link>

            <Link
              href="/leaderboard"
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900/80 backdrop-blur-md text-zinc-100 font-mono text-xs font-bold uppercase tracking-widest rounded-lg border border-amber-500/50 shadow-[0_5px_0_rgba(245,158,11,0.5)] hover:bg-amber-500/20 hover:shadow-[0_2px_0_rgba(245,158,11,0.5)] hover:translate-y-[3px] active:shadow-none active:translate-y-[5px] transition-all cursor-pointer"
            >
              <Trophy size={16} className="text-amber-400" />
              Rankings
            </Link>

            <Link
              href={`/profile/${nodeId}`}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900/80 backdrop-blur-md text-zinc-100 font-mono text-xs font-bold uppercase tracking-widest rounded-lg border border-cyan-500/50 shadow-[0_5px_0_rgba(6,182,212,0.5)] hover:bg-cyan-500/20 hover:shadow-[0_2px_0_rgba(6,182,212,0.5)] hover:translate-y-[3px] active:shadow-none active:translate-y-[5px] transition-all cursor-pointer"
            >
              <Activity size={16} className="text-cyan-400" />
              My Stats
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
