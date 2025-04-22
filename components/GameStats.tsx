"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchGameStatistics } from "@/actions/game";

interface GameStats {
  rooms_created: number;
  players_participated: number;
  last_updated: string;
}

export default function GameStatistics() {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      const result = await fetchGameStatistics();
      if (result.success && result.data) {
        setStats(result.data);
      }
      setIsLoading(false);
    };

    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center space-x-2 text-xs text-slate-400">
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
        <div
          className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"
          style={{ animationDelay: "0.2s" }}
        ></div>
        <div
          className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"
          style={{ animationDelay: "0.4s" }}
        ></div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.6 }}
      className="flex flex-col sm:flex-row justify-center items-center gap-4 text-center text-xs sm:text-sm"
    >
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-600/30 to-blue-600/10 backdrop-blur-sm border border-blue-500/30"
      >
        <span className="text-blue-300">Rooms Created:</span>{" "}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="font-bold text-white"
        >
          {stats.rooms_created.toLocaleString()}
        </motion.span>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/30 to-purple-600/10 backdrop-blur-sm border border-purple-500/30"
      >
        <span className="text-purple-300">Players Participated:</span>{" "}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="font-bold text-white"
        >
          {stats.players_participated.toLocaleString()}
        </motion.span>
      </motion.div>
    </motion.div>
  );
}
