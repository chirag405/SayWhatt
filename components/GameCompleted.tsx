import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, User, Share2, Home } from "lucide-react";
import { Player } from "@/types/types";

interface GameCompletedProps {
  players: Player[];
}

export function GameCompleted({ players }: GameCompletedProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // Sort players by points
  const sortedPlayers = [...players].sort(
    (a, b) => (b.total_points ?? 0) - (a.total_points ?? 0)
  );
  const winner = sortedPlayers[0];

  const handleShareResults = () => {
    const results = `Game Results:\n${sortedPlayers
      .map((p, i) => `${i + 1}. ${p.nickname}: ${p.total_points} points`)
      .join("\n")}`;

    navigator.clipboard.writeText(results);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReturnHome = () => {
    // Clear game data
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentRoom");
    router.push("/");
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Game Complete!</h1>
        <p className="text-gray-600">Thanks for playing!</p>
      </div>

      {/* Winner section */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-lg shadow-md border border-yellow-200 mb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-yellow-400 rounded-full p-4">
            <Trophy className="w-12 h-12 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-1">{winner.nickname} Wins!</h2>
        <p className="text-amber-600 font-semibold text-lg">
          {winner.total_points} points
        </p>
      </div>

      {/* Players ranking */}
      <div className="bg-white rounded-lg shadow-md mb-8">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-lg">Final Rankings</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center p-4 ${index === 0 ? "bg-yellow-50" : ""}`}
            >
              <div className="flex-shrink-0 w-8 text-center font-bold text-gray-500">
                {index + 1}
              </div>
              <div className="flex-shrink-0 mr-3">
                <div
                  className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center ${index === 0 ? "bg-yellow-400 text-white" : ""}`}
                >
                  <User className="w-5 h-5" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-medium">{player.nickname}</p>
              </div>
              <div className="font-bold text-lg">{player.total_points}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col space-y-3">
        <button
          onClick={handleShareResults}
          className="w-full py-3 flex items-center justify-center bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Share2 className="w-5 h-5 mr-2" />
          {copied ? "Copied!" : "Share Results"}
        </button>
        <button
          onClick={handleReturnHome}
          className="w-full py-3 flex items-center justify-center bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          <Home className="w-5 h-5 mr-2" />
          Return to Home
        </button>
      </div>
    </div>
  );
}
