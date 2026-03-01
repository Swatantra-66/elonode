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
  Swords,
} from "lucide-react";

export default function Home() {
  const [userId, setUserId] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newContestName, setNewContestName] = useState("");

  const [finalizeContestId, setFinalizeContestId] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [loserId, setLoserId] = useState("");

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

  const handleFinalizeMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalizeContestId.trim() || !winnerId.trim() || !loserId.trim())
      return;

    setAdminMessage({ text: "Calculating Elo ratings...", isError: false });

    try {
      const payload = {
        participants: [
          { user_id: winnerId.trim(), rank: 1 },
          { user_id: loserId.trim(), rank: 2 },
        ],
      };

      const res = await fetch(
        `${API_BASE_URL}contests/${finalizeContestId.trim()}/finalize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error("Failed to finalize contest");

      setAdminMessage({
        text: "Match Finalized! Ratings have been successfully updated.",
        isError: false,
      });

      setFinalizeContestId("");
      setWinnerId("");
      setLoserId("");
    } catch (err) {
      setAdminMessage({
        text: "Error finalizing match. Verify all UUIDs are correct.",
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
              className="bg-zinc-100 text-zinc-900 hover:bg-white font-medium py-2.5 px-6 rounded-md transition-colors text-sm cursor-pointer"
            >
              Query System
            </button>
          </form>
        </div>

        <div className="max-w-xl mx-auto pt-8 border-t border-zinc-800/50 space-y-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
            System Administration
          </h2>

          <div className="flex flex-col gap-4">
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
                className="px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700 transition-colors cursor-pointer whitespace-nowrap"
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
                className="px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Add Contest
              </button>
            </form>

            <div className="pt-4 border-t border-zinc-800/30">
              <h3 className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Swords size={12} /> Record 1v1 Match Results
              </h3>
              <form
                onSubmit={handleFinalizeMatch}
                className="flex flex-col gap-3 p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-md"
              >
                <input
                  type="text"
                  value={finalizeContestId}
                  onChange={(e) => setFinalizeContestId(e.target.value)}
                  placeholder="Contest UUID"
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-md py-2 px-3 focus:outline-none focus:border-zinc-500 transition-colors font-mono text-xs"
                  required
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={winnerId}
                    onChange={(e) => setWinnerId(e.target.value)}
                    placeholder="Winner UUID (1st Place)"
                    className="w-full bg-green-950/10 border border-green-900/30 text-zinc-100 rounded-md py-2 px-3 focus:outline-none focus:border-green-700 transition-colors font-mono text-xs placeholder:text-zinc-600"
                    required
                  />
                  <input
                    type="text"
                    value={loserId}
                    onChange={(e) => setLoserId(e.target.value)}
                    placeholder="Loser UUID (2nd Place)"
                    className="w-full bg-red-950/10 border border-red-900/30 text-zinc-100 rounded-md py-2 px-3 focus:outline-none focus:border-red-700 transition-colors font-mono text-xs placeholder:text-zinc-600"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full mt-1 px-4 py-2 bg-zinc-100 text-zinc-900 font-medium rounded-md hover:bg-white transition-colors cursor-pointer text-sm"
                >
                  Finalize Match & Update Ratings
                </button>
              </form>
            </div>
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
