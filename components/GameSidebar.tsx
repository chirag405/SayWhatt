import { useState, useEffect, useMemo } from "react";
import {
  User,
  Trophy,
  Coffee,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Crown,
} from "lucide-react";
import { motion } from "framer-motion";
import { ConnectionStatus, Player } from "@/types/types";
import { useGameStore } from "@/store/game-store";
import Sparkles from "@/components/ui/Sparkles";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { CardItem } from "@/components/ui/3d-card";
import { GlowingText } from "@/components/ui/glowing-text";

interface GameSidebarProps {
  players: Player[];
  currentUserId: string;
  currentTurn: number;
  roundNumber: number;
  totalRounds: number;
}

// Fun avatar emojis for players with distinct personalities
const AVATAR_EMOJIS = [
  "😎",
  "🤠",
  "🧠",
  "👻",
  "🦊",
  "🦁",
  "🐯",
  "🐼",
  "🐨",
  "🐵",
  "🐸",
  "🦄",
  "🦉",
  "🦇",
  "🐢",
  "🐙",
  "🦋",
  "🐝",
  "🦖",
  "🦈",
  "👽",
  "🤖",
  "🦸",
  "🧙",
  "👩‍🚀",
  "👨‍🚀",
  "👩‍🔬",
  "👨‍🔬",
  "🕵️",
  "🥷",
  "🧛",
  "🧚",
];

// Color palettes for different avatar backgrounds
const AVATAR_COLORS = [
  { from: "from-blue-500", to: "to-cyan-400" },
  { from: "from-purple-500", to: "to-pink-400" },
  { from: "from-green-500", to: "to-emerald-400" },
  { from: "from-red-500", to: "to-rose-400" },
  { from: "from-orange-500", to: "to-amber-400" },
  { from: "from-fuchsia-500", to: "to-purple-400" },
  { from: "from-indigo-500", to: "to-blue-400" },
  { from: "from-teal-500", to: "to-green-400" },
];

export function GameSidebar({
  players,
  currentUserId,
  currentTurn,
  roundNumber,
  totalRounds,
}: GameSidebarProps) {
  const [expanded, setExpanded] = useState(true);
  const { votes, answers } = useGameStore();

  // Generate player avatars - memoized to ensure consistency
  const playerAvatars = useMemo(() => {
    const avatarMap = new Map();

    // Create a deterministic but random-looking assignment based on player IDs
    players.forEach((player, index) => {
      // Use a simple hash of the player ID to get a consistent avatar
      let hashSum = 0;
      for (let i = 0; i < player.id.length; i++) {
        hashSum += player.id.charCodeAt(i);
      }

      // Select emoji and color based on hash
      const emojiIndex = hashSum % AVATAR_EMOJIS.length;
      const colorIndex = Math.floor(hashSum / 7) % AVATAR_COLORS.length;

      avatarMap.set(player.id, {
        emoji: AVATAR_EMOJIS[emojiIndex],
        color: AVATAR_COLORS[colorIndex],
      });
    });

    return avatarMap;
  }, [players.map((p) => p.id).join(",")]);

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
      className={`bg-slate-900/80 backdrop-blur-md border-r border-purple-500/20 h-screen transition-all duration-300 ${
        expanded ? "w-72" : "w-20"
      }`}
    >
      <div className="relative h-full flex flex-col">
        {/* Sidebar Header */}
        <div className="flex justify-between items-center p-4 border-b border-purple-500/20">
          {expanded ? (
            <Sparkles density={20}>
              <GlowingText className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                Players
              </GlowingText>
            </Sparkles>
          ) : (
            <Trophy className="w-6 h-6 text-yellow-400 mx-auto" />
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setExpanded(!expanded)}
            className="bg-slate-800 hover:bg-purple-900/50 rounded-full p-1.5 text-purple-400 hover:text-purple-300 transition-colors border border-purple-500/30"
          >
            {expanded ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </motion.button>
        </div>

        {/* Game progress */}
        <div className="p-4 border-b border-purple-500/20">
          <div
            className={`flex items-center mb-2 ${expanded ? "" : "justify-center"}`}
          >
            <Trophy className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" />
            {expanded && (
              <div className="text-sm text-purple-300">
                <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
                  Round {roundNumber}/{totalRounds}
                </span>{" "}
                • Turn {currentTurn}
              </div>
            )}
          </div>

          {expanded && (
            <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${(roundNumber / totalRounds) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          )}
        </div>

        {/* Player list with scroll */}
        <motion.div
          className="overflow-y-auto flex-1 py-2 px-1 scrollbar-thin scrollbar-thumb-purple-900 scrollbar-track-slate-800"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {sortedPlayers.map((player, index) => (
            <motion.div
              key={player.id}
              variants={item}
              className={`flex items-center p-3 mb-2 rounded-lg transition-all ${
                player.id === currentUserId
                  ? "bg-purple-500/20 border border-purple-500/40 shadow-lg shadow-purple-500/10"
                  : "hover:bg-slate-800/70"
              }`}
              whileHover={{
                backgroundColor:
                  player.id === currentUserId
                    ? "rgba(139, 92, 246, 0.3)"
                    : "rgba(30, 41, 59, 0.7)",
                scale: 1.02,
                transition: { duration: 0.2 },
              }}
            >
              <div className="relative">
                {" "}
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg
                  ${
                    player.id === currentUserId
                      ? "bg-gradient-to-br from-purple-500 to-pink-500"
                      : index === 0
                        ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                        : "bg-gradient-to-br from-slate-600 to-slate-700"
                  }`}
                >
                  <span className="text-2xl">
                    {playerAvatars.get(player.id)?.emoji ||
                      player.nickname[0].toUpperCase()}
                  </span>
                </div>
                {/* First place crown for top player */}
                {index === 0 && (
                  <span className="absolute -top-2 -right-2">
                    <Crown className="w-4 h-4 text-yellow-400" />
                  </span>
                )}
              </div>

              {expanded && (
                <div className="ml-3 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium truncate max-w-32 text-white flex items-center">
                      {player.nickname}
                      {player.id === currentUserId && (
                        <span className="text-xs text-purple-400 ml-1 bg-purple-900/50 px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </span>

                    <HoverBorderGradient
                      containerClassName="rounded-full"
                      className={`px-2 py-0.5 rounded-full text-sm font-bold 
                        ${index === 0 ? "bg-amber-900/30 text-amber-300" : "bg-slate-800 text-purple-300"}`}
                      gradientClassName={
                        index === 0
                          ? "bg-gradient-to-r from-amber-400 to-yellow-500"
                          : "bg-gradient-to-r from-purple-400 to-pink-500"
                      }
                    >
                      {player.total_points || 0}
                    </HoverBorderGradient>
                  </div>

                  {/* Show player status if they're the decider */}
                  {answers.some((a) => a.player_id === player.id) && (
                    <div className="flex items-center mt-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                      <span className="text-xs text-green-400">Submitted</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom section with game info */}
        <div className="p-3 border-t border-purple-500/20">
          {expanded ? (
            <div className="text-xs text-center text-slate-400 bg-slate-800/50 rounded-lg p-2 backdrop-blur-sm">
              Top scorer wins the game!
            </div>
          ) : (
            <div className="flex justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 text-purple-400"
              >
                <span className="block w-2 h-2 bg-purple-400 rounded-full absolute"></span>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
