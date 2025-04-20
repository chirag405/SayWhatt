import { useState, useEffect } from "react";
import { User, Trophy, Coffee, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { ConnectionStatus, Player } from "@/types/types";
import { useGameStore } from "@/store/game-store";
import { Sparkles } from "@/components/ui/acernity/Sparkles";

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

  // Sort players by points (highest first)
  const sortedPlayers = [...players].sort((a, b) => {
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

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 },
  };

  return (
    <motion.div
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={`bg-slate-800/80 backdrop-blur-md border-r border-purple-500/20 transition-all duration-300 ${
        expanded ? "w-64" : "w-16"
      }`}
    >
      <div className="flex justify-between items-center p-4 border-b border-purple-500/20">
        {expanded && (
          <Sparkles>
            <h2 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Players
            </h2>
          </Sparkles>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          {expanded ? "←" : "→"}
        </button>
      </div>

      {/* Game progress */}
      <div className="p-4 border-b border-purple-500/20">
        <div
          className={`flex items-center mb-2 ${expanded ? "" : "justify-center"}`}
        >
          <Trophy className="w-5 h-5 text-yellow-400 mr-2" />
          {expanded && (
            <div className="text-sm text-purple-300">
              Round {roundNumber}/{totalRounds} • Turn {currentTurn}
            </div>
          )}
        </div>

        {expanded && (
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${(roundNumber / totalRounds) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      {/* Player list */}
      <motion.div
        className="overflow-y-auto max-h-[calc(100vh-120px)]"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {sortedPlayers.map((player) => (
          <motion.div
            key={player.id}
            variants={item}
            className={`flex items-center p-3 ${
              player.id === currentUserId
                ? "bg-purple-500/20 border-l-2 border-purple-500"
                : "hover:bg-slate-700/50"
            }`}
            whileHover={{ backgroundColor: "rgba(139, 92, 246, 0.2)" }}
          >
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full 
              ${
                player.id === currentUserId
                  ? "bg-gradient-to-br from-purple-500 to-pink-500"
                  : "bg-slate-700"
              }`}
            >
              {player.nickname[0].toUpperCase()}
            </div>

            {expanded && (
              <div className="ml-3 flex-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium truncate max-w-32 text-white">
                    {player.nickname}
                    {player.id === currentUserId && (
                      <span className="text-xs text-purple-400 ml-1">
                        (You)
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-purple-300">
                    {player.total_points || 0}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
