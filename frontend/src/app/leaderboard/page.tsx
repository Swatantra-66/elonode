import Leaderboard from "@/components/Leaderboard";

export default function LeaderboardPage() {
  return (
    <div className="p-6 md:p-12 min-h-screen flex flex-col">
      <div className="max-w-4xl mx-auto w-full">
        <Leaderboard />
      </div>
    </div>
  );
}
