"use client";

import { useState, useEffect } from "react";
import { Orbitron } from "next/font/google";
import { useUser, useAuth } from "@clerk/nextjs";
import {
  Zap,
  Copy,
  Check,
  Activity,
  Trash2,
  Lock,
  XCircle,
  CheckCircle2,
} from "lucide-react";

const futuristicFont = Orbitron({ subsets: ["latin"], weight: ["700"] });

interface Contest {
  name?: string;
  id: string;
  total_participants: number;
  finalized: boolean;
  created_at?: string;
}

function SecurityModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (key: string) => void;
}) {
  const [key, setKey] = useState("");
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-lg p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Lock size={20} className="text-indigo-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-bold tracking-widest uppercase text-sm font-mono">
              Authorize Deletion
            </h3>
            <p className="text-zinc-500 text-[11px] leading-relaxed uppercase tracking-tighter">
              A valid admin security key is required to execute cascading
              contest deletion.
            </p>
          </div>
          <div className="w-full space-y-4">
            <input
              autoFocus
              type="password"
              placeholder="ENTER ADMIN KEY..."
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500/50 rounded-md py-3 px-4 text-xs text-zinc-200 font-mono outline-none transition-all"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (onConfirm(key), setKey(""))
              }
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  onConfirm(key);
                  setKey("");
                }}
                className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-950 text-[10px] font-black uppercase tracking-widest rounded-md transition-all cursor-pointer"
              >
                Confirm Deletion
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 text-zinc-500 hover:text-zinc-300 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = String(h % 12 || 12).padStart(2, "0");
    return `${month} ${day}, ${year} · ${hour}:${m} ${ampm}`;
  } catch {
    return dateStr;
  }
}

function ContestDate({ dateStr }: { dateStr?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || !dateStr) return <span className="text-zinc-700">—</span>;
  return (
    <span className="font-mono text-[10px] text-zinc-500">
      {formatDate(dateStr)}
    </span>
  );
}

export default function ContestsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const isAdmin = user?.publicMetadata?.role === "admin";

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}contests`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setContests(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleConfirmDelete = async (secretKey: string) => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setIsModalOpen(false);
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}contests/${target.id}`,
        {
          method: "DELETE",
          headers: {
            "X-Admin-Key": secretKey,
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.ok) {
        setContests((prev) => prev.filter((c) => c.id !== target.id));
        setNotification({
          message: `Contest Deleted — ${target.name}`,
          type: "success",
        });
      } else {
        const data = await res.json();
        setNotification({
          message: `Termination Failed: ${data.error || "Unauthorized"}`,
          type: "error",
        });
      }
    } catch {
      setNotification({
        message: "System Error: Could not reach backend.",
        type: "error",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-500 flex items-center justify-center font-mono text-xs tracking-widest uppercase animate-pulse">
        Querying Contest Logs...
      </div>
    );

  return (
    <div className="min-h-screen p-6 relative">
      {notification && (
        <div className="fixed bottom-8 right-8 z-[200] flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-2xl">
          {notification.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-500" />
          ) : (
            <XCircle size={18} className="text-rose-500" />
          )}
          <span className="text-zinc-200 font-mono text-[10px] uppercase tracking-widest">
            {notification.message}
          </span>
        </div>
      )}

      <div className="w-full max-w-5xl mx-auto mt-8 bg-zinc-950/40 backdrop-blur-md border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-4 p-6 border-b border-zinc-800 bg-zinc-900/20">
          <Activity className="w-6 h-6 text-indigo-500" />
          <h2
            className={`${futuristicFont.className} text-xl text-white tracking-widest uppercase`}
          >
            Contest<span className="text-zinc-600"> Logs</span>
          </h2>
          <span className="ml-auto font-mono text-[10px] text-zinc-600">
            {contests.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 text-zinc-500 text-[10px] uppercase tracking-[0.2em]">
                <th className="p-4 font-bold">Contest ID</th>
                <th className="p-4 font-bold">Contest Name</th>
                <th className="p-4 font-bold text-center">Participants</th>
                <th className="p-4 font-bold text-center">Created</th>
                <th className="p-4 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {contests.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-12 text-center text-zinc-700 font-mono text-xs uppercase tracking-widest"
                  >
                    No contest records found.
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
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-800 rounded-md transition-all text-zinc-500 hover:text-white cursor-pointer"
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
                    <td className="p-4 text-center font-mono font-bold text-zinc-400">
                      {contest.total_participants}
                    </td>
                    <td className="p-4 text-center">
                      <ContestDate dateStr={contest.created_at} />
                    </td>
                    <td className="p-4 w-48">
                      <div className="flex items-center justify-end gap-3">
                        <span
                          className={`flex items-center justify-center h-6 px-2 text-[10px] leading-none font-black uppercase rounded-sm border ${
                            contest.finalized
                              ? "bg-emerald-950/30 text-emerald-500 border-emerald-900/50"
                              : "bg-amber-950/30 text-amber-500 border-amber-900/50"
                          }`}
                        >
                          {contest.finalized ? "FINALIZED" : "ACTIVE"}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setDeleteTarget({
                                id: contest.id,
                                name: contest.name || "UNREGISTERED_BOUT",
                              });
                              setIsModalOpen(true);
                            }}
                            className="flex items-center justify-center h-6 px-1.5 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-sm transition-all group-hover:opacity-100 opacity-0 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SecurityModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
