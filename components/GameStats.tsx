"use client";

import { useEffect, useState } from "react";
import { motion, stagger } from "framer-motion";
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
      <div className="flex justify-center items-center space-x-3 text-lg">
        <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse"></div>
        <div
          className="w-3 h-3 rounded-full bg-purple-400 animate-pulse"
          style={{ animationDelay: "0.2s" }}
        ></div>
        <div
          className="w-3 h-3 rounded-full bg-teal-400 animate-pulse"
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
      className="w-full max-w-4xl mx-auto p-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
        >
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 shadow-2xl transform transition-all hover:scale-105">
            <div className="text-center space-y-4">
              <div className="text-4xl sm:text-5xl font-bold text-white">
                {stats.rooms_created.toLocaleString()}
              </div>
              <div className="text-xl font-semibold text-blue-100">
                🚪 Total Rooms Created
              </div>
              <div className="text-sm text-blue-200 opacity-80">
                And counting...
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
        >
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-8 shadow-2xl transform transition-all hover:scale-105">
            <div className="text-center space-y-4">
              <div className="text-4xl sm:text-5xl font-bold text-white">
                {stats.players_participated.toLocaleString()}
              </div>
              <div className="text-xl font-semibold text-purple-100">
                🎮 People Played
              </div>
              <div className="text-sm text-purple-200 opacity-80">
                Join the fun!
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="text-center mt-6 text-sm text-slate-400"
      >
        Last updated: {new Date(stats.last_updated).toLocaleDateString()}
      </motion.div>
    </motion.div>
  );
}
