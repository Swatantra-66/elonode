"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Orbitron } from "next/font/google";
import { ArrowLeft, ChevronRight, Zap } from "lucide-react";
import Editor from "@monaco-editor/react";
import Link from "next/link";
import { useWebSocket } from "@/hooks/useWebSocket";
import { wrapCode } from "@/hooks/codeWrapper";

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
type ProblemMode = "same" | "random";

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
  metaData: string;
}

interface OpponentInfo {
  name: string;
  imageUrl: string;
  id: string;
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

const DEFAULT_SNIPPETS: Record<string, string> = {
  python3: `class Solution:
    def solve(self, nums: list[int]) -> int:
        pass
`,
  javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
var solve = function(nums) {
    
};
`,
  typescript: `function solve(nums: number[]): number {
    
};
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int solve(vector<int>& nums) {
        
    }
};
`,
  c: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int solve(int* nums, int numsSize) {
    
}

int main() {
    return 0;
}
`,
  java: `class Solution {
    public int solve(int[] nums) {
        
    }
}
`,
  golang: `package main

import "fmt"

func solve(nums []int) int {
    
}

func main() {
    fmt.Println(solve([]int{}))
}
`,
  rust: `impl Solution {
    pub fn solve(nums: Vec<i32>) -> i32 {
        
    }
}
`,
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

async function finalizeContest(
  duelId: string,
  winnerId: string,
  loserId: string,
  apiBase: string,
) {
  try {
    await fetch(`${apiBase}contests/${duelId}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        { user_id: winnerId, rank: 1 },
        { user_id: loserId, rank: 2 },
      ]),
    });
  } catch {}
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
  const [problemMode, setProblemMode] = useState<ProblemMode>("same");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [timer, setTimer] = useState(900);
  const [countdown, setCountdown] = useState(3);
  const [tab, setTab] = useState<"problem" | "constraints">("problem");
  const [testResults, setTestResults] = useState<TestStatus[]>([]);
  const [opponent, setOpponent] = useState<OpponentInfo>({
    name: "OPPONENT",
    imageUrl: "",
    id: "",
  });
  const [opponentStatus, setOpponentStatus] = useState<"waiting" | "submitted">(
    "waiting",
  );
  const [myProgress, setMyProgress] = useState(0);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [ratingChange, setRatingChange] = useState(0);
  const [oldRating, setOldRating] = useState(1000);
  const [errorMsg, setErrorMsg] = useState("");
  const [fetchingProblem, setFetchingProblem] = useState(false);
  const [iAmReady, setIAmReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [editorLocked, setEditorLocked] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [problemPanelOpen, setProblemPanelOpen] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const opponentRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snippetsRef = useRef<Record<string, string>>({});
  const languageRef = useRef<string>("python");
  const myNodeId =
    typeof window !== "undefined"
      ? localStorage.getItem("elonode_db_id") || ""
      : "";

  const getStarterCode = useCallback((lang: string): string => {
    const lcSlug = LC_LANG_MAP[lang] || "python3";
    return snippetsRef.current[lcSlug] || DEFAULT_SNIPPETS[lcSlug] || "";
  }, []);

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
      onOpponentLeft: (payload) => {
        if (payload.contest_id !== duelId) return;
        clearInterval(timerRef.current!);
        clearInterval(opponentRef.current!);
        setEditorLocked(true);
        setResultMsg("Opponent left — You win!");
        setPhase("won");
        finalizeContest(duelId, myNodeId, payload.user_id, API_BASE);
      },
      onOpponentWon: (payload) => {
        if (payload.contest_id !== duelId) return;
        clearInterval(timerRef.current!);
        clearInterval(opponentRef.current!);
        setOpponentStatus("submitted");
        setEditorLocked(true);
        setResultMsg("Opponent solved it first.");
        setTimeout(() => setPhase("lost"), 1500);
      },
    },
  });

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
        if (!snippetMap["python3"] && data.starter_code)
          snippetMap["python3"] = data.starter_code;
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
          metaData: data.meta_data || "",
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
      const urlDifficulty = (searchParams.get("difficulty") ||
        "Easy") as Difficulty;
      const urlMode = (searchParams.get("mode") || "same") as ProblemMode;

      setDifficulty(urlDifficulty);
      setProblemMode(urlMode);

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
      setOpponent({
        name: opponentName,
        imageUrl: opponentImageUrl,
        id: opponentId,
      });

      await fetchProblem(
        urlDifficulty,
        urlMode === "same" ? duelId : undefined,
      );

      try {
        const uid = localStorage.getItem("elonode_db_id");
        if (uid) {
          const res = await fetch(`${API_BASE}users/${uid}`);
          if (res.ok) {
            const u = await res.json();
            setOldRating(u.current_rating || 1000);
          }
        }
      } catch {}

      const savedRaw = localStorage.getItem("elonode_active_contest");
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw);
          if (
            saved.contestId === duelId &&
            saved.phase === "dueling" &&
            Date.now() - saved.timestamp < 10 * 60 * 1000
          ) {
            setPhase("dueling");
            const remaining = Math.max(
              0,
              (saved.timerSecs || 900) -
                Math.floor((Date.now() - saved.timestamp) / 1000),
            );
            setTimer(remaining);
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
            return;
          }
        } catch {}
      }

      setPhase("waiting");
    };
    init();
  }, [duelId, fetchProblem, searchParams]);

  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  useEffect(() => {
    if (phase === "dueling" || phase === "waiting" || phase === "countdown") {
      const url = window.location.href;
      localStorage.setItem(
        "elonode_active_contest",
        JSON.stringify({
          contestId: duelId,
          opponent: opponent.name,
          opponentId: opponent.id,
          difficulty,
          mode: problemMode,
          url,
          phase,
          timerSecs: timer,
          timestamp: Date.now(),
        }),
      );
    }
    if (phase === "won" || phase === "lost") {
      localStorage.removeItem("elonode_active_contest");
    }
  }, [phase, duelId, opponent, difficulty, problemMode]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (phase === "dueling" || phase === "waiting" || phase === "countdown") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [phase]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (opponentRef.current) clearInterval(opponentRef.current);
    },
    [],
  );

  const handleLeave = useCallback(async () => {
    clearInterval(timerRef.current!);
    clearInterval(opponentRef.current!);
    if (wsConnected && opponent.id) {
      wsSend("leave", {
        contest_id: duelId,
        user_id: myNodeId,
        to_id: opponent.id,
      });
    }
    await finalizeContest(duelId, opponent.id, myNodeId, API_BASE);
    router.push("/arena");
  }, [duelId, myNodeId, opponent.id, wsConnected, wsSend, router]);

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
      const result = await runCode(
        wrapCode(code, language, problem.metaData, problem.examples),
        language,
        "",
      );
      const passed = result.stderr === "" && result.status === "Accepted";
      setTestResults([passed ? "passed" : "failed"]);
      if (passed) {
        setEditorLocked(true);
        wsSend("won", { contest_id: duelId, to_id: opponent.id });
        await finalizeContest(duelId, myNodeId, opponent.id, API_BASE);
        const uid = localStorage.getItem("elonode_db_id");
        if (uid) {
          try {
            const res = await fetch(`${API_BASE}users/${uid}`);
            if (res.ok) {
              const u = await res.json();
              setRatingChange(u.current_rating - oldRating);
            }
          } catch {}
        }
        setPhase("won");
      } else {
        setPhase("lost");
      }
      return;
    }

    const results: TestStatus[] = Array(exampleInputs.length).fill("pending");
    setTestResults([...results]);
    let allPassed = true;

    for (let i = 0; i < exampleInputs.length; i++) {
      results[i] = "running";
      setTestResults([...results]);
      const { stdout, stderr, status } = await runCode(
        wrapCode(code, language, problem.metaData, problem.examples),
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

    setEditorLocked(true);
    wsSend("won", { contest_id: duelId, to_id: opponent.id });
    await finalizeContest(duelId, myNodeId, opponent.id, API_BASE);

    try {
      const uid = localStorage.getItem("elonode_db_id");
      if (uid) {
        const res = await fetch(`${API_BASE}users/${uid}`);
        if (res.ok) {
          const u = await res.json();
          setRatingChange(u.current_rating - oldRating);
        } else setRatingChange(72);
      }
    } catch {
      setRatingChange(72);
    }

    setPhase("won");
  }, [
    phase,
    problem,
    code,
    language,
    opponentStatus,
    oldRating,
    duelId,
    myNodeId,
    opponent.id,
    wsSend,
  ]);

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
      <div className="min-h-screen bg-[#05060b] font-mono overflow-auto">
        <style>{`@keyframes pulseGlow{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

        <div className="h-12 border-b border-white/5 flex items-center justify-between px-6 bg-black/40">
          <Link
            href="/arena"
            className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-400 transition-colors text-[10px] tracking-widest uppercase"
          >
            <ArrowLeft size={12} /> Return to Arena
          </Link>
          <p
            className="text-[10px] tracking-[0.3em] text-zinc-600 uppercase"
            style={{ animation: "pulseGlow 2s ease infinite" }}
          >
            ● Duel Room Active
          </p>
          <h1
            className={`${orbitron.className} text-xl font-black text-white uppercase tracking-tighter`}
          >
            DUEL <span className="text-indigo-500">ROOM</span>
          </h1>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-3 gap-6">
          <div className="col-span-1 flex flex-col gap-4">
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-5">
              <p className="text-[9px] text-zinc-600 tracking-widest uppercase mb-4">
                Players
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col items-center gap-2 flex-1">
                  <Avatar
                    name={user?.username || user?.firstName || "?"}
                    imageUrl={user?.imageUrl}
                    size={52}
                  />
                  <span className="text-[10px] font-bold tracking-widest text-white uppercase text-center">
                    {user?.username || user?.firstName || "YOU"}
                  </span>
                </div>
                <div
                  className={`${orbitron.className} text-lg font-black text-zinc-700`}
                >
                  VS
                </div>
                <div className="flex flex-col items-center gap-2 flex-1">
                  <Avatar
                    name={opponent.name}
                    imageUrl={opponent.imageUrl}
                    color="from-rose-500 to-rose-700"
                    size={52}
                  />
                  <span className="text-[10px] font-bold tracking-widest text-white uppercase text-center">
                    {opponent.name}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-5">
              <p className="text-[9px] text-zinc-600 tracking-widest uppercase mb-3">
                Timer
              </p>
              <p
                className={`${orbitron.className} text-3xl font-black text-white`}
              >
                {fmt(problem?.timerSecs || 900)}
              </p>
            </div>

            {errorMsg && (
              <p className="text-rose-400 text-[10px] tracking-wide">
                {errorMsg}
              </p>
            )}

            <div className="mt-auto">
              {opponentReady && !iAmReady && (
                <p className="text-amber-400 text-[10px] tracking-widest uppercase mb-3 animate-pulse">
                  ⚡ Opponent is ready!
                </p>
              )}
              {iAmReady && !opponentReady && (
                <p className="text-zinc-500 text-[10px] tracking-widest uppercase mb-3 animate-pulse">
                  ⏳ Waiting for opponent...
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

          <div className="col-span-2 flex flex-col gap-4">
            {problem && (
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] text-zinc-600 tracking-widest uppercase">
                    Problem
                  </p>
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
                <p className="text-base font-bold text-white tracking-wide mb-2">
                  {problem.title}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {problem.tags.slice(0, 5).map((tag) => (
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

            <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-5">
              <p className="text-[9px] text-zinc-600 tracking-widest uppercase mb-4">
                Problem Mode
              </p>
              <div className="flex gap-3 mb-5">
                {(["same", "random"] as ProblemMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setProblemMode(m);
                      fetchProblem(
                        difficulty,
                        m === "same" ? duelId : undefined,
                      );
                    }}
                    className="flex-1 py-2.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer border transition-all"
                    style={{
                      background:
                        problemMode === m
                          ? "rgba(99,102,241,0.15)"
                          : "transparent",
                      borderColor:
                        problemMode === m
                          ? "rgba(99,102,241,0.5)"
                          : "rgba(255,255,255,0.08)",
                      color: problemMode === m ? "#818cf8" : "#52525b",
                    }}
                  >
                    {m === "same" ? "⚔ Same Problem" : "🎲 Random Problem"}
                  </button>
                ))}
              </div>

              <p className="text-[9px] text-zinc-600 tracking-widest uppercase mb-3">
                Difficulty
              </p>
              <div className="flex gap-3">
                {(["Easy", "Medium", "Hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={async () => {
                      setDifficulty(d);
                      await fetchProblem(
                        d,
                        problemMode === "same" ? duelId : undefined,
                      );
                    }}
                    disabled={fetchingProblem}
                    className="flex-1 py-2.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer border transition-all disabled:opacity-40"
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
          </div>
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
      <div className="min-h-screen bg-[#05060b] flex items-center justify-center font-mono overflow-hidden relative">
        <style>{`
          @keyframes winPop{0%{transform:scale(0.85) translateY(20px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}
          @keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}
          @keyframes burst{0%{transform:scale(0);opacity:1}100%{transform:scale(1);opacity:0}}
        `}</style>

        {won && (
          <>
            {[...Array(60)].map((_, i) => {
              const colors = [
                "#4ade80",
                "#fbbf24",
                "#818cf8",
                "#f87171",
                "#22d3ee",
                "#fb923c",
                "#34d399",
                "#e879f9",
              ];
              const color = colors[i % colors.length];
              const left = `${Math.random() * 100}%`;
              const delay = `${Math.random() * 3}s`;
              const dur = `${2.5 + Math.random() * 2}s`;
              const size = `${6 + Math.random() * 8}px`;
              const shape = i % 3 === 0 ? "50%" : i % 3 === 1 ? "0%" : "2px";
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: "-20px",
                    left,
                    width: size,
                    height: size,
                    background: color,
                    borderRadius: shape,
                    animation: `confettiFall ${dur} ${delay} ease-in forwards`,
                    zIndex: 0,
                  }}
                />
              );
            })}
            {[...Array(8)].map((_, i) => {
              const colors = [
                "#4ade80",
                "#fbbf24",
                "#818cf8",
                "#f87171",
                "#22d3ee",
              ];
              const color = colors[i % colors.length];
              const positions = [
                { top: "10%", left: "5%" },
                { top: "20%", left: "90%" },
                { top: "5%", left: "50%" },
                { top: "30%", left: "15%" },
                { top: "15%", left: "75%" },
                { top: "40%", left: "40%" },
                { top: "8%", left: "30%" },
                { top: "25%", left: "60%" },
              ];
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    ...positions[i],
                    width: 80,
                    height: 80,
                    zIndex: 0,
                    animation: `burst 0.8s ${i * 0.15}s ease-out forwards`,
                    background: `radial-gradient(circle, ${color}60 0%, transparent 70%)`,
                    borderRadius: "50%",
                  }}
                />
              );
            })}
          </>
        )}

        <div
          className="text-center max-w-lg px-8 relative z-10"
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

          {resultMsg && (
            <p
              className="text-[10px] tracking-widest uppercase mb-4"
              style={{ color: won ? "#4ade80" : "#f87171" }}
            >
              {resultMsg}
            </p>
          )}

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
        @keyframes modalIn{0%{transform:scale(0.92);opacity:0}100%{transform:scale(1);opacity:1}}
        textarea{resize:none;outline:none;}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#09090b}
        ::-webkit-scrollbar-thumb{background:#27272a;border-radius:2px}
      `}</style>

      {showLeaveWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            className="bg-[#0f1015] border border-amber-500/30 rounded-2xl p-8 max-w-sm w-full mx-4 text-center font-mono"
            style={{ animation: "modalIn 0.25s ease-out" }}
          >
            <div className="text-3xl mb-4">⚠️</div>
            <h3
              className={`${orbitron.className} text-lg font-black text-white uppercase tracking-tight mb-2`}
            >
              Leave Duel?
            </h3>
            <p className="text-zinc-500 text-[11px] leading-relaxed mb-2">
              You can rejoin within{" "}
              <span className="text-amber-400 font-bold">10 minutes</span> from
              the sidebar.
            </p>
            <p className="text-zinc-600 text-[10px] leading-relaxed mb-6">
              Your opponent's contest will continue. Come back before time runs
              out!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveWarning(false)}
                className="flex-1 py-3 rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer border border-indigo-500/30 text-indigo-400 hover:border-indigo-500/60 transition-all bg-transparent"
              >
                Stay in Duel
              </button>
              <button
                onClick={() => {
                  setShowLeaveWarning(false);
                  localStorage.setItem(
                    "elonode_active_contest",
                    JSON.stringify({
                      contestId: duelId,
                      opponent: opponent.name,
                      opponentId: opponent.id,
                      difficulty,
                      mode: problemMode,
                      url: window.location.href,
                      phase: "dueling",
                      timerSecs: timer,
                      timestamp: Date.now(),
                    }),
                  );
                  router.push("/arena");
                }}
                className="flex-1 py-3 rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer border border-amber-500/30 text-amber-400 hover:border-amber-500/60 transition-all bg-transparent"
              >
                Leave (Rejoin Later)
              </button>
            </div>
          </div>
        </div>
      )}

      {showForfeitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            className="bg-[#0f1015] border border-rose-500/30 rounded-2xl p-8 max-w-sm w-full mx-4 text-center font-mono"
            style={{ animation: "modalIn 0.25s ease-out" }}
          >
            <div className="text-3xl mb-4">💀</div>
            <h3
              className={`${orbitron.className} text-lg font-black text-white uppercase tracking-tight mb-2`}
            >
              Forfeit?
            </h3>
            <p className="text-zinc-500 text-[11px] leading-relaxed mb-6">
              Your opponent will win immediately and ratings will update. This
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowForfeitConfirm(false)}
                className="flex-1 py-3 rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all bg-transparent"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowForfeitConfirm(false);
                  localStorage.removeItem("elonode_active_contest");
                  await handleLeave();
                }}
                className="flex-1 py-3 rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer border-0 text-white transition-all"
                style={{
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                  boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
                }}
              >
                Yes, Forfeit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-black/40 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/arena"
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
            onClick={(e) => {
              if (phase === "dueling") {
                e.preventDefault();
                setShowLeaveWarning(true);
              }
            }}
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
        {problemPanelOpen && (
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
              <div className="ml-auto flex items-center gap-3 self-center">
                {problem && (
                  <a
                    href={problem.leetcodeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[9px] text-zinc-700 hover:text-indigo-400 transition-colors tracking-widest uppercase"
                  >
                    LC ↗
                  </a>
                )}
                <button
                  onClick={() => setProblemPanelOpen(false)}
                  className="text-zinc-700 hover:text-zinc-400 transition-colors text-[10px] font-mono tracking-widest cursor-pointer border-0 bg-transparent px-1"
                  title="Collapse panel"
                >
                  ◀
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {tab === "problem" && problem && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
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
                  <div
                    className="text-[12.5px] text-zinc-300 leading-7 tracking-wide whitespace-pre-line font-sans"
                    style={{ lineHeight: "1.85", letterSpacing: "0.01em" }}
                  >
                    {problem.content.split("\n").map((line, i) => {
                      if (
                        line.startsWith("Example") ||
                        line.startsWith("Input:") ||
                        line.startsWith("Output:") ||
                        line.startsWith("Explanation:")
                      ) {
                        return (
                          <p
                            key={i}
                            className="text-zinc-400 font-mono text-[11px] my-1"
                          >
                            {line}
                          </p>
                        );
                      }
                      if (
                        line.startsWith("Constraints:") ||
                        line.startsWith("Note:") ||
                        line.startsWith("Follow up")
                      ) {
                        return (
                          <p
                            key={i}
                            className="text-indigo-400 font-mono text-[10px] uppercase tracking-widest mt-4 mb-1"
                          >
                            {line}
                          </p>
                        );
                      }
                      return (
                        <p key={i} className="text-zinc-300 mb-2">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-5">
                    {problem.tags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="text-[8px] px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-400 tracking-widest border border-zinc-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {tab === "constraints" && problem && (
                <div className="space-y-3">
                  <p className="text-[10px] text-zinc-500 tracking-widest uppercase mb-4 font-mono">
                    Example Test Cases
                  </p>
                  {problem.examples
                    .split("\n")
                    .filter((l) => l.trim())
                    .map((line, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.07]"
                      >
                        <div className="w-1 h-1 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                        <span className="text-[11px] text-zinc-300 font-mono">
                          {line}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!problemPanelOpen && (
          <div className="flex flex-col border-r border-white/5 flex-shrink-0">
            <button
              onClick={() => setProblemPanelOpen(true)}
              className="flex flex-col items-center gap-2 px-2 py-4 text-zinc-700 hover:text-zinc-400 transition-colors cursor-pointer border-0 bg-transparent h-full justify-start pt-4"
              title="Expand panel"
            >
              <span className="text-[10px] font-mono">▶</span>
              <span
                className="text-[8px] font-mono tracking-widest uppercase writing-mode-vertical"
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  letterSpacing: "0.2em",
                }}
              >
                Problem
              </span>
            </button>
          </div>
        )}

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
            {resultMsg && (phase === "dueling" || phase === "submitting") && (
              <div
                className="absolute inset-x-0 top-0 z-20 px-4 py-2 flex items-center gap-2"
                style={{
                  background: editorLocked
                    ? "rgba(74,222,128,0.08)"
                    : "rgba(248,113,113,0.08)",
                  borderBottom: `1px solid ${editorLocked ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
                }}
              >
                <span
                  className="text-[10px] font-mono tracking-widest uppercase animate-pulse"
                  style={{ color: editorLocked ? "#4ade80" : "#f87171" }}
                >
                  {resultMsg}
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
                  onClick={() => setShowForfeitConfirm(true)}
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
                  disabled={phase === "submitting" || editorLocked}
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
