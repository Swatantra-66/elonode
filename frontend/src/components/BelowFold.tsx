"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import Link from "next/link";
import { useUser, SignUpButton } from "@clerk/nextjs";
import { Orbitron } from "next/font/google";
import { Swords, Zap, Cpu, Network, Shield, Terminal } from "lucide-react";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

interface RevealDivProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

function RevealDiv({
  children,
  delay = 0,
  className = "",
  style = {},
}: RevealDivProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.65s ease, transform 0.65s ease`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const TIERS = [
  {
    name: "Newbie",
    range: "1000–1099",
    color: "#71717a",
    bg: "rgba(113,113,122,0.08)",
    border: "rgba(113,113,122,0.2)",
    glow: false,
  },
  {
    name: "Apprentice",
    range: "1100–1149",
    color: "#34d399",
    bg: "rgba(52,211,153,0.08)",
    border: "rgba(52,211,153,0.25)",
    glow: false,
  },
  {
    name: "Specialist",
    range: "1150–1199",
    color: "#22d3ee",
    bg: "rgba(34,211,238,0.08)",
    border: "rgba(34,211,238,0.25)",
    glow: false,
  },
  {
    name: "Expert",
    range: "1200–1399",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.08)",
    border: "rgba(96,165,250,0.25)",
    glow: false,
  },
  {
    name: "Master",
    range: "1400–1799",
    color: "#c084fc",
    bg: "rgba(192,132,252,0.08)",
    border: "rgba(192,132,252,0.3)",
    glow: false,
  },
  {
    name: "Grandmaster",
    range: "1800+",
    color: "#fb7185",
    bg: "rgba(251,113,133,0.1)",
    border: "rgba(251,113,133,0.35)",
    glow: true,
  },
];

const FEATURES = [
  {
    Icon: Cpu,
    title: "Algorithmic ELO",
    body: "Ratings computed via Go-routines using dynamic percentile brackets — deterministic, auditable, and fair every single round.",
    accent: "#818cf8",
    border: "rgba(129,140,248,0.18)",
    hoverBorder: "rgba(129,140,248,0.5)",
    glow: "rgba(129,140,248,0.05)",
  },
  {
    Icon: Network,
    title: "Node Protocol",
    body: "1v1 duels or multi-participant Royale events. Results sync to every connected client in real-time via the rating engine.",
    accent: "#fbbf24",
    border: "rgba(251,191,36,0.18)",
    hoverBorder: "rgba(251,191,36,0.5)",
    glow: "rgba(251,191,36,0.05)",
  },
  {
    Icon: Shield,
    title: "Immutable Logs",
    body: "Every contest result is written once, never mutated. Your trajectory, deviations, and peak rating are permanently on-record.",
    accent: "#22d3ee",
    border: "rgba(34,211,238,0.18)",
    hoverBorder: "rgba(34,211,238,0.5)",
    glow: "rgba(34,211,238,0.05)",
  },
];

const TICKER_ITEMS = [
  "DETERMINISTIC RATING ENGINE",
  "GO-POWERED BACKEND",
  "REAL-TIME SYNC",
  "IMMUTABLE CONTEST LOGS",
  "PERCENTILE BRACKETS",
  "TIER HIERARCHY",
  "OPEN ALGORITHM",
];

const STATS = [
  { label: "Rating Engine", value: "100% Go" },
  { label: "Avg Latency", value: "12ms" },
  { label: "Algorithm", value: "O(1)" },
  { label: "Uptime", value: "99.9%" },
];

interface BelowFoldProps {
  nodeId: string | null;
}

export default function BelowFold({ nodeId }: BelowFoldProps) {
  const { user } = useUser();

  void nodeId;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes eloTicker    { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes eloShimmer   { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .elo-shimmer {
          background: linear-gradient(90deg, #fff 0%, #818cf8 40%, #22d3ee 70%, #fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: eloShimmer 5s linear infinite;
        }
        .elo-feature-card { transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease; }
        .elo-feature-card:hover { transform: translateY(-6px); }
        .elo-tier-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .elo-tier-card:hover { transform: translateY(-5px) scale(1.03); }
        .elo-btn { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .elo-btn:hover { transform: translateY(-3px); box-shadow: 0 0 0 1px rgba(99,102,241,0.6), 0 20px 60px rgba(99,102,241,0.5) !important; }
      `,
        }}
      />

      <section className="w-full bg-zinc-950 border-t border-zinc-800/50 pointer-events-auto overflow-hidden">
        <div className="w-full bg-zinc-900/30 border-b border-zinc-800/40 py-2.5 overflow-hidden">
          <div
            style={{
              display: "flex",
              width: "max-content",
              animation: "eloTicker 28s linear infinite",
            }}
          >
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-8 px-8">
                {TICKER_ITEMS.map((t) => (
                  <span
                    key={t}
                    className="text-[9px] font-mono font-bold tracking-[0.25em] text-zinc-700 whitespace-nowrap flex items-center gap-2.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-indigo-500/50 inline-block" />
                    {t}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <RevealDiv className="max-w-6xl mx-auto px-6 pt-14">
          <div className="grid grid-cols-2 md:grid-cols-4 rounded-2xl overflow-hidden border border-zinc-800/50 bg-zinc-900/10">
            {STATS.map(({ label, value }, i) => (
              <div
                key={i}
                className={`px-7 py-7 ${i < 3 ? "border-r border-zinc-800/40" : ""}`}
              >
                <p className="text-[9px] font-mono tracking-[0.18em] text-zinc-600 uppercase mb-2.5">
                  {label}
                </p>
                <p
                  className={`${orbitron.className} text-2xl font-black text-white`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </RevealDiv>

        <RevealDiv
          delay={60}
          className="text-center px-6 pt-20 max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[9px] font-mono font-bold uppercase tracking-[0.2em] mb-6">
            <Zap size={10} /> System Architecture
          </div>
          <h2
            className={`${orbitron.className} text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-[1.05] mb-5 elo-shimmer`}
          >
            Deterministic
            <br />
            Matchmaking
          </h2>
          <p className="text-zinc-500 text-xs font-mono leading-loose tracking-wide">
            ELONODE evaluates combat metrics using a proprietary Go-based rating
            algorithm. Participants battle in multi-node domains to secure
            placement on the global hierarchy.
          </p>
        </RevealDiv>

        <div className="max-w-6xl mx-auto px-6 pt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map(
            ({ Icon, title, body, accent, border, hoverBorder, glow }, i) => (
              <RevealDiv key={title} delay={i * 110}>
                <div
                  className="elo-feature-card rounded-2xl p-8 h-full"
                  style={{
                    background: `radial-gradient(ellipse at top left, ${glow}, transparent 65%), #08090e`,
                    border: `1px solid ${border}`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      hoverBorder;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      border;
                  }}
                >
                  <div
                    className="mb-7"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: `${accent}12`,
                      border: `1px solid ${accent}28`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={22} style={{ color: accent }} />
                  </div>
                  <h3
                    className={`${orbitron.className} text-[13px] tracking-widest uppercase mb-4`}
                    style={{ color: accent }}
                  >
                    {title}
                  </h3>
                  <p className="font-mono text-[11.5px] text-zinc-500 leading-loose tracking-wide">
                    {body}
                  </p>
                  <div
                    className="mt-7 h-px rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${accent}35, transparent)`,
                    }}
                  />
                </div>
              </RevealDiv>
            ),
          )}
        </div>

        <RevealDiv delay={80} className="max-w-5xl mx-auto px-6 pt-16">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#07080d",
              border: "1px solid rgba(129,140,248,0.13)",
              boxShadow:
                "0 0 80px rgba(99,102,241,0.06), 0 40px 80px rgba(0,0,0,0.5)",
            }}
          >
            <div
              className="h-0.5 w-full"
              style={{
                background:
                  "linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899,#22d3ee,#34d399)",
              }}
            />
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800/40">
              <div className="flex gap-1.5">
                {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
                  <div
                    key={c}
                    className="w-3 h-3 rounded-full"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <span className="text-[9px] font-mono tracking-widest text-zinc-600 flex items-center gap-2">
                <Terminal size={10} /> engine/engine.go
              </span>
              <span className="text-[9px] font-mono tracking-widest text-indigo-500/40">
                LIVE SOURCE
              </span>
            </div>

            <pre className="font-mono text-[12px] md:text-[13px] leading-[1.95] p-8 overflow-x-auto">
              <span style={{ color: "#818cf8" }}>func </span>
              <span style={{ color: "#60a5fa", fontWeight: 700 }}>
                Calculate
              </span>
              <span style={{ color: "#e4e4e7" }}>
                (rank, totalParticipants, oldRating{" "}
              </span>
              <span style={{ color: "#818cf8" }}>int</span>
              <span style={{ color: "#e4e4e7" }}>) (Result, </span>
              <span style={{ color: "#818cf8" }}>error</span>
              <span style={{ color: "#e4e4e7" }}>
                ) {"{"}
                {"\n"}
              </span>
              <span style={{ color: "#52525b" }}></span>
              <span style={{ color: "#22d3ee" }}>{"  "}if </span>
              <span style={{ color: "#e4e4e7" }}>totalParticipants </span>
              <span style={{ color: "#f472b6" }}>&lt;= </span>
              <span style={{ color: "#fbbf24" }}>0 </span>
              <span style={{ color: "#e4e4e7" }}>
                {"{"}
                {"\n"}
              </span>
              <span style={{ color: "#22d3ee" }}>{"      "}return </span>
              <span style={{ color: "#e4e4e7" }}>
                Result{"{}"}, errors.New(
              </span>
              <span style={{ color: "#34d399" }}>
                &quot;participants must be &gt; 0&quot;
              </span>
              <span style={{ color: "#e4e4e7" }}>
                ){"\n"}
                {"  }"}
                {"\n"}
              </span>
              <span style={{ color: "#22d3ee" }}>{"  "}if </span>
              <span style={{ color: "#e4e4e7" }}>rank </span>
              <span style={{ color: "#f472b6" }}>&lt;= </span>
              <span style={{ color: "#fbbf24" }}>0 </span>
              <span style={{ color: "#e4e4e7" }}>|| rank </span>
              <span style={{ color: "#f472b6" }}>{">"} </span>
              <span style={{ color: "#e4e4e7" }}>
                totalParticipants {"{"}
                {"\n"}
              </span>
              <span style={{ color: "#22d3ee" }}>{"      "}return </span>
              <span style={{ color: "#e4e4e7" }}>
                Result{"{}"}, errors.New(
              </span>
              <span style={{ color: "#34d399" }}>&quot;invalid rank&quot;</span>
              <span style={{ color: "#e4e4e7" }}>
                ){"\n"}
                {"  }"}
                {"\n\n"}
              </span>
              <span style={{ color: "#e4e4e7" }}>
                {"  "}beaten := totalParticipants{" "}
              </span>
              <span style={{ color: "#f472b6" }}>- </span>
              <span style={{ color: "#e4e4e7" }}>rank{"\n"}</span>
              <span style={{ color: "#e4e4e7" }}>{"  "}percentile := </span>
              <span style={{ color: "#818cf8" }}>float64</span>
              <span style={{ color: "#e4e4e7" }}>(beaten) </span>
              <span style={{ color: "#f472b6" }}>/</span>
              <span style={{ color: "#818cf8" }}> float64</span>
              <span style={{ color: "#e4e4e7" }}>
                (totalParticipants){"\n\n"}
              </span>
              <span style={{ color: "#e4e4e7" }}>
                {"  "}performance := resolvePerformance(percentile){"\n"}
              </span>
              <span style={{ color: "#e4e4e7" }}>
                {"  "}change := (performance{" "}
              </span>
              <span style={{ color: "#f472b6" }}>-</span>
              <span style={{ color: "#e4e4e7" }}> oldRating) </span>
              <span style={{ color: "#f472b6" }}>/</span>
              <span style={{ color: "#fbbf24" }}> 2</span>
              <span style={{ color: "#e4e4e7" }}>{"\n"}</span>
              <span style={{ color: "#e4e4e7" }}>
                {"  "}newRating := oldRating{" "}
              </span>
              <span style={{ color: "#f472b6" }}>+</span>
              <span style={{ color: "#e4e4e7" }}> change{"\n\n"}</span>
              <span style={{ color: "#22d3ee" }}>{"  "}return </span>
              <span style={{ color: "#e4e4e7" }}>
                Result{"{"}
                {"\n"}
              </span>
              <span style={{ color: "#e4e4e7" }}>
                {"      "}Beaten: beaten,{"\n"}
                {"      "}Percentile: percentile,{"\n"}
                {"      "}PerformanceRating: performance,{"\n"}
                {"      "}RatingChange: change,{"\n"}
                {"      "}NewRating: newRating,{"\n"}
                {"      "}NewTier: ResolveTier(newRating),{"\n"}
              </span>
              <span style={{ color: "#22d3ee" }}>
                {"  "}
                {"}"}, nil{"\n"}
              </span>
              <span style={{ color: "#e4e4e7" }}>{"}"}</span>
            </pre>

            <div className="mx-6 mb-5 rounded-xl px-5 py-3.5 flex flex-wrap gap-x-6 gap-y-2 justify-center border border-indigo-500/10 bg-indigo-500/[0.04]">
              {[
                ["beaten", "= total − rank"],
                ["percentile", "= beaten / total"],
                ["change", "= (perf − rating) / 2"],
                ["newRating", "= rating + change"],
              ].map(([lhs, rhs]) => (
                <span key={lhs} className="font-mono text-[11px]">
                  <span className="text-blue-400">{lhs} </span>
                  <span className="text-zinc-600">{rhs}</span>
                </span>
              ))}
            </div>

            <div className="px-6 pb-7 pt-4 flex justify-center border-t border-zinc-800/40">
              {!user ? (
                <SignUpButton mode="modal">
                  <button
                    className="elo-btn flex items-center gap-2.5 px-8 py-3.5 text-white font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl cursor-pointer border-0"
                    style={{
                      background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                      boxShadow:
                        "0 0 0 1px rgba(99,102,241,0.4), 0 12px 40px rgba(99,102,241,0.3)",
                    }}
                  >
                    <Zap size={14} /> Initialize Node
                  </button>
                </SignUpButton>
              ) : (
                <Link href="/arena">
                  <button
                    className="elo-btn flex items-center gap-2.5 px-8 py-3.5 text-white font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl cursor-pointer border-0"
                    style={{
                      background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                      boxShadow:
                        "0 0 0 1px rgba(99,102,241,0.4), 0 12px 40px rgba(99,102,241,0.3)",
                    }}
                  >
                    <Swords size={14} /> Join Contest
                  </button>
                </Link>
              )}
            </div>
          </div>
        </RevealDiv>

        <RevealDiv delay={60} className="max-w-6xl mx-auto px-6 pt-16">
          <div
            className="rounded-2xl overflow-hidden border border-zinc-800/40"
            style={{ background: "#07080d" }}
          >
            <div className="px-10 pt-10 pb-8 border-b border-zinc-800/40 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-mono tracking-[0.25em] text-zinc-700 uppercase mb-2">
                  Competitive Structure
                </p>
                <h2
                  className={`${orbitron.className} text-3xl md:text-4xl font-bold text-white uppercase tracking-tighter`}
                >
                  The Tier Hierarchy
                </h2>
              </div>
              <span className="font-mono text-[10px] text-zinc-700 tracking-widest">
                Base rating: <span className="text-zinc-500">1000</span>
              </span>
            </div>

            <div className="p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {TIERS.map(({ name, range, color, bg, border, glow }, i) => (
                <RevealDiv key={name} delay={i * 55}>
                  <div
                    className="elo-tier-card rounded-xl p-5 flex flex-col items-center gap-3 cursor-default"
                    style={{
                      background: bg,
                      border: `1px solid ${border}`,
                      boxShadow: glow ? `0 4px 24px ${color}25` : "none",
                    }}
                  >
                    <span
                      className="font-mono text-[9px] tracking-widest"
                      style={{ color: "rgba(255,255,255,0.12)" }}
                    >
                      0{i + 1}
                    </span>
                    <div
                      className="px-2.5 py-1 rounded-md font-mono text-[9px] font-black uppercase tracking-widest"
                      style={{
                        color,
                        background: `${color}18`,
                        border: `1px solid ${color}38`,
                      }}
                    >
                      {name}
                    </div>
                    <span
                      className="font-mono text-[9.5px] text-center tracking-widest leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.22)" }}
                    >
                      {range}
                    </span>
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: color,
                        boxShadow: `0 0 8px ${color}`,
                      }}
                    />
                  </div>
                </RevealDiv>
              ))}
            </div>

            <div className="px-8 pb-10">
              <div className="flex h-1 rounded-full overflow-hidden">
                {TIERS.map(({ color }) => (
                  <div
                    key={color}
                    className="flex-1 h-full"
                    style={{ background: color, opacity: 0.65 }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="font-mono text-[9px] text-zinc-800 tracking-widest">
                  1000
                </span>
                <span className="font-mono text-[9px] text-zinc-800 tracking-widest">
                  1800+
                </span>
              </div>
            </div>
          </div>
        </RevealDiv>

        <RevealDiv delay={60} className="max-w-6xl mx-auto px-6 pt-16">
          <div
            className="relative rounded-2xl overflow-hidden px-10 py-20 text-center"
            style={{
              background:
                "linear-gradient(135deg,rgba(99,102,241,0.1),rgba(34,211,238,0.05))",
              border: "1px solid rgba(99,102,241,0.18)",
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)",
                backgroundSize: "44px 44px",
              }}
            />
            <div className="relative z-10">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-4 text-indigo-500/50">
                Ready to compete?
              </p>
              <h3
                className={`${orbitron.className} text-3xl md:text-5xl font-bold text-white uppercase tracking-tighter mb-5 leading-tight`}
              >
                Enter the Arena
              </h3>
              <p className="font-mono text-xs text-zinc-600 tracking-wide leading-loose max-w-md mx-auto mb-10">
                Your rating starts at 1000. Every contest moves you based on
                your percentile. Climb the hierarchy.
              </p>
              {!user ? (
                <SignUpButton mode="modal">
                  <button
                    className="elo-btn inline-flex items-center gap-2.5 px-9 py-4 text-white font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl cursor-pointer border-0"
                    style={{
                      background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                      boxShadow:
                        "0 0 0 1px rgba(99,102,241,0.4), 0 16px 48px rgba(99,102,241,0.35)",
                    }}
                  >
                    <Zap size={14} /> Initialize Node
                  </button>
                </SignUpButton>
              ) : (
                <Link href="/arena">
                  <button
                    className="elo-btn inline-flex items-center gap-2.5 px-9 py-4 text-white font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl cursor-pointer border-0"
                    style={{
                      background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                      boxShadow:
                        "0 0 0 1px rgba(99,102,241,0.4), 0 16px 48px rgba(99,102,241,0.35)",
                    }}
                  >
                    <Swords size={14} /> Join Contest
                  </button>
                </Link>
              )}
            </div>
          </div>
        </RevealDiv>

        <div className="border-t border-zinc-800/30 mt-20 py-8 text-center">
          <span className="font-mono text-[10px] tracking-[0.2em] text-zinc-800 uppercase flex items-center justify-center gap-2">
            <Terminal size={11} /> ELONODE CORE ENGINE v1.1 · All systems
            operational
          </span>
        </div>
      </section>
    </>
  );
}
