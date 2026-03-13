"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Orbitron } from "next/font/google";
import { ArrowLeft, ChevronRight, Zap } from "lucide-react";
import Editor from "@monaco-editor/react";
import Link from "next/link";
import { useWebSocket } from "@/hooks/useWebSocket";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const JUDGE0_URL =
  process.env.NEXT_PUBLIC_JUDGE0_URL || "https://ce.judge0.com";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

type Phase =
  | "loading"
  | "waiting"
  | "countdown"
  | "dueling"
  | "submitting"
  | "won"
  | "lost";
type TestStatus = "pending" | "running" | "passed" | "failed";
type Difficulty = "Easy" | "Medium" | "Hard";

interface Problem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  content: string;
  starterCode: string;
  examples: string;
  timerSecs: number;
  tags: string[];
  leetcodeUrl: string;
}

interface OpponentInfo {
  name: string;
  imageUrl: string;
}

const DIFF_COLOR: Record<Difficulty, string> = {
  Easy: "#4ade80",
  Medium: "#fbbf24",
  Hard: "#f87171",
};
const LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  javascript: 63,
  cpp: 54,
  c: 50,
  java: 62,
  go: 60,
  rust: 73,
  typescript: 74,
};
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

async function runCode(sourceCode: string, language: string, stdin: string) {
  try {
    const res = await fetch(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: sourceCode,
          language_id: LANGUAGE_IDS[language] || 71,
          stdin,
        }),
      },
    );
    const data = await res.json();
    return {
      stdout: (data.stdout || "").trim(),
      stderr: data.stderr || data.compile_output || "",
      status: data.status?.description || "Unknown",
    };
  } catch {
    return { stdout: "", stderr: "Judge0 unreachable", status: "Error" };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<pre>/gi, "\n")
    .replace(/<\/pre>/gi, "\n")
    .replace(/<strong>/gi, "")
    .replace(/<\/strong>/gi, "")
    .replace(/<em>/gi, "")
    .replace(/<\/em>/gi, "")
    .replace(/<code>/gi, "`")
    .replace(/<\/code>/gi, "`")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}

function Avatar({
  name,
  imageUrl,
  color = "from-indigo-500 to-indigo-700",
  size = 48,
}: {
  name: string;
  imageUrl?: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        overflow: "hidden",
        flexShrink: 0,
        border: "2px solid rgba(255,255,255,0.1)",
        background: "#18181b",
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-br ${color} flex items-center justify-center font-black text-white`}
          style={{ fontSize: size * 0.3 }}
        >
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function DuelRoomInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const duelId = params?.id as string;

  const [phase, setPhase] = useState<Phase>("loading");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [timer, setTimer] = useState(900);
  const [countdown, setCountdown] = useState(3);
  const [tab, setTab] = useState<"problem" | "constraints">("problem");
  const [testResults, setTestResults] = useState<TestStatus[]>([]);
  const [opponent, setOpponent] = useState<OpponentInfo>({
    name: "OPPONENT",
    imageUrl: "",
  });
  const [opponentStatus, setOpponentStatus] = useState<
    "waiting" | "typing" | "submitted"
  >("waiting");
  const [myProgress, setMyProgress] = useState(0);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [ratingChange, setRatingChange] = useState(0);
  const [oldRating, setOldRating] = useState(1000);
  const [errorMsg, setErrorMsg] = useState("");
  const [fetchingProblem, setFetchingProblem] = useState(false);
  const [iAmReady, setIAmReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [editorLocked, setEditorLocked] = useState(false);
  const [winnerMsg, setWinnerMsg] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const opponentRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myNodeId =
    typeof window !== "undefined"
      ? localStorage.getItem("elonode_db_id") || ""
      : "";

  const { send: wsSend, connected: wsConnected } = useWebSocket({
    userId: myNodeId,
    userName: user?.username || user?.firstName || "unknown",
    tier: "newbie",
    imageUrl: user?.imageUrl || "",
    enabled: !!myNodeId,
    handlers: {
      onReadyUpdate: (payload) => {
        if (payload.contest_id !== duelId) return;
        if (payload.user_id !== myNodeId) setOpponentReady(true);
        if (payload.ready_count >= 2) startCountdown();
      },
      onDuelStart: (payload) => {
        if (payload.contest_id === duelId) startCountdown();
      },
      onChallengeResponse: (payload) => {
        if (payload.contest_id === duelId && !payload.accepted) {
          setOpponentLeft(true);
          setEditorLocked(true);
          clearInterval(timerRef.current!);
          setWinnerMsg(`${opponent.name} left the duel. You win!`);
          setTimeout(() => setPhase("won"), 2000);
        }
      },
    },
  });

  const startCountdown = useCallback(() => {
    setPhase("countdown");
    let c = 3;
    setCountdown(c);
    const iv = setInterval(() => {
      c--;
      setCountdown(c);
      if (c === 0) {
        clearInterval(iv);
        setPhase("dueling");
        let t = 0;
        setTimer((prev) => {
          t = prev;
          return prev;
        });
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setTimer((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current!);
              setPhase("lost");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        if (opponentRef.current) clearInterval(opponentRef.current);
        let prog = 0;
        opponentRef.current = setInterval(() => {
          prog += Math.random() * 3 + 0.5;
          if (prog >= 95) {
            prog = 95;
            clearInterval(opponentRef.current!);
          }
          setOpponentProgress(Math.round(Math.min(95, prog)));
        }, 1500);
      }
    }, 1000);
  }, []);

  const handleReady = useCallback(() => {
    if (!problem || iAmReady) return;
    setIAmReady(true);
    if (wsConnected) {
      wsSend("ready", { contest_id: duelId, user_id: myNodeId });
      if (opponentReady) startCountdown();
    } else {
      startCountdown();
    }
  }, [
    problem,
    iAmReady,
    opponentReady,
    wsSend,
    wsConnected,
    duelId,
    myNodeId,
    startCountdown,
  ]);
  const DEFAULT_SNIPPETS: Record<string, string> = {
    python3: "class Solution:\n    def solve(self):\n        pass\n",
    javascript:
      "/**\n * @return {any}\n */\nvar solve = function() {\n    \n};\n",
    typescript: "function solve(): any {\n    \n};\n",
    cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        \n    }\n};\n",
    c: "#include <stdio.h>\n#include <stdlib.h>\n\nvoid solve() {\n    \n}\n",
    java: "class Solution {\n    public void solve() {\n        \n    }\n}\n",
    golang: "package main\n\nfunc solve() {\n    \n}\n",
    rust: "impl Solution {\n    pub fn solve() {\n        \n    }\n}\n",
  };

  const LC_LANG_MAP: Record<string, string> = {
    python: "python3",
    javascript: "javascript",
    typescript: "typescript",
    cpp: "cpp",
    c: "c",
    java: "java",
    go: "golang",
    rust: "rust",
  };

  const snippetsRef = useRef<Record<string, string>>({});
  const languageRef = useRef<string>("python");

  const getStarterCode = useCallback((lang: string): string => {
    const lcSlug = LC_LANG_MAP[lang] || "python3";
    return snippetsRef.current[lcSlug] || DEFAULT_SNIPPETS[lcSlug] || "";
  }, []);

  const fetchProblem = useCallback(
    async (diff: Difficulty, contestId?: string) => {
      setFetchingProblem(true);
      setErrorMsg("");
      try {
        const url = contestId
          ? `${API_BASE}problems/random?difficulty=${diff.toLowerCase()}&contest_id=${contestId}`
          : `${API_BASE}problems/random?difficulty=${diff.toLowerCase()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        const data = await res.json();

        const snippetMap: Record<string, string> = {};
        if (data.code_snippets) {
          data.code_snippets.forEach(
            (s: { lang_slug: string; code: string }) => {
              snippetMap[s.lang_slug] = s.code;
            },
          );
        }
        if (!snippetMap["python3"] && data.starter_code) {
          snippetMap["python3"] = data.starter_code;
        }
        snippetsRef.current = snippetMap;

        const p: Problem = {
          slug: data.slug,
          title: data.title,
          difficulty: data.difficulty as Difficulty,
          content: stripHtml(data.content),
          starterCode: data.starter_code,
          examples: data.examples,
          timerSecs: data.timer_secs,
          tags: data.tags || [],
          leetcodeUrl: data.leetcode_url,
        };
        setProblem(p);
        setCode(getStarterCode(languageRef.current));
        setTimer(p.timerSecs);
        const exLines = data.examples
          .split("\n")
          .filter((l: string) => l.trim());
        setTestResults(Array(Math.min(exLines.length, 3)).fill("pending"));
      } catch {
        setErrorMsg("Could not load problem. Check backend connection.");
      } finally {
        setFetchingProblem(false);
      }
    },
    [getStarterCode],
  );

  useEffect(() => {
    const init = async () => {
      const opponentName = searchParams.get("opponent") || "OPPONENT";
      const opponentId = searchParams.get("opponentId") || "";

      let opponentImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(opponentName)}&background=27272a&color=f87171&size=128&bold=true`;
      if (opponentId) {
        try {
          const res = await fetch(`${API_BASE}users/${opponentId}`);
          if (res.ok) {
            const u = await res.json();
            if (u.image_url) opponentImageUrl = u.image_url;
          }
        } catch {}
      }
      setOpponent({ name: opponentName, imageUrl: opponentImageUrl });

      try {
        const res = await fetch(`${API_BASE}duels/${duelId}`);
        if (res.ok) {
          const duel = await res.json();
          const diff = (duel.difficulty as Difficulty) || "Easy";
          setDifficulty(diff);
          await fetchProblem(diff, duelId);
        } else {
          await fetchProblem("Easy", duelId);
        }
      } catch {
        await fetchProblem("Easy", duelId);
      }

      try {
        const uid = localStorage.getItem("elonode_db_id");
        if (uid) {
          const res = await fetch(`${API_BASE}users/${uid}`);
          if (res.ok) {
            const u = await res.json();
            setOldRating(u.current_rating || 1000);
          }
        }
      } catch {
        /* ignore */
      }

      setPhase("waiting");
    };
    init();
  }, [duelId, fetchProblem, searchParams]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (opponentRef.current) clearInterval(opponentRef.current);
    },
    [],
  );

  const submitSolution = useCallback(async () => {
    if (phase !== "dueling" || !problem) return;
    clearInterval(timerRef.current!);
    clearInterval(opponentRef.current!);
    setPhase("submitting");
    setMyProgress(100);
    setErrorMsg("");

    const exampleInputs = problem.examples
      .split("\n")
      .filter((l) => l.trim())
      .slice(0, 3);

    if (exampleInputs.length === 0) {
      const result = await runCode(code, language, "");
      const passed = result.stderr === "" && result.status === "Accepted";
      setTestResults([passed ? "passed" : "failed"]);
      setTimeout(
        () => setPhase(opponentStatus !== "submitted" ? "won" : "lost"),
        800,
      );
      return;
    }

    const results: TestStatus[] = Array(exampleInputs.length).fill("pending");
    setTestResults([...results]);
    let allPassed = true;

    for (let i = 0; i < exampleInputs.length; i++) {
      results[i] = "running";
      setTestResults([...results]);
      const { stdout, stderr, status } = await runCode(
        code,
        language,
        exampleInputs[i],
      );
      const passed =
        stderr === "" &&
        (status === "Accepted" || status === "Finished" || stdout !== "");
      results[i] = passed ? "passed" : "failed";
      if (!passed) allPassed = false;
      setTestResults([...results]);
    }

    if (!allPassed) {
      setErrorMsg("Some test cases failed. Fix your solution.");
      setPhase("dueling");
      timerRef.current = setInterval(
        () =>
          setTimer((t) => {
            if (t <= 1) {
              clearInterval(timerRef.current!);
              setPhase("lost");
              return 0;
            }
            return t - 1;
          }),
        1000,
      );
      return;
    }

    const won = opponentStatus !== "submitted";
    try {
      const uid = localStorage.getItem("elonode_db_id");
      if (uid) {
        const res = await fetch(`${API_BASE}users/${uid}`);
        if (res.ok) {
          const u = await res.json();
          setRatingChange(u.current_rating - oldRating);
        } else setRatingChange(won ? 72 : -50);
      }
    } catch {
      setRatingChange(won ? 72 : -50);
    }
    setEditorLocked(true);
    setWinnerMsg(
      won ? "You solved it first! 🏆" : `${opponent.name} submitted first.`,
    );
    setPhase(won ? "won" : "lost");
  }, [phase, problem, code, language, opponentStatus, oldRating]);

  if (phase === "loading" || fetchingProblem)
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase animate-pulse">
            {fetchingProblem
              ? "Fetching problem from LeetCode..."
              : "Loading Duel Room..."}
          </span>
        </div>
      </div>
    );

  if (phase === "waiting")
    return (
      <div className="min-h-screen bg-[#05060b] flex items-center justify-center font-mono">
        <style>{`@keyframes pulseGlow{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        <div className="text-center max-w-lg w-full px-8">
          <Link
            href="/arena"
            className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-400 transition-colors text-[10px] tracking-widest uppercase mb-10"
          >
            <ArrowLeft size={12} /> Return to Arena
          </Link>
          <p
            className="text-[10px] tracking-[0.3em] text-zinc-600 uppercase mb-4"
            style={{ animation: "pulseGlow 2s ease infinite" }}
          >
            ● Duel Room Active
          </p>
          <h1
            className={`${orbitron.className} text-5xl font-black text-white uppercase tracking-tighter mb-2`}
          >
            DUEL <span className="text-indigo-500">ROOM</span>
          </h1>

          {problem && (
            <div className="my-6 px-5 py-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-600 tracking-widest uppercase">
                  Problem
                </span>
                <span
                  className="text-[9px] px-2 py-0.5 rounded"
                  style={{
                    background: `${DIFF_COLOR[problem.difficulty]}15`,
                    border: `1px solid ${DIFF_COLOR[problem.difficulty]}30`,
                    color: DIFF_COLOR[problem.difficulty],
                  }}
                >
                  {problem.difficulty}
                </span>
              </div>
              <p className="text-sm font-bold text-white tracking-wide">
                {problem.title}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {problem.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="text-[8px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 tracking-widest"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <p className="text-[9px] text-zinc-600 tracking-widest uppercase mb-3">
              Change Difficulty
            </p>
            <div className="flex gap-2 justify-center">
              {(["Easy", "Medium", "Hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={async () => {
                    setDifficulty(d);
                    await fetchProblem(d);
                  }}
                  disabled={fetchingProblem}
                  className="px-4 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer border transition-all disabled:opacity-40"
                  style={{
                    background:
                      difficulty === d ? `${DIFF_COLOR[d]}15` : "transparent",
                    borderColor:
                      difficulty === d
                        ? `${DIFF_COLOR[d]}50`
                        : "rgba(255,255,255,0.08)",
                    color: difficulty === d ? DIFF_COLOR[d] : "#52525b",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 mb-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-7">
            <div className="flex flex-col items-center gap-3">
              <Avatar
                name={user?.username || user?.firstName || "?"}
                imageUrl={user?.imageUrl}
                size={56}
              />
              <span className="text-[10px] font-bold tracking-widest text-white uppercase">
                {user?.username || user?.firstName || "YOU"}
              </span>
            </div>
            <div
              className={`${orbitron.className} text-xl font-black text-zinc-700 tracking-widest`}
            >
              VS
            </div>
            <div className="flex flex-col items-center gap-3">
              <Avatar
                name={opponent.name}
                imageUrl={opponent.imageUrl}
                color="from-rose-500 to-rose-700"
                size={56}
              />
              <span className="text-[10px] font-bold tracking-widest text-white uppercase">
                {opponent.name}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-[9px] tracking-widest mb-7 text-zinc-600">
            <span>
              TIME:{" "}
              <span className="text-zinc-400">
                {fmt(problem?.timerSecs || 900)}
              </span>
            </span>
          </div>
          {errorMsg && (
            <p className="text-rose-400 text-[10px] tracking-wide mb-4">
              {errorMsg}
            </p>
          )}

          {opponentReady && !iAmReady && (
            <p className="text-amber-400 text-[10px] tracking-widest uppercase mb-3 animate-pulse">
              ⚡ Opponent is ready — waiting for you!
            </p>
          )}
          {iAmReady && !opponentReady && (
            <p className="text-zinc-500 text-[10px] tracking-widest uppercase mb-3 animate-pulse">
              ⏳ Waiting for opponent to ready up...
            </p>
          )}

          <button
            onClick={handleReady}
            disabled={!problem || fetchingProblem || iAmReady}
            className="w-full py-4 rounded-xl text-white font-mono text-[11px] font-bold uppercase tracking-widest border-0 cursor-pointer transition-all disabled:opacity-40"
            style={{
              background: iAmReady
                ? "rgba(74,222,128,0.2)"
                : "linear-gradient(135deg,#6366f1,#4f46e5)",
              boxShadow: iAmReady
                ? "0 0 0 1px rgba(74,222,128,0.4)"
                : "0 0 0 1px rgba(99,102,241,0.4), 0 12px 40px rgba(99,102,241,0.35)",
            }}
            onMouseEnter={(e) =>
              !fetchingProblem &&
              !iAmReady &&
              (e.currentTarget.style.transform = "translateY(-2px)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
          >
            {iAmReady ? "✓ READY — Waiting for opponent..." : "⚔ I'M READY"}
          </button>
        </div>
      </div>
    );

  if (phase === "countdown")
    return (
      <div className="min-h-screen bg-[#05060b] flex items-center justify-center">
        <style>{`@keyframes countPop{0%{transform:scale(0.4);opacity:0}60%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}`}</style>
        <div className="text-center">
          <p className="font-mono text-[10px] tracking-[0.3em] text-zinc-600 uppercase mb-6">
            Duel starting in
          </p>
          <div
            key={countdown}
            className={`${orbitron.className} font-black leading-none`}
            style={{
              fontSize: 180,
              color:
                countdown === 1
                  ? "#f87171"
                  : countdown === 2
                    ? "#fbbf24"
                    : "#4ade80",
              textShadow: `0 0 100px ${countdown === 1 ? "rgba(248,113,113,0.6)" : countdown === 2 ? "rgba(251,191,36,0.5)" : "rgba(74,222,128,0.5)"}`,
              animation: "countPop 0.45s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {countdown === 0 ? "GO" : countdown}
          </div>
        </div>
      </div>
    );

  if (phase === "won" || phase === "lost") {
    const won = phase === "won";
    return (
      <div className="min-h-screen bg-[#05060b] flex items-center justify-center font-mono">
        <style>{`@keyframes winPop{0%{transform:scale(0.85) translateY(20px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}`}</style>
        <div
          className="text-center max-w-lg px-8"
          style={{ animation: "winPop 0.55s cubic-bezier(0.34,1.56,0.64,1)" }}
        >
          <h1
            className={`${orbitron.className} text-6xl font-black uppercase tracking-tighter mb-3`}
            style={{
              color: won ? "#4ade80" : "#f87171",
              textShadow: `0 0 60px ${won ? "rgba(74,222,128,0.5)" : "rgba(248,113,113,0.4)"}`,
            }}
          >
            {won ? "VICTORY" : "DEFEATED"}
          </h1>

          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="flex flex-col items-center gap-2">
              <Avatar
                name={user?.username || "?"}
                imageUrl={user?.imageUrl}
                size={52}
              />
              <span className="text-[9px] text-zinc-600 tracking-widest uppercase">
                {user?.username || "YOU"}
              </span>
            </div>
            <span className={`${orbitron.className} text-lg text-zinc-700`}>
              VS
            </span>
            <div className="flex flex-col items-center gap-2">
              <Avatar
                name={opponent.name}
                imageUrl={opponent.imageUrl}
                color="from-rose-500 to-rose-700"
                size={52}
              />
              <span className="text-[9px] text-zinc-600 tracking-widest uppercase">
                {opponent.name}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-600 tracking-wide leading-loose mb-8">
            {won
              ? `All test cases passed. You outpaced ${opponent.name}.`
              : `${opponent.name} submitted first.`}
          </p>
          <div className="inline-flex items-center gap-8 bg-white/[0.02] border border-white/[0.05] rounded-2xl px-10 py-6 mb-8">
            <div className="text-center">
              <p className="text-[9px] text-zinc-600 tracking-widest uppercase mb-2">
                Before
              </p>
              <p
                className={`${orbitron.className} text-3xl font-black text-zinc-500`}
              >
                {oldRating}
              </p>
            </div>
            <ChevronRight size={20} className="text-zinc-700" />
            <div className="text-center">
              <p className="text-[9px] text-zinc-600 tracking-widest uppercase mb-2">
                After
              </p>
              <p
                className={`${orbitron.className} text-3xl font-black`}
                style={{ color: won ? "#4ade80" : "#f87171" }}
              >
                {oldRating + ratingChange}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-zinc-600 tracking-widest uppercase mb-2">
                Change
              </p>
              <p
                className={`${orbitron.className} text-3xl font-black`}
                style={{ color: won ? "#4ade80" : "#f87171" }}
              >
                {ratingChange > 0 ? "+" : ""}
                {ratingChange}
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/arena")}
              className="px-7 py-3 rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer border-0 text-white"
              style={{
                background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                boxShadow: "0 8px 24px rgba(99,102,241,0.3)",
              }}
            >
              <Zap size={12} className="inline mr-2" /> New Duel
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-7 py-3 rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer text-zinc-500"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              ← Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timerColor =
    timer < 60 ? "#f87171" : timer < 180 ? "#fbbf24" : "#4ade80";
  const diffColor = problem ? DIFF_COLOR[problem.difficulty] : "#4ade80";

  return (
    <div className="h-screen bg-[#05060b] flex flex-col overflow-hidden font-mono">
      <style>{`
        @keyframes slideBar{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
        @keyframes timerPulse{0%,100%{opacity:1}50%{opacity:0.4}}
        textarea{resize:none;outline:none;}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#09090b}
        ::-webkit-scrollbar-thumb{background:#27272a;border-radius:2px}
      `}</style>

      <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-black/40 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/arena"
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ArrowLeft size={14} />
          </Link>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <Avatar
              name={user?.username || "?"}
              imageUrl={user?.imageUrl}
              size={24}
            />
            <span className="text-[10px] font-bold tracking-widest text-white uppercase">
              {user?.username || "YOU"}
            </span>
          </div>
          <span className={`${orbitron.className} text-xs text-zinc-700`}>
            VS
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest text-zinc-300 uppercase">
              {opponent.name}
            </span>
            <Avatar
              name={opponent.name}
              imageUrl={opponent.imageUrl}
              color="from-rose-500 to-rose-700"
              size={24}
            />
          </div>
        </div>

        <div
          className={`${orbitron.className} text-xl font-black tracking-widest`}
          style={{
            color: timerColor,
            textShadow: `0 0 20px ${timerColor}50`,
            animation: timer < 60 ? "timerPulse 1s ease infinite" : "none",
          }}
        >
          {fmt(timer)}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] text-zinc-600 tracking-widest uppercase truncate max-w-[160px]">
            {problem?.title}
          </span>
          <span
            className="text-[9px] px-2 py-0.5 rounded flex-shrink-0"
            style={{
              background: `${diffColor}15`,
              border: `1px solid ${diffColor}30`,
              color: diffColor,
            }}
          >
            {problem?.difficulty.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex gap-px h-[3px] flex-shrink-0">
        <div className="flex-1 bg-zinc-900 relative overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${myProgress}%` }}
          />
        </div>
        <div className="flex-1 bg-zinc-900 relative overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-rose-500 transition-all duration-500"
            style={{ width: `${opponentProgress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[42%] border-r border-white/5 flex flex-col overflow-hidden">
          <div className="flex border-b border-white/5 px-4 flex-shrink-0">
            {(["problem", "constraints"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest cursor-pointer border-0 bg-transparent transition-colors"
                style={{
                  color: tab === t ? "#e4e4e7" : "#3f3f46",
                  borderBottom:
                    tab === t ? "2px solid #6366f1" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {t}
              </button>
            ))}
            {problem && (
              <a
                href={problem.leetcodeUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex items-center gap-1 text-[9px] text-zinc-700 hover:text-indigo-400 transition-colors tracking-widest uppercase self-center"
              >
                LC ↗
              </a>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {tab === "problem" && problem && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2
                    className={`${orbitron.className} text-base font-bold text-white`}
                  >
                    {problem.title}
                  </h2>
                  <span
                    className="text-[9px] px-2 py-0.5 rounded"
                    style={{
                      background: `${diffColor}15`,
                      border: `1px solid ${diffColor}30`,
                      color: diffColor,
                    }}
                  >
                    {problem.difficulty}
                  </span>
                </div>
                <p className="text-[12px] text-zinc-500 leading-loose tracking-wide whitespace-pre-line">
                  {problem.content}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {problem.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="text-[8px] px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-600 tracking-widest border border-zinc-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {tab === "constraints" && problem && (
              <div className="space-y-3">
                <p className="text-[10px] text-zinc-600 tracking-widest uppercase mb-4">
                  Example Test Cases
                </p>
                {problem.examples
                  .split("\n")
                  .filter((l) => l.trim())
                  .map((line, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                    >
                      <div className="w-1 h-1 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {line}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
                  <div
                    key={c}
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <span className="text-[9px] text-zinc-600 tracking-widest ml-2">
                solution.
                {language === "python"
                  ? "py"
                  : language === "javascript"
                    ? "js"
                    : language === "typescript"
                      ? "ts"
                      : language === "cpp"
                        ? "cpp"
                        : language === "c"
                          ? "c"
                          : language === "java"
                            ? "java"
                            : language === "go"
                              ? "go"
                              : "rs"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {opponentStatus === "submitted" && (
                <span className="text-[9px] text-rose-400 tracking-widest">
                  ✓ Opponent submitted!
                </span>
              )}
              <select
                value={language}
                onChange={(e) => {
                  const lang = e.target.value;
                  setLanguage(lang);
                  languageRef.current = lang;
                  setCode(getStarterCode(lang));
                }}
                className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] tracking-widest rounded px-2 py-1 cursor-pointer"
                style={{ fontFamily: "ui-monospace, monospace" }}
              >
                <option value="python">Python 3</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
                <option value="java">Java</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-[#1e1e1e] relative">
            {opponentLeft && (
              <div className="absolute inset-x-0 top-0 z-20 bg-rose-500/10 border-b border-rose-500/30 px-4 py-2 flex items-center gap-2">
                <span className="text-[10px] text-rose-400 font-mono tracking-widest uppercase animate-pulse">
                  ⚠ Opponent left the duel — You win!
                </span>
              </div>
            )}
            {winnerMsg && phase === "dueling" && (
              <div className="absolute inset-x-0 top-0 z-20 bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2 flex items-center gap-2">
                <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
                  {winnerMsg}
                </span>
              </div>
            )}
            <Editor
              height="100%"
              language={
                language === "cpp"
                  ? "cpp"
                  : language === "c"
                    ? "c"
                    : language === "python"
                      ? "python"
                      : language === "java"
                        ? "java"
                        : language === "go"
                          ? "go"
                          : language === "rust"
                            ? "rust"
                            : language === "typescript"
                              ? "typescript"
                              : "javascript"
              }
              value={code}
              onChange={(val) => {
                if (editorLocked) return;
                setCode(val || "");
                setMyProgress(
                  Math.min(
                    90,
                    ((val || "").length /
                      ((problem?.starterCode.length || 100) * 2)) *
                      100,
                  ),
                );
                setErrorMsg("");
              }}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily:
                  "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                glyphMargin: false,
                folding: false,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 3,
                renderLineHighlight: "line",
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                smoothScrolling: true,
                padding: { top: 12, bottom: 12 },
                scrollbar: {
                  verticalScrollbarSize: 4,
                  horizontalScrollbarSize: 4,
                },
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                overviewRulerBorder: false,
                readOnly: editorLocked,
              }}
            />
          </div>

          <div className="h-52 border-t border-white/5 flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold tracking-widest text-zinc-600 uppercase">
                  Test Cases
                </span>
                <span
                  className="text-[9px] font-bold"
                  style={{
                    color:
                      testResults.every((r) => r === "passed") &&
                      testResults.length > 0
                        ? "#4ade80"
                        : "#52525b",
                  }}
                >
                  {testResults.filter((r) => r === "passed").length}/
                  {testResults.length} Passed
                </span>
                {errorMsg && (
                  <span className="text-[9px] text-rose-400">{errorMsg}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    clearInterval(timerRef.current!);
                    clearInterval(opponentRef.current!);
                    const uid = localStorage.getItem("elonode_db_id");
                    if (uid && duelId) {
                      try {
                        await fetch(`${API_BASE}contests/${duelId}/finalize`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify([{ user_id: uid, rank: 2 }]),
                        });
                      } catch {}
                    }
                    router.push("/arena");
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest border cursor-pointer transition-all text-zinc-500 hover:text-rose-400 hover:border-rose-400/30"
                  style={{
                    background: "transparent",
                    borderColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  Leave
                </button>
                <button
                  onClick={submitSolution}
                  disabled={phase === "submitting"}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-white font-mono text-[10px] font-bold uppercase tracking-widest border-0 cursor-pointer transition-all disabled:opacity-50"
                  style={{
                    background:
                      phase === "submitting"
                        ? "rgba(99,102,241,0.3)"
                        : "linear-gradient(135deg,#6366f1,#4f46e5)",
                    boxShadow:
                      phase !== "submitting"
                        ? "0 4px 16px rgba(99,102,241,0.3)"
                        : "none",
                  }}
                >
                  <Zap size={12} />{" "}
                  {phase === "submitting" ? "Running..." : "Submit"}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {testResults.map((status, i) => {
                const colors: Record<TestStatus, string> = {
                  pending: "#27272a",
                  running: "#fbbf24",
                  passed: "#4ade80",
                  failed: "#f87171",
                };
                const labels: Record<TestStatus, string> = {
                  pending: "—",
                  running: "...",
                  passed: "✓",
                  failed: "✗",
                };
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
                    style={{
                      background: `${colors[status]}10`,
                      border: `1px solid ${colors[status]}25`,
                    }}
                  >
                    <span className="text-[9px] text-zinc-600 min-w-[52px]">
                      Test {i + 1}
                    </span>
                    <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                      {status === "running" && (
                        <div
                          className="h-full w-1/2 bg-amber-400 rounded-full"
                          style={{ animation: "slideBar 0.9s ease infinite" }}
                        />
                      )}
                      {status === "passed" && (
                        <div className="h-full w-full bg-emerald-400 rounded-full" />
                      )}
                      {status === "failed" && (
                        <div className="h-full w-2/5 bg-rose-400 rounded-full" />
                      )}
                    </div>
                    <span
                      className="text-xs font-bold min-w-[14px] text-center"
                      style={{ color: colors[status] }}
                    >
                      {labels[status]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DuelRoom() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DuelRoomInner />
    </Suspense>
  );
}
