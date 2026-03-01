"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Server,
  Shield,
  Activity,
  UserPlus,
  Trophy,
} from "lucide-react";

export default function Home() {
  const [userId, setUserId] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newContestName, setNewContestName] = useState("");
  const [adminMessage, setAdminMessage] = useState({
    text: "",
    isError: false,
  });
  const router = useRouter();

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId.trim()) {
      router.push(`/profile/${userId.trim()}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    setAdminMessage({ text: "Creating user...", isError: false });

    try {
      const res = await fetch(`${API_BASE_URL}users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newUserName.trim() }),
      });

      if (!res.ok) throw new Error("Failed to create user");

      const data = await res.json();
      setAdminMessage({
        text: `User Created! UUID: ${data.id || data.ID || "Check DB"}`,
        isError: false,
      });
      setNewUserName("");
    } catch (err) {
      setAdminMessage({
        text: "Connection Error. Is the Render service active?",
        isError: true,
      });
      console.error(err);
    }
  };

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContestName.trim()) return;

    setAdminMessage({ text: "Creating contest...", isError: false });

    try {
      const res = await fetch(`${API_BASE_URL}contests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newContestName.trim() }),
      });

      if (!res.ok) throw new Error("Failed to create contest");

      const data = await res.json();
      setAdminMessage({
        text: `Contest Created! ID: ${data.id || data.ID || "Check DB"}`,
        isError: false,
      });
      setNewContestName("");
    } catch (err) {
      setAdminMessage({
        text: "Connection Error. Check backend logs on Render.",
        isError: true,
      });
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-3xl w-full space-y-12">
        <div className="space-y-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-zinc-100">
            Contest Rating System
          </h1>
          <p className="text-zinc-400 text-base max-w-xl mx-auto leading-relaxed">
            A high-performance percentile tracking system.{" "}
            <br className="hidden sm:block" />
            Connected to Render & Supabase for production stability.
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter User UUID..."
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-md py-2.5 pl-10 pr-4 focus:outline-none focus:border-zinc-500 transition-colors font-mono text-sm"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-zinc-100 text-zinc-900 hover:bg-white font-medium py-2.5 px-6 rounded-md transition-colors text-sm"
            >
              Query System
            </button>
          </form>
        </div>

        <div className="max-w-xl mx-auto pt-8 border-t border-zinc-800/50 space-y-4">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
            System Administration
          </h2>

          <div className="flex flex-col gap-3">
            <form
              onSubmit={handleCreateUser}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <UserPlus size={16} />
                </div>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="New User Name..."
                  className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-md py-2 pl-10 pr-4 focus:outline-none focus:border-zinc-500 transition-colors font-mono text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700 transition-colors"
              >
                Add User
              </button>
            </form>

            <form
              onSubmit={handleCreateContest}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Trophy size={16} />
                </div>
                <input
                  type="text"
                  value={newContestName}
                  onChange={(e) => setNewContestName(e.target.value)}
                  placeholder="New Contest Name..."
                  className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-md py-2 pl-10 pr-4 focus:outline-none focus:border-zinc-500 transition-colors font-mono text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700 transition-colors"
              >
                Add Contest
              </button>
            </form>
          </div>

          {adminMessage.text && (
            <div
              className={`text-sm mt-4 p-3 rounded-md border animate-in fade-in slide-in-from-top-1 ${
                adminMessage.isError
                  ? "bg-red-950/20 border-red-900/50 text-red-400"
                  : "bg-green-950/20 border-green-900/50 text-green-400"
              }`}
            >
              {adminMessage.text}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-zinc-800/50">
          <div className="space-y-2">
            <Server className="text-zinc-400 w-5 h-5" />
            <h3 className="font-medium text-zinc-100 text-sm">
              Predictable Scaling
            </h3>
            <p className="text-sm text-zinc-500">
              Deployed on Render with Go 1.25 runtime.
            </p>
          </div>

          <div className="space-y-2">
            <Activity className="text-zinc-400 w-5 h-5" />
            <h3 className="font-medium text-zinc-100 text-sm">Live Sync</h3>
            <p className="text-sm text-zinc-500">
              Real-time data streaming via Supabase Postgres.
            </p>
          </div>

          <div className="space-y-2">
            <Shield className="text-zinc-400 w-5 h-5" />
            <h3 className="font-medium text-zinc-100 text-sm">
              ACID Compliance
            </h3>
            <p className="text-sm text-zinc-500">
              Relational integrity for all contest metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
