"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Orbitron } from "next/font/google";
import Link from "next/link";
import Editor from "@monaco-editor/react";
import { ArrowLeft, Zap, ChevronRight, ChevronLeft } from "lucide-react";
import {
  DEFAULT_SNIPPETS,
  fetchJudge0Languages,
  getFallbackJudge0LanguageId,
  getLanguageExtension,
  getLanguageLabel,
  getMonacoLanguage,
  isWrapperSupported,
  resolveJudge0LanguageId,
  toWrapperLanguage,
  type Judge0Language,
  DIFF_COLOR,
  type Difficulty,
} from "@/lib/languages";
import { wrapCode } from "@/hooks/codeWrapper";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["700", "900"] });
const API = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/?$/, "/");
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  "wss://contest-rating-system.onrender.com/api/ws";

type Problem = { id: number; problem_slug: string; position: number };
type ScoreRow = {
  rank: number;
  team_id: string;
  team_name: string;
  team_number: number;
  solved: number;
  penalty: number;
};
type MyTeamData = {
  team: { id: string; team_name: string; team_number: number };
  member: { user_id: string; is_captain: boolean };
  problems: Problem[];
  contest: {
    id: string;
    name: string;
    duration_sec: number;
    started_at: string;
    finalized: boolean;
  };
  is_captain: boolean;
};

interface ProblemDetail {
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

interface BackendJudgeResult {
  ok: boolean;
  status: string;
  message: string;
  verdict?: string;
}

async function submitToBackendJudge(
  sourceCode: string,
  languageID: number,
  problemSlug: string,
  fallbackInput: string,
  action: "run" | "submit",
): Promise<BackendJudgeResult> {
  try {
    const res = await fetch(`${API}submit-judge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: sourceCode,
        language_id: languageID,
        problem_slug: problemSlug,
        action,
        fallback_input: fallbackInput,
      }),
    });
    const data = await res.json();
    if (!res.ok)
      return {
        ok: false,
        status: "Failed",
        message: data?.message || data?.error || "Judge failed",
      };
    return {
      ok: true,
      status: data.status || "Failed",
      message: data.message || "",
      verdict: data.verdict || "",
    };
  } catch {
    return {
      ok: false,
      status: "Failed",
      message: "Judge service unreachable",
    };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<pre>/gi, "\n")
    .replace(/<\/pre>/gi, "\n")
    .replace(/<strong>/gi, "")
    .replace(/<\/strong>/gi, "")
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

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function TeamDuelPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const contestID = params?.id as string;
  const myNodeId =
    typeof window !== "undefined"
      ? localStorage.getItem("elonode_db_id") || ""
      : "";

  const [myTeam, setMyTeam] = useState<MyTeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedProblemIdx, setSelectedProblemIdx] = useState(0);
  const [problemDetails, setProblemDetails] = useState<
    Record<string, ProblemDetail>
  >({});
  const [fetchingProblem, setFetchingProblem] = useState(false);

  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("cpp");
  const [judgeLanguages, setJudgeLanguages] = useState<Judge0Language[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState("");
  const [solvedProblems, setSolvedProblems] = useState<Set<string>>(new Set());

  const [timer, setTimer] = useState(0);
  const [scoreboard, setScoreboard] = useState<ScoreRow[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"problem" | "scoreboard">(
    "problem",
  );

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchJudge0Languages()
      .then(setJudgeLanguages)
      .catch(() => setJudgeLanguages([]));
  }, []);

  useEffect(() => {
    if (!myNodeId) return;
    fetch(`${API}team-contests/${contestID}/my-team?user_id=${myNodeId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setMyTeam(data);
        const started = new Date(data.contest.started_at).getTime();
        const duration = data.contest.duration_sec;
        const elapsed = Math.floor((Date.now() - started) / 1000);
        const remaining = Math.max(0, duration - elapsed);
        setTimer(remaining);
      })
      .catch(() => setError("Failed to load team info"))
      .finally(() => setLoading(false));
  }, [contestID, myNodeId]);

  useEffect(() => {
    if (!myTeam) return;
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [myTeam]);

  const loadScoreboard = useCallback(async () => {
    try {
      const res = await fetch(`${API}team-contests/${contestID}/scoreboard`);
      const data = await res.json();
      if (res.ok) setScoreboard(data.scoreboard || []);
    } catch {}
  }, [contestID]);

  useEffect(() => {
    loadScoreboard();
    const iv = setInterval(loadScoreboard, 5000);
    return () => clearInterval(iv);
  }, [loadScoreboard]);

  const connectWS = useCallback(() => {
    if (!myNodeId || !myTeam) return;
    const ws = new WebSocket(
      `${WS_URL}?user_id=${myNodeId}&user_name=${encodeURIComponent(user?.username || user?.firstName || "Player")}&tier=newbie&image_url=${encodeURIComponent(user?.imageUrl || "")}`,
    );
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "team_join",
          payload: JSON.stringify({
            contest_id: contestID,
            team_id: myTeam.team.id,
          }),
        }),
      );
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const payload =
          typeof msg.payload === "string"
            ? JSON.parse(msg.payload)
            : msg.payload;
        if (msg.type === "team_verdict" && payload.contest_id === contestID) {
          loadScoreboard();
          if (payload.verdict === "AC") {
            setSolvedProblems(
              (prev) => new Set([...prev, payload.problem_slug]),
            );
          }
        }
      } catch {}
    };
    ws.onclose = () => {
      reconnectRef.current = setTimeout(connectWS, 3000);
    };
  }, [myNodeId, myTeam, contestID, user, loadScoreboard]);

  useEffect(() => {
    if (!myTeam) return;
    connectWS();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [myTeam, connectWS]);

  const currentProblem = myTeam?.problems[selectedProblemIdx];

  const fetchProblemDetail = useCallback(
    async (slug: string) => {
      if (problemDetails[slug]) {
        const detail = problemDetails[slug];
        setCode(DEFAULT_SNIPPETS[language] || "");
        return;
      }
      setFetchingProblem(true);
      try {
        const allRes = await fetch(`https://leetcode.com/graphql`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `query($titleSlug:String!){question(titleSlug:$titleSlug){title titleSlug difficulty content exampleTestcases metaData codeSnippets{langSlug code} topicTags{name}}}`,
            variables: { titleSlug: slug },
          }),
        });
        if (allRes.ok) {
          const data = await allRes.json();
          const q = data?.data?.question;
          if (q) {
            const snippetMap: Record<string, string> = {};
            q.codeSnippets?.forEach((s: any) => {
              snippetMap[s.langSlug] = s.code;
            });
            const detail: ProblemDetail = {
              slug: q.titleSlug,
              title: q.title,
              difficulty: q.difficulty as Difficulty,
              content: stripHtml(q.content || ""),
              starterCode: snippetMap["java"] || snippetMap["cpp"] || "",
              examples: q.exampleTestcases || "",
              timerSecs: 1800,
              tags: q.topicTags?.map((t: any) => t.name) || [],
              leetcodeUrl: `https://leetcode.com/problems/${slug}/`,
              metaData: q.metaData || "",
            };
            setProblemDetails((prev) => ({ ...prev, [slug]: detail }));
            const starter =
              snippetMap[language] || DEFAULT_SNIPPETS[language] || "";
            setCode(starter);
          }
        }
      } catch {
      } finally {
        setFetchingProblem(false);
      }
    },
    [problemDetails, language, contestID],
  );

  useEffect(() => {
    if (currentProblem) fetchProblemDetail(currentProblem.problem_slug);
  }, [currentProblem?.problem_slug]);

  const handleSubmit = async (action: "run" | "submit") => {
    if (!currentProblem || submitting) return;
    setSubmitting(true);
    setRunResult("");
    const detail = problemDetails[currentProblem.problem_slug];
    const wrappedCode = detail
      ? wrapCode(
          code,
          toWrapperLanguage(language),
          detail.metaData,
          detail.examples,
        )
      : code;
    const langId =
      resolveJudge0LanguageId(language, judgeLanguages) ??
      getFallbackJudge0LanguageId(language);
    if (!langId) {
      setRunResult("Language not supported");
      setSubmitting(false);
      return;
    }

    const result = await submitToBackendJudge(
      wrappedCode,
      langId,
      currentProblem.problem_slug,
      detail?.examples || "",
      action,
    );

    if (action === "run") {
      setRunResult(
        result.ok && result.status === "Accepted"
          ? "✓ Run passed!"
          : `✗ ${result.message || result.verdict || "Failed"}`,
      );
    } else {
      if (result.ok && result.status === "Accepted") {
        setSolvedProblems(
          (prev) => new Set([...prev, currentProblem.problem_slug]),
        );
        wsRef.current?.send(
          JSON.stringify({
            type: "team_solved",
            payload: JSON.stringify({
              contest_id: contestID,
              team_id: myTeam?.team.id,
              problem_slug: currentProblem.problem_slug,
              verdict: "AC",
            }),
          }),
        );
        setRunResult("✓ Accepted! Problem solved.");
        loadScoreboard();
      } else {
        wsRef.current?.send(
          JSON.stringify({
            type: "team_solved",
            payload: JSON.stringify({
              contest_id: contestID,
              team_id: myTeam?.team.id,
              problem_slug: currentProblem.problem_slug,
              verdict: "WA",
            }),
          }),
        );
        setRunResult(`✗ ${result.message || result.verdict || "Wrong Answer"}`);
      }
    }
    setSubmitting(false);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05060b] font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest animate-pulse">
            Loading duel room...
          </span>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05060b] font-mono">
        <div className="text-center">
          <p className="text-rose-400 text-sm mb-4">{error}</p>
          <Link
            href="/arena"
            className="text-zinc-500 text-xs hover:text-white transition-colors"
          >
            ← Back to Arena
          </Link>
        </div>
      </div>
    );

  const timerColor =
    timer < 300 ? "#f87171" : timer < 600 ? "#fbbf24" : "#4ade80";
  const currentDetail = currentProblem
    ? problemDetails[currentProblem.problem_slug]
    : null;
  const diffColor = currentDetail
    ? DIFF_COLOR[currentDetail.difficulty]
    : "#4ade80";
  const teamColor = myTeam?.team.team_number === 1 ? "#818cf8" : "#f87171";

  return (
    <div className="h-screen bg-[#05060b] flex flex-col overflow-hidden font-mono">
      <style>{`
        @keyframes timerPulse{0%,100%{opacity:1}50%{opacity:0.4}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#09090b}
        ::-webkit-scrollbar-thumb{background:#27272a;border-radius:2px}
      `}</style>

      <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-black/40 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/team-contests/${contestID}`}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ArrowLeft size={14} />
          </Link>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: teamColor }}
            />
            <span
              className={`${orbitron.className} text-xs font-black uppercase`}
              style={{ color: teamColor }}
            >
              {myTeam?.team.team_name}
            </span>
          </div>
        </div>

        <div
          className={`${orbitron.className} text-xl font-black tracking-widest`}
          style={{
            color: timerColor,
            textShadow: `0 0 20px ${timerColor}50`,
            animation: timer < 300 ? "timerPulse 1s ease infinite" : "none",
          }}
        >
          {fmt(timer)}
        </div>

        <div className="flex items-center gap-2">
          {myTeam?.problems.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelectedProblemIdx(i)}
              className="text-[9px] px-2 py-1 rounded font-bold uppercase tracking-widest cursor-pointer border transition-all"
              style={{
                background: solvedProblems.has(p.problem_slug)
                  ? "rgba(74,222,128,0.15)"
                  : i === selectedProblemIdx
                    ? "rgba(99,102,241,0.15)"
                    : "transparent",
                borderColor: solvedProblems.has(p.problem_slug)
                  ? "rgba(74,222,128,0.4)"
                  : i === selectedProblemIdx
                    ? "rgba(99,102,241,0.4)"
                    : "rgba(255,255,255,0.06)",
                color: solvedProblems.has(p.problem_slug)
                  ? "#4ade80"
                  : i === selectedProblemIdx
                    ? "#818cf8"
                    : "#52525b",
              }}
            >
              {String.fromCharCode(65 + i)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {panelOpen && (
          <div className="w-[40%] border-r border-white/5 flex flex-col overflow-hidden">
            <div className="flex border-b border-white/5 px-4 flex-shrink-0">
              {(["problem", "scoreboard"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest cursor-pointer border-0 bg-transparent transition-colors"
                  style={{
                    color: activeTab === t ? "#e4e4e7" : "#3f3f46",
                    borderBottom:
                      activeTab === t
                        ? "2px solid #6366f1"
                        : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {t}
                </button>
              ))}
              <button
                onClick={() => setPanelOpen(false)}
                className="ml-auto text-zinc-700 hover:text-zinc-400 transition-colors cursor-pointer border-0 bg-transparent px-1 text-[10px]"
              >
                ◀
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === "problem" && (
                <div>
                  {fetchingProblem ? (
                    <div className="flex items-center gap-2 text-zinc-600 text-xs">
                      <div className="w-4 h-4 border border-zinc-700 border-t-transparent rounded-full animate-spin" />{" "}
                      Loading problem...
                    </div>
                  ) : currentDetail ? (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[9px] font-black text-cyan-400">
                          {String.fromCharCode(65 + selectedProblemIdx)}
                        </span>
                        <h2
                          className={`${orbitron.className} text-sm font-bold text-white`}
                        >
                          {currentDetail.title}
                        </h2>
                        <span
                          className="text-[9px] px-2 py-0.5 rounded"
                          style={{
                            background: `${diffColor}15`,
                            border: `1px solid ${diffColor}30`,
                            color: diffColor,
                          }}
                        >
                          {currentDetail.difficulty}
                        </span>
                        {solvedProblems.has(currentDetail.slug) && (
                          <span className="text-[9px] text-emerald-400 font-bold">
                            ✓ SOLVED
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-zinc-300 leading-7 whitespace-pre-line font-sans">
                        {currentDetail.content.split("\n").map((line, i) => {
                          if (
                            line.startsWith("Example") ||
                            line.startsWith("Input:") ||
                            line.startsWith("Output:") ||
                            line.startsWith("Explanation:")
                          )
                            return (
                              <p
                                key={i}
                                className="text-zinc-400 font-mono text-[11px] my-1"
                              >
                                {line}
                              </p>
                            );
                          if (
                            line.startsWith("Constraints:") ||
                            line.startsWith("Note:")
                          )
                            return (
                              <p
                                key={i}
                                className="text-indigo-400 font-mono text-[10px] uppercase tracking-widest mt-4 mb-1"
                              >
                                {line}
                              </p>
                            );
                          return (
                            <p key={i} className="text-zinc-300 mb-1">
                              {line}
                            </p>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {currentDetail.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="text-[8px] px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-400 tracking-widest border border-zinc-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-zinc-600 text-xs">
                      Select a problem above
                    </p>
                  )}
                </div>
              )}

              {activeTab === "scoreboard" && (
                <div>
                  <p className="text-[9px] text-zinc-600 tracking-widest uppercase mb-4">
                    Live Scoreboard
                  </p>
                  {scoreboard.map((r, i) => (
                    <div
                      key={r.team_id}
                      className="flex items-center justify-between p-3 rounded-lg mb-2 border"
                      style={{
                        background:
                          i === 0
                            ? "rgba(251,191,36,0.05)"
                            : "rgba(255,255,255,0.02)",
                        borderColor:
                          i === 0
                            ? "rgba(251,191,36,0.2)"
                            : "rgba(255,255,255,0.05)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`${orbitron.className} text-sm font-black`}
                          style={{ color: i === 0 ? "#fbbf24" : "#52525b" }}
                        >
                          0{r.rank}
                        </span>
                        <div>
                          <p className="text-[10px] font-bold text-white uppercase">
                            {r.team_name}
                          </p>
                          <p className="text-[8px] text-zinc-600">
                            Team #{r.team_number}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-indigo-400">
                          {r.solved} solved
                        </p>
                        <p className="text-[9px] text-rose-400">
                          {r.penalty} min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!panelOpen && (
          <div className="flex flex-col border-r border-white/5 flex-shrink-0">
            <button
              onClick={() => setPanelOpen(true)}
              className="flex flex-col items-center gap-2 px-2 py-4 text-zinc-700 hover:text-zinc-400 transition-colors cursor-pointer border-0 bg-transparent h-full justify-start pt-4"
            >
              <span className="text-[10px] font-mono">▶</span>
              <span
                className="text-[8px] font-mono tracking-widest uppercase"
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
                solution.{getLanguageExtension(language)}
              </span>
            </div>
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                const detail = currentDetail;
                setCode(DEFAULT_SNIPPETS[e.target.value] || "");
              }}
              className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] tracking-widest rounded px-2 py-1 cursor-pointer"
              style={{ fontFamily: "ui-monospace, monospace" }}
            >
              {[
                "cpp",
                "python3",
                "java",
                "javascript",
                "typescript",
                "golang",
                "rust",
              ].map((slug) => (
                <option key={slug} value={slug}>
                  {getLanguageLabel(slug)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
            <Editor
              height="100%"
              language={getMonacoLanguage(language)}
              value={code}
              onChange={(val) => setCode(val || "")}
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
              }}
            />
          </div>

          <div className="border-t border-white/5 px-4 py-3 flex items-center justify-between flex-shrink-0 bg-black/20">
            <div className="flex items-center gap-3">
              {runResult && (
                <span
                  className="text-[10px] font-mono"
                  style={{
                    color: runResult.startsWith("✓") ? "#4ade80" : "#f87171",
                  }}
                >
                  {runResult}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSubmit("run")}
                disabled={submitting || !currentProblem}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-white font-mono text-[10px] font-bold uppercase tracking-widest border border-indigo-500/30 cursor-pointer transition-all disabled:opacity-50 hover:bg-indigo-500/10 bg-transparent"
              >
                ▶ Run
              </button>
              <button
                onClick={() => handleSubmit("submit")}
                disabled={
                  submitting ||
                  !currentProblem ||
                  solvedProblems.has(currentProblem?.problem_slug || "")
                }
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-white font-mono text-[10px] font-bold uppercase tracking-widest border-0 cursor-pointer transition-all disabled:opacity-50"
                style={{
                  background: submitting
                    ? "rgba(99,102,241,0.3)"
                    : "linear-gradient(135deg,#6366f1,#4f46e5)",
                  boxShadow: submitting
                    ? "none"
                    : "0 4px 16px rgba(99,102,241,0.3)",
                }}
              >
                <Zap size={12} />{" "}
                {submitting
                  ? "Processing..."
                  : solvedProblems.has(currentProblem?.problem_slug || "")
                    ? "Solved ✓"
                    : "Submit"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
