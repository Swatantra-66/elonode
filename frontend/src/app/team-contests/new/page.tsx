"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Orbitron } from "next/font/google";
import Link from "next/link";
import {
  ArrowLeft,
  TerminalSquare,
  Clock,
  Code2,
  Shield,
  Users,
  Crown,
  Cpu,
  Zap,
  Swords,
  Loader2,
} from "lucide-react";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["700", "900"] });
const API = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/?$/, "/");

type TeamInput = {
  team_name: string;
  member_ids: string[];
  captain_id: string;
};

export default function CreateICPCContest() {
  const router = useRouter();

  const [name, setName] = useState("ICPC 3v3 Room");
  const [durationSec, setDurationSec] = useState(7200);
  const [problemSlugs, setProblemSlugs] = useState("two-sum,valid-parentheses");

  const [teamA, setTeamA] = useState<TeamInput>({
    team_name: "Team Alpha",
    member_ids: ["", "", ""],
    captain_id: "",
  });

  const [teamB, setTeamB] = useState<TeamInput>({
    team_name: "Team Beta",
    member_ids: ["", "", ""],
    captain_id: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const setMember = (which: "a" | "b", idx: number, value: string) => {
    const updater = which === "a" ? setTeamA : setTeamB;
    updater((prev) => {
      const next = [...prev.member_ids];
      next[idx] = value.trim();
      return { ...prev, member_ids: next };
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        mode: "icpc_3v3",
        duration_sec: durationSec,
        team_a: {
          team_name: teamA.team_name.trim(),
          member_ids: teamA.member_ids.map((x) => x.trim()),
          captain_id: teamA.captain_id.trim(),
        },
        team_b: {
          team_name: teamB.team_name.trim(),
          member_ids: teamB.member_ids.map((x) => x.trim()),
          captain_id: teamB.captain_id.trim(),
        },
        problem_slugs: problemSlugs
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      };

      const res = await fetch(`${API}team-contests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to deploy contest instance");
        setSubmitting(false);
        return;
      }

      router.push(`/team-contests/${data.id}`);
    } catch {
      setError("Network error while deploying contest");
      setSubmitting(false);
    }
  };

  const GlowingInput = ({
    icon: Icon,
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    color = "amber",
  }: any) => {
    const focusColor =
      color === "indigo"
        ? "rgba(99,102,241,0.5)"
        : color === "rose"
          ? "rgba(244,63,94,0.5)"
          : "rgba(251,191,36,0.5)";
    const ringColor =
      color === "indigo"
        ? "rgba(99,102,241,0.15)"
        : color === "rose"
          ? "rgba(244,63,94,0.15)"
          : "rgba(251,191,36,0.15)";

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold ml-1">
          {label}
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            <Icon size={14} />
          </div>
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-9 pr-4 py-3 text-xs text-zinc-200 font-mono outline-none transition-all placeholder:text-zinc-700"
            onFocus={(e) => {
              e.currentTarget.style.borderColor = focusColor;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${ringColor}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(39,39,42,1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen relative w-full flex flex-col items-center pt-8 pb-24 px-6"
      style={{
        fontFamily: "ui-monospace,monospace",
        color: "#e4e4e7",
      }}
    >
      <div className="w-full max-w-4xl flex flex-col gap-6 relative z-10">
        <div className="mb-2 flex items-center justify-between">
          <Link
            href="/arena"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#52525b",
              textDecoration: "none",
              fontSize: 10,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fbbf24")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
          >
            <ArrowLeft size={12} /> Abort Setup
          </Link>

          {error && (
            <div className="text-[10px] text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded font-bold uppercase tracking-widest">
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-6">
          <div
            style={{
              background:
                "linear-gradient(180deg, rgba(9,12,24,0.84) 0%, rgba(5,7,16,0.82) 100%)",
              border: "1px solid rgba(251,191,36,0.22)",
              borderRadius: 24,
              backdropFilter: "blur(24px)",
              overflow: "hidden",
              boxShadow:
                "0 20px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <TerminalSquare size={20} className="text-amber-400" />
                </div>
                <div>
                  <h1
                    className={orbitron.className}
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      letterSpacing: "-0.02em",
                      color: "#fff",
                      textTransform: "uppercase",
                      lineHeight: 1.2,
                    }}
                  >
                    INITIATE <span className="text-amber-500">3v3 ICPC</span>
                  </h1>
                  <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mt-1">
                    Configure lobby parameters & node assignments
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-black/20">
              <GlowingInput
                icon={Shield}
                label="Lobby Name"
                value={name}
                onChange={(e: any) => setName(e.target.value)}
                placeholder="e.g. World Finals Room 1"
              />
              <GlowingInput
                icon={Clock}
                label="Duration (Seconds)"
                value={durationSec}
                onChange={(e: any) => setDurationSec(Number(e.target.value))}
                placeholder="7200"
                type="number"
              />
              <GlowingInput
                icon={Code2}
                label="Target Slugs (Comma Separated)"
                value={problemSlugs}
                onChange={(e: any) => setProblemSlugs(e.target.value)}
                placeholder="two-sum, valid-parentheses"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-zinc-950 border border-zinc-800 items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)]">
              <span
                className={`${orbitron.className} text-sm font-black text-zinc-500`}
              >
                VS
              </span>
            </div>

            <div
              style={{
                background:
                  "linear-gradient(180deg, rgba(15,17,30,0.85) 0%, rgba(10,12,20,0.9) 100%)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderTop: "3px solid rgba(99,102,241,0.6)",
                borderRadius: 20,
                backdropFilter: "blur(12px)",
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div className="flex items-center justify-between border-b border-indigo-500/10 pb-4 mb-2">
                <div className="flex items-center gap-3 w-full">
                  <Users size={16} className="text-indigo-400" />
                  <input
                    value={teamA.team_name}
                    onChange={(e) =>
                      setTeamA({ ...teamA, team_name: e.target.value })
                    }
                    className={`${orbitron.className} bg-transparent text-lg font-black text-indigo-400 uppercase tracking-wide outline-none w-full placeholder:text-indigo-900/50`}
                    placeholder="TEAM ALPHA NAME"
                  />
                </div>
              </div>

              {[0, 1, 2].map((idx) => (
                <GlowingInput
                  key={`a-${idx}`}
                  icon={Cpu}
                  color="indigo"
                  label={`Node ${idx + 1} UUID`}
                  placeholder={`Member ${idx + 1} User ID`}
                  value={teamA.member_ids[idx]}
                  onChange={(e: any) => setMember("a", idx, e.target.value)}
                />
              ))}

              <div className="pt-4 border-t border-indigo-500/10 mt-2">
                <GlowingInput
                  icon={Crown}
                  color="indigo"
                  label="Captain UUID (Must match a node above)"
                  placeholder="Captain User ID"
                  value={teamA.captain_id}
                  onChange={(e: any) =>
                    setTeamA({ ...teamA, captain_id: e.target.value })
                  }
                />
              </div>
            </div>

            <div
              style={{
                background:
                  "linear-gradient(180deg, rgba(30,15,15,0.85) 0%, rgba(20,10,10,0.9) 100%)",
                border: "1px solid rgba(244,63,94,0.2)",
                borderTop: "3px solid rgba(244,63,94,0.6)",
                borderRadius: 20,
                backdropFilter: "blur(12px)",
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div className="flex items-center justify-between border-b border-rose-500/10 pb-4 mb-2">
                <div className="flex items-center gap-3 w-full">
                  <Users size={16} className="text-rose-400" />
                  <input
                    value={teamB.team_name}
                    onChange={(e) =>
                      setTeamB({ ...teamB, team_name: e.target.value })
                    }
                    className={`${orbitron.className} bg-transparent text-lg font-black text-rose-400 uppercase tracking-wide outline-none w-full placeholder:text-rose-900/50`}
                    placeholder="TEAM BETA NAME"
                  />
                </div>
              </div>

              {[0, 1, 2].map((idx) => (
                <GlowingInput
                  key={`b-${idx}`}
                  icon={Cpu}
                  color="rose"
                  label={`Node ${idx + 1} UUID`}
                  placeholder={`Member ${idx + 1} User ID`}
                  value={teamB.member_ids[idx]}
                  onChange={(e: any) => setMember("b", idx, e.target.value)}
                />
              ))}

              <div className="pt-4 border-t border-rose-500/10 mt-2">
                <GlowingInput
                  icon={Crown}
                  color="rose"
                  label="Captain UUID (Must match a node above)"
                  placeholder="Captain User ID"
                  value={teamB.captain_id}
                  onChange={(e: any) =>
                    setTeamB({ ...teamB, captain_id: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-12 mb-8 relative w-full">
            <button
              type="submit"
              disabled={submitting}
              className="flex flex-col items-center justify-center gap-1.5 w-28 h-28 rounded-full text-zinc-950 font-mono text-[10px] font-black uppercase tracking-widest border-[3px] border-zinc-950 cursor-pointer transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed group"
              style={{
                background: submitting
                  ? "rgba(245,158,11,0.5)"
                  : "linear-gradient(135deg, #f59e0b, #fbbf24)",
                boxShadow: submitting
                  ? "none"
                  : "0 0 20px rgba(245,158,11,0.2)",
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow =
                    "0 0 30px rgba(245,158,11,0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow =
                    "0 0 20px rgba(245,158,11,0.2)";
                }
              }}
            >
              {submitting ? (
                <>
                  <Loader2
                    size={24}
                    className="animate-spin text-zinc-900 mb-1"
                  />
                  <span className="leading-tight text-center">
                    Compiling
                    <br />
                    Lobby
                  </span>
                </>
              ) : (
                <>
                  <Swords
                    size={24}
                    className="text-zinc-950 drop-shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
                  />
                  <span className="leading-tight text-center">
                    Deploy
                    <br />
                    Match
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
