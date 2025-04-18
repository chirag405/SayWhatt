import { useState, useEffect } from "react";
import { User, Trophy, Coffee, AlertTriangle } from "lucide-react";
import { ConnectionStatus, Player } from "@/types/types";
import { useGameStore } from "@/store/game-store";

interface GameSidebarProps {
  players: Player[];
  currentUserId: string;
  currentTurn: number;
  roundNumber: number;
  totalRounds: number;
}

export function GameSidebar({
  players,
  currentUserId,
  currentTurn,
  roundNumber,
  totalRounds,
}: GameSidebarProps) {
  const [expanded, setExpanded] = useState(true);
  const { votes, answers } = useGameStore();

  // This ensures we're always showing the latest player data with points
  const sortedPlayers = [...players].sort((a, b) => {
    // Sort by points (highest first)
    return (b.total_points ?? 0) - (a.total_points ?? 0);
  });

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case "connected":
        return <User className="w-4 h-4 text-green-500" />;
      case "away":
        return <Coffee className="w-4 h-4 text-yellow-500" />;
      case "disconnected":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div
      className={`bg-gray-800 text-white transition-all duration-300 ${
        expanded ? "w-64" : "w-16"
      }`}
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h2 className={`font-bold ${expanded ? "block" : "hidden"}`}>
          Players
        </h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-white"
        >
          {expanded ? "←" : "→"}
        </button>
      </div>

      {/* Game progress */}
      <div className="p-4 border-b border-gray-700">
        <div
          className={`flex items-center mb-2 ${expanded ? "" : "justify-center"}`}
        >
          <Trophy className="w-5 h-5 text-yellow-400 mr-2" />
          {expanded && (
            <div className="text-sm">
              Round {roundNumber}/{totalRounds} • Turn {currentTurn}
            </div>
          )}
        </div>
      </div>

      {/* Player list */}
      <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
        {sortedPlayers.map((player) => (
          <div
            key={player.id}
            className={`flex items-center p-3 ${
              player.id === currentUserId ? "bg-gray-700 bg-opacity-50" : ""
            }`}
          >
            {expanded && (
              <div className="ml-3 flex-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium truncate max-w-32">
                    {player.nickname}
                    {player.id === currentUserId && " (You)"}
                  </span>
                  <span className="font-bold text-yellow-400">
                    {player.total_points || 0}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
