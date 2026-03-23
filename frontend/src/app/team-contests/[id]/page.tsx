"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Orbitron } from "next/font/google";
import {
  ArrowLeft,
  Trophy,
  Terminal,
  Activity,
  Clock,
  ShieldAlert,
  Zap,
  Users,
  Code2,
  AlertTriangle,
  Lock,
  Loader2,
} from "lucide-react";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["700", "900"] });
const API = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/?$/, "/");

type TeamContest = {
  id: string;
  name: string;
  mode: string;
  team_size: number;
  duration_sec: number;
  started_at: string;
  finalized: boolean;
};

type Team = {
  id: string;
  contest_id: string;
  team_name: string;
  team_number: number;
};

type Member = {
  id: number;
  team_id: string;
  user_id: string;
  is_captain: boolean;
};

type Problem = {
  id: number;
  contest_id: string;
  problem_slug: string;
  position: number;
};

type ScoreRow = {
  rank: number;
  team_id: string;
  team_name: string;
  team_number: number;
  solved: number;
  penalty: number;
};

export default function TeamContestPage() {
  const params = useParams();
  const contestID = params?.id as string;

  const [contest, setContest] = useState<TeamContest | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [scoreboard, setScoreboard] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [teamID, setTeamID] = useState("");
  const [problemSlug, setProblemSlug] = useState("");
  const [verdict, setVerdict] = useState("WA");
  const [submitting, setSubmitting] = useState(false);

  const membersByTeam = useMemo(() => {
    const m = new Map<string, Member[]>();
    for (const row of members) {
      const prev = m.get(row.team_id) || [];
      prev.push(row);
      m.set(row.team_id, prev);
    }
    return m;
  }, [members]);

  const loadContest = async () => {
    setError("");
    try {
      const [a, b] = await Promise.all([
        fetch(`${API}team-contests/${contestID}`),
        fetch(`${API}team-contests/${contestID}/scoreboard`),
      ]);
      const contestData = await a.json();
      const scoreData = await b.json();
      if (!a.ok)
        throw new Error(contestData?.error || "Failed to load contest");
      if (!b.ok)
        throw new Error(scoreData?.error || "Failed to load scoreboard");

      setContest(contestData.contest);
      setTeams(contestData.teams || []);
      setMembers(contestData.members || []);
      setProblems(contestData.problems || []);
      setScoreboard(scoreData.scoreboard || []);

      if (!teamID && contestData.teams?.[0]?.id)
        setTeamID(contestData.teams[0].id);
      if (!problemSlug && contestData.problems?.[0]?.problem_slug)
        setProblemSlug(contestData.problems[0].problem_slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContest();
    const timer = setInterval(loadContest, 5000);
    return () => clearInterval(timer);
  }, [contestID]);

  const submitVerdict = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API}team-contests/${contestID}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamID,
          problem_slug: problemSlug,
          verdict,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submission failed");
      await loadContest();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const finalizeContest = async () => {
    if (!confirm("Are you sure you want to finalize? This cannot be undone."))
      return;
    setError("");
    try {
      const res = await fetch(`${API}team-contests/${contestID}/finalize`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Finalize failed");
      await loadContest();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Finalize failed");
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center gap-4 relative"
        style={{ fontFamily: "ui-monospace,monospace" }}
      >
        <Activity
          style={{
            width: 32,
            height: 32,
            color: "#6366f1",
            animation: "pulse 1s ease infinite",
          }}
        />
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.3em",
            color: "#818cf8",
            textTransform: "uppercase",
          }}
        >
          Establishing Secure Uplink...
        </span>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative w-full pt-8 pb-24 px-6 overflow-x-hidden"
      style={{ fontFamily: "ui-monospace,monospace", color: "#e4e4e7" }}
    >
      <style>{`
        .glass-panel {
          background: linear-gradient(180deg, rgba(15,15,20,0.7) 0%, rgba(10,10,15,0.9) 100%);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .rank-1 { background: linear-gradient(90deg, rgba(251,191,36,0.15), transparent); border-left: 3px solid #f59e0b; }
        .rank-2 { background: linear-gradient(90deg, rgba(148,163,184,0.1), transparent); border-left: 3px solid #94a3b8; }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <Link
              href="/arena"
              className="text-[10px] text-zinc-500 hover:text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-4 transition-colors"
            >
              <ArrowLeft size={12} /> Return to Arena
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <Trophy size={20} className="text-indigo-400" />
              </div>
              <div>
                <h1
                  className={`${orbitron.className} text-3xl font-black text-white uppercase tracking-tight`}
                >
                  {contest?.name || "MATCH DASHBOARD"}
                </h1>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] uppercase tracking-widest font-bold">
                  <span className="text-zinc-500 flex items-center gap-1">
                    <Clock size={10} /> {contest?.duration_sec}s
                  </span>
                  <span className="text-zinc-600">|</span>
                  {contest?.finalized ? (
                    <span className="text-amber-500 flex items-center gap-1">
                      <Lock size={10} /> Finalized
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Activity size={10} className="animate-pulse" /> Live
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/team-contests/${contestID}/lobby`}
              className="px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition-all uppercase tracking-widest font-bold"
            >
              Enter Lobby
            </Link>
            <Link
              href="/team-contests/new"
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest font-bold"
            >
              New 3v3 Match
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-xs font-bold uppercase tracking-widest">
            <ShieldAlert size={14} /> {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
              <Terminal size={16} className="text-indigo-400" />
              <h2
                className={`${orbitron.className} text-lg font-bold text-white tracking-widest`}
              >
                ICPC SCOREBOARD
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] border-b border-white/5">
                    <th className="pb-3 pl-4">Rank</th>
                    <th className="pb-3">Faction</th>
                    <th className="pb-3 text-center">Solved</th>
                    <th className="pb-3 text-center">Penalty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {scoreboard.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-xs text-zinc-600 uppercase tracking-widest"
                      >
                        Awaiting First Submission...
                      </td>
                    </tr>
                  ) : (
                    scoreboard.map((r, i) => (
                      <tr
                        key={r.team_id}
                        className={`transition-all hover:bg-white/5 ${i === 0 ? "rank-1" : i === 1 ? "rank-2" : ""}`}
                      >
                        <td className="py-4 pl-4">
                          <span
                            className={`${orbitron.className} text-lg font-black ${i === 0 ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-zinc-400"}`}
                          >
                            0{r.rank}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="text-sm font-bold text-zinc-100 uppercase tracking-wide">
                            {r.team_name}
                          </div>
                          <div className="text-[9px] text-zinc-600 tracking-widest mt-0.5">
                            Team #{r.team_number}
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-sm">
                            {r.solved}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <span className="text-sm font-mono text-rose-400">
                            {r.penalty}
                          </span>
                          <span className="text-[9px] text-zinc-600 ml-1">
                            MIN
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
              <Code2 size={16} className="text-cyan-400" />
              <h2
                className={`${orbitron.className} text-lg font-bold text-white tracking-widest`}
              >
                TARGETS
              </h2>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {problems.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-white/5 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="w-6 h-6 rounded bg-cyan-500/10 flex items-center justify-center text-xs font-black text-cyan-400">
                    {String.fromCharCode(64 + p.position)}
                  </div>
                  <span className="text-xs text-zinc-300 font-mono truncate">
                    {p.problem_slug}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-panel p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
              <Users size={16} className="text-rose-400" />
              <h2
                className={`${orbitron.className} text-lg font-bold text-white tracking-widest`}
              >
                ROSTER
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {teams.map((t, i) => (
                <div
                  key={t.id}
                  className="rounded-xl bg-black/40 border border-white/5 p-4 relative overflow-hidden"
                >
                  <div
                    className={`absolute top-0 left-0 w-full h-1 ${i === 0 ? "bg-indigo-500" : "bg-rose-500"}`}
                  />
                  <div className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-1">
                    Faction 0{t.team_number}
                  </div>
                  <div className="text-sm font-black text-white uppercase tracking-wide mb-4 truncate">
                    {t.team_name}
                  </div>
                  <div className="space-y-2">
                    {(membersByTeam.get(t.id) || []).map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 text-[10px] font-mono text-zinc-400"
                      >
                        {m.is_captain ? (
                          <span className="text-amber-400">★</span>
                        ) : (
                          <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                        )}
                        <span className="truncate">
                          {m.user_id.split("-")[0]}...
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <AlertTriangle size={120} />
            </div>
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4 relative z-10">
              <Zap size={16} className="text-amber-400" />
              <h2
                className={`${orbitron.className} text-lg font-bold text-white tracking-widest`}
              >
                SYSTEM OVERRIDE
              </h2>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                    Select Faction
                  </label>
                  <select
                    value={teamID}
                    onChange={(e) => setTeamID(e.target.value)}
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-zinc-200 font-mono outline-none focus:border-amber-500/50"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.team_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                    Target Problem
                  </label>
                  <select
                    value={problemSlug}
                    onChange={(e) => setProblemSlug(e.target.value)}
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-zinc-200 font-mono outline-none focus:border-amber-500/50"
                  >
                    {problems.map((p) => (
                      <option key={p.id} value={p.problem_slug}>
                        {p.problem_slug}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                  Verdict Payload
                </label>
                <select
                  value={verdict}
                  onChange={(e) => setVerdict(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs font-bold font-mono outline-none focus:border-amber-500/50"
                  style={{ color: verdict === "AC" ? "#4ade80" : "#f87171" }}
                >
                  {["WA", "TLE", "RE", "CE", "AC"].map((v) => (
                    <option key={v} value={v}>
                      {v} - {v === "AC" ? "ACCEPTED" : "REJECTED"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5 mt-2">
                <button
                  onClick={submitVerdict}
                  disabled={
                    submitting || !teamID || !problemSlug || contest?.finalized
                  }
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Terminal size={14} />
                  )}
                  Inject Verdict
                </button>
                <button
                  onClick={finalizeContest}
                  disabled={contest?.finalized}
                  className="sm:w-1/3 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lock size={14} /> Finalize
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
