export const LANGUAGE_IDS: Record<string, number> = {
  c: 50,
  cpp: 54,
  csharp: 51,
  java: 62,
  javascript: 63,
  typescript: 74,
  python3: 71,
  php: 68,
  ruby: 72,
  rust: 73,
  golang: 60,
  kotlin: 78,
};

type LangMeta = {
  label: string;
  monaco: string;
  extension: string;
  wrapperLang?: string;
};

export const LANGUAGE_META: Record<string, LangMeta> = {
  c: { label: "C", monaco: "c", extension: "c" },
  cpp: { label: "C++", monaco: "cpp", extension: "cpp", wrapperLang: "cpp" },
  csharp: { label: "C#", monaco: "csharp", extension: "cs" },
  java: { label: "Java", monaco: "java", extension: "java" },
  javascript: {
    label: "JavaScript",
    monaco: "javascript",
    extension: "js",
    wrapperLang: "javascript",
  },
  typescript: {
    label: "TypeScript",
    monaco: "typescript",
    extension: "ts",
    wrapperLang: "typescript",
  },
  python: { label: "Python", monaco: "python", extension: "py", wrapperLang: "python" },
  python3: { label: "Python 3", monaco: "python", extension: "py", wrapperLang: "python" },
  php: { label: "PHP", monaco: "php", extension: "php" },
  ruby: { label: "Ruby", monaco: "ruby", extension: "rb" },
  rust: { label: "Rust", monaco: "rust", extension: "rs" },
  golang: { label: "Go", monaco: "go", extension: "go" },
  kotlin: { label: "Kotlin", monaco: "kotlin", extension: "kt" },
  swift: { label: "Swift", monaco: "swift", extension: "swift" },
  scala: { label: "Scala", monaco: "scala", extension: "scala" },
  dart: { label: "Dart", monaco: "dart", extension: "dart" },
};

export const DEFAULT_SNIPPETS: Record<string, string> = {
  python3: `class Solution:\n    def solve(self, nums: list[int]) -> int:\n        pass\n`,
  javascript: `/**\n * @param {number[]} nums\n * @return {number}\n */\nvar solve = function(nums) {\n    \n};\n`,
  typescript: `function solve(nums: number[]): number {\n    \n};\n`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(vector<int>& nums) {\n        \n    }\n};\n`,
  c: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint solve(int* nums, int numsSize) {\n    \n}\n\nint main() {\n    return 0;\n}\n`,
  java: `class Solution {\n    public int solve(int[] nums) {\n        \n    }\n}\n`,
  golang: `package main\n\nimport "fmt"\n\nfunc solve(nums []int) int {\n    \n}\n\nfunc main() {\n    fmt.Println(solve([]int{}))\n}\n`,
  rust: `impl Solution {\n    pub fn solve(nums: Vec<i32>) -> i32 {\n        \n    }\n}\n`,
};

export function getLanguageLabel(slug: string): string {
  return LANGUAGE_META[slug]?.label || slug;
}

export function getMonacoLanguage(slug: string): string {
  return LANGUAGE_META[slug]?.monaco || "plaintext";
}

export function getLanguageExtension(slug: string): string {
  return LANGUAGE_META[slug]?.extension || "txt";
}

export function toWrapperLanguage(slug: string): string {
  return LANGUAGE_META[slug]?.wrapperLang || slug;
}

export function isJudgeSupported(slug: string): boolean {
  return typeof LANGUAGE_IDS[slug] === "number";
}

const WRAPPER_SUPPORTED_SLUGS = new Set([
  "python",
  "python3",
  "javascript",
  "typescript",
  "cpp",
  "java",
  "golang",
  "rust",
]);

export function isWrapperSupported(slug: string): boolean {
  return WRAPPER_SUPPORTED_SLUGS.has(slug);
}

export type Judge0Language = {
  id: number;
  name: string;
};

const LC_TO_JUDGE_ALIASES: Record<string, string[]> = {
  c: ["c (", "gnu c", "c11", "c99"],
  cpp: ["c++", "cpp", "gcc", "clang++"],
  csharp: ["c#", "csharp", "mono"],
  java: ["java"],
  javascript: ["javascript", "node.js", "nodejs"],
  typescript: ["typescript"],
  python: ["python 3", "python3", "python (3"],
  python3: ["python 3", "python3", "python (3"],
  php: ["php"],
  ruby: ["ruby"],
  rust: ["rust"],
  golang: ["golang", "go "],
  kotlin: ["kotlin"],
  swift: ["swift"],
  scala: ["scala"],
  dart: ["dart"],
};

export async function fetchJudge0Languages(
  judge0BaseUrl = process.env.NEXT_PUBLIC_JUDGE0_URL || "https://ce.judge0.com",
): Promise<Judge0Language[]> {
  const base = judge0BaseUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}/languages`);
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{ id: number; name: string }>;
  return data
    .filter((l) => typeof l?.id === "number" && typeof l?.name === "string")
    .map((l) => ({ id: l.id, name: l.name }));
}

export function getFallbackJudge0LanguageId(slug: string): number | undefined {
  return LANGUAGE_IDS[slug];
}

export function resolveJudge0LanguageId(
  lcSlug: string,
  judgeLanguages: Judge0Language[],
): number | undefined {
  if (!judgeLanguages.length) return undefined;

  const aliases = LC_TO_JUDGE_ALIASES[lcSlug] || [lcSlug];
  const lowerAliases = aliases.map((a) => a.toLowerCase());

  for (const lang of judgeLanguages) {
    const name = lang.name.toLowerCase();
    if (lowerAliases.some((alias) => name.includes(alias))) {
      return lang.id;
    }
  }
  return undefined;
}

export type Difficulty = "Easy" | "Medium" | "Hard";
export const DIFF_COLOR: Record<Difficulty, string> = {
  Easy: "#4ade80",
  Medium: "#fbbf24",
  Hard: "#f87171",
};
