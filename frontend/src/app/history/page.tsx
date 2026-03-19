"use client";

import { useEffect, useState } from "react";
import { Orbitron } from "next/font/google";
import { ArrowRight } from "lucide-react";

const futuristicFont = Orbitron({
  subsets: ["latin"],
  weight: ["700"],
});

interface RatingRecord {
  created_at: string;
  user_id: string;
  contest_id: string;
  rank: number;
  total_participants: number;
  old_rating: number;
  new_rating: number;
  rating_change: number;
  performance_rating: number;
  percentile: number | string;
}

interface DetailData {
  id: string;
  name?: string;
  username?: string;
}

export default function GlobalHistoryPage() {
  const [history, setHistory] = useState<RatingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeDetail, setActiveDetail] = useState<{
    type: "user" | "contest";
    id: string;
  } | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    // fetch("http://localhost:8080/api/history");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}history`)
      .then((res) => res.json())
      .then((data) => {
        setHistory(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch history:", err);
        setLoading(false);
      });
  }, []);

  const fetchDetail = async (type: "user" | "contest", id: string) => {
    setDetailLoading(true);
    setActiveDetail({ type, id });
    try {
      // const res = await fetch(`http://localhost:8080/api/${type}s/${id}`);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${type}s/${id}`,
      );
      const data = await res.json();
      setDetailData(data);
    } catch (err) {
      console.error(`Failed to fetch ${type} details:`, err);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-500 flex items-center justify-center font-mono text-xs tracking-widest uppercase animate-pulse">
        Querying Rating Logs...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative">
      {" "}
      <div className="w-full max-w-[1600px] mx-auto mt-8 bg-zinc-950/40 backdrop-blur-md border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-4 p-6 border-b border-zinc-800 bg-zinc-900/20">
          <svg
            className="w-6 h-6 text-indigo-500"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M4 2C4 1.447 4.447 1 5 1H19C19.552 1 20 1.447 20 2V12.519C19.065 12.184 18.058 12 17 12C14.238 12 12 14.238 12 17C12 18.058 12.184 19.065 12.519 20H5C4.447 20 4 19.552 4 19V2ZM8 6C7.447 6 7 6.447 7 7C7 7.552 7.447 8 8 8H16C16.552 8 17 7.552 17 7C17 6.447 16.552 6 16 6H8ZM7 11C7 10.447 7.447 10 8 10H14C14.552 10 15 10.447 15 11C15 11.552 14.552 12 14 12H8C7.447 12 7 11.552 7 11ZM8 14C7.447 14 7 14.447 7 15C7 15.552 7.447 16 8 16H10.5C10.776 16 11 15.552 11 15C11 14.447 10.776 14 10.5 14H8Z" />
            <path d="M15 14.5C15 13.671 15.671 13 16.5 13H21.5C22.328 13 23 13.671 23 14.5V15.5L20 18.5L23 21.5V22.5C23 23.328 22.328 24 21.5 24H16.5C15.671 24 15 23.328 15 22.5V21.5L18 18.5L15 15.5V14.5ZM17 15V15.085L19 17.085L21 15.085V15H17ZM17 22H21V21.914L19 19.914L17 21.914V22Z" />
          </svg>
          <h2
            className={`${futuristicFont.className} text-xl text-white tracking-widest uppercase`}
          >
            Rating<span className="text-zinc-600"> History</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 text-zinc-500 text-[10px] uppercase tracking-[0.2em]">
                <th className="p-4 font-bold whitespace-nowrap">Date</th>
                <th className="p-4 font-bold whitespace-nowrap">User ID</th>
                <th className="p-4 font-bold whitespace-nowrap">Contest ID</th>
                <th className="p-4 font-bold text-center whitespace-nowrap">
                  Rank
                </th>
                <th className="p-4 font-bold text-center whitespace-nowrap">
                  Participants
                </th>
                <th className="p-4 font-bold text-center whitespace-nowrap">
                  Old Rating
                </th>
                <th className="p-4 font-bold text-center whitespace-nowrap">
                  New Rating
                </th>
                <th className="p-4 font-bold text-center whitespace-nowrap">
                  Change
                </th>
                <th className="p-4 font-bold text-center whitespace-nowrap">
                  Perform. Rating
                </th>
                <th className="p-4 font-bold text-right pr-6 whitespace-nowrap">
                  Percentile
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {history.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="p-8 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest"
                  >
                    No matching records found.
                  </td>
                </tr>
              ) : (
                history.map((record, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-zinc-800/20 transition-all group"
                  >
                    <td className="p-4 text-xs text-zinc-400 whitespace-nowrap">
                      {new Date(record.created_at).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </td>

                    <td className="p-4 font-mono text-[11px] text-zinc-300">
                      <div className="flex items-center gap-2 group/tip relative">
                        <span className="truncate max-w-[100px]">
                          {record.user_id}
                        </span>
                        <button
                          onClick={() => fetchDetail("user", record.user_id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-800 rounded transition-all cursor-pointer bg-zinc-900/50 border border-zinc-800"
                        >
                          <ArrowRight
                            size={12}
                            className="text-zinc-500 hover:text-indigo-400"
                          />
                          <span className="absolute bottom-full left-0 mb-2 hidden group-hover/tip:block bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-300 px-2 py-1 rounded whitespace-nowrap z-50 shadow-2xl uppercase tracking-tighter">
                            View referencing record
                          </span>
                        </button>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                      <div className="flex items-center gap-2 group/tip relative">
                        <span className="truncate max-w-[100px]">
                          {record.contest_id}
                        </span>
                        <button
                          onClick={() =>
                            fetchDetail("contest", record.contest_id)
                          }
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-800 rounded transition-all cursor-pointer bg-zinc-900/50 border border-zinc-800"
                        >
                          <ArrowRight
                            size={12}
                            className="text-zinc-500 hover:text-indigo-400"
                          />
                          <span className="absolute bottom-full left-0 mb-2 hidden group-hover/tip:block bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-300 px-2 py-1 rounded whitespace-nowrap z-50 shadow-2xl uppercase tracking-tighter">
                            View referencing record
                          </span>
                        </button>
                      </div>
                    </td>

                    <td className="p-4 text-xs font-bold text-white text-center">
                      {record.rank}
                    </td>
                    <td className="p-4 text-center">
                      <span className="font-mono font-bold text-zinc-400 text-xs">
                        {record.total_participants}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-zinc-500 text-center">
                      {record.old_rating}
                    </td>
                    <td className="p-4 text-xs font-bold text-white text-center">
                      {record.new_rating}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`flex items-center justify-center h-6 px-2 mx-auto w-fit text-[10px] leading-none font-black uppercase rounded-sm border ${record.rating_change >= 0 ? "bg-emerald-950/30 text-emerald-500 border-emerald-900/50" : "bg-rose-950/30 text-rose-500 border-rose-900/50"}`}
                      >
                        {record.rating_change > 0 ? "+" : ""}
                        {record.rating_change}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-indigo-400 text-center font-mono">
                      {record.performance_rating}
                    </td>
                    <td className="p-4 text-[11px] font-mono text-zinc-500 text-right pr-6">
                      {Number(record.percentile).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {activeDetail && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            onClick={() => setActiveDetail(null)}
          />
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex justify-between items-center">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                Referencing record from{" "}
                <span className="text-indigo-400">
                  public.{activeDetail.type}s
                </span>
              </span>
              <button
                onClick={() => setActiveDetail(null)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {detailLoading ? (
                <div className="py-8 text-center animate-pulse text-zinc-600 text-[10px] uppercase tracking-[0.2em]">
                  Fetching remote record...
                </div>
              ) : (
                <div className="overflow-hidden border border-zinc-800 rounded-md">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-950 border-b border-zinc-800">
                      <tr className="text-[9px] uppercase text-zinc-500 font-bold">
                        <th className="p-3">
                          id{" "}
                          <span className="text-zinc-700 font-normal">
                            uuid
                          </span>
                        </th>
                        <th className="p-3">
                          name{" "}
                          <span className="text-zinc-700 font-normal">
                            text
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-xs font-mono">
                        <td className="p-3 text-emerald-400 border-r border-zinc-800 break-all">
                          {activeDetail.id}
                        </td>
                        <td className="p-3 text-white font-bold uppercase tracking-tight">
                          {detailData?.name ||
                            detailData?.username ||
                            "NULL_ENTITY"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
