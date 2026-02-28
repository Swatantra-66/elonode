"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Server, Shield, Activity } from "lucide-react";

export default function Home() {
  const [userId, setUserId] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId.trim()) {
      router.push(`/profile/${userId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-3xl w-full space-y-12">
        {/* Header Section */}
        <div className="space-y-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-zinc-100">
            Contest Rating System
          </h1>
          <p className="text-zinc-400 text-base max-w-xl mx-auto leading-relaxed">
            A high-performance percentile tracking system.{" "}
            <br className="hidden sm:block" />
            Query a UUID to retrieve historical performance and tier data.
          </p>
        </div>

        {/* Search Box - Utilitarian */}
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
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-md py-2.5 pl-10 pr-4 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors font-mono text-sm"
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

        {/* Feature Highlights - Minimalist */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-zinc-800/50">
          <div className="space-y-2">
            <Server className="text-zinc-400 w-5 h-5" />
            <h3 className="font-medium text-zinc-100 text-sm">
              Predictable Scaling
            </h3>
            <p className="text-sm text-zinc-500">
              Go & PostgreSQL backend for high-throughput finalization.
            </p>
          </div>

          <div className="space-y-2">
            <Activity className="text-zinc-400 w-5 h-5" />
            <h3 className="font-medium text-zinc-100 text-sm">
              Percentile Tiers
            </h3>
            <p className="text-sm text-zinc-500">
              Dynamic standard ratings from Newbie to Grandmaster.
            </p>
          </div>

          <div className="space-y-2">
            <Shield className="text-zinc-400 w-5 h-5" />
            <h3 className="font-medium text-zinc-100 text-sm">
              ACID Compliance
            </h3>
            <p className="text-sm text-zinc-500">
              Transaction-safe schema ensuring zero data corruption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
