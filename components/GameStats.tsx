"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchGameStatistics } from "@/actions/game";
import { Home, Users, Calendar, TrendingUp } from "lucide-react";

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
      <div className="flex flex-col justify-center items-center space-y-4 py-10">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-lg"></div>
          <div className="flex justify-center items-center space-x-3">
            <div className="w-4 h-4 rounded-full bg-blue-400 animate-pulse"></div>
            <div
              className="w-4 h-4 rounded-full bg-purple-400 animate-pulse"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-4 h-4 rounded-full bg-indigo-400 animate-pulse"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
        </div>
        <p className="text-purple-200 font-medium">Loading statistics...</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-indigo-900/10"></div>
      <div className="absolute top-10 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-10 right-1/4 w-40 h-40 bg-purple-500/10 rounded-full filter blur-3xl"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-5xl mx-auto p-8 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400">
            Game Statistics
          </h2>
          <p className="text-purple-200 mt-2">
            See how popular SayWhat has become!
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
            whileHover={{
              scale: 1.03,
              boxShadow: "0 20px 40px -15px rgba(66, 153, 225, 0.4)",
            }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-60 group-hover:opacity-80 transition duration-500"></div>
            <div className="bg-gradient-to-br from-blue-600/90 to-indigo-700/90 backdrop-blur-sm rounded-2xl p-8 relative h-full shadow-2xl border border-blue-500/20">
              <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Home className="w-6 h-6 text-blue-200" />
              </div>

              <div className="text-center space-y-6 pt-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <span className="text-blue-200 font-medium text-sm uppercase tracking-wider">
                    TOTAL
                  </span>
                  <motion.div
                    className="text-5xl sm:text-6xl font-bold text-white mt-2"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 1.2,
                      type: "spring",
                      damping: 6,
                      stiffness: 100,
                    }}
                  >
                    {stats.rooms_created.toLocaleString()}
                  </motion.div>
                  <div className="text-xl font-semibold text-blue-100 mt-3 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-300" /> Rooms
                    Created
                  </div>
                </motion.div>

                <div className="w-3/4 mx-auto h-0.5 bg-blue-500/30 rounded-full"></div>

                <div className="text-sm text-blue-200 opacity-90 font-medium">
                  Growing every day!
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
            whileHover={{
              scale: 1.03,
              boxShadow: "0 20px 40px -15px rgba(168, 85, 247, 0.4)",
            }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-60 group-hover:opacity-80 transition duration-500"></div>
            <div className="bg-gradient-to-br from-purple-600/90 to-pink-600/90 backdrop-blur-sm rounded-2xl p-8 relative h-full shadow-2xl border border-purple-500/20">
              <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-200" />
              </div>

              <div className="text-center space-y-6 pt-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                >
                  <span className="text-purple-200 font-medium text-sm uppercase tracking-wider">
                    TOTAL
                  </span>
                  <motion.div
                    className="text-5xl sm:text-6xl font-bold text-white mt-2"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 1.4,
                      type: "spring",
                      damping: 6,
                      stiffness: 100,
                    }}
                  >
                    {stats.players_participated.toLocaleString()}
                  </motion.div>
                  <div className="text-xl font-semibold text-purple-100 mt-3 flex items-center justify-center">
                    <Users className="w-5 h-5 mr-2 text-purple-300" /> Players
                    Participated
                  </div>
                </motion.div>

                <div className="w-3/4 mx-auto h-0.5 bg-purple-500/30 rounded-full"></div>

                <div className="text-sm text-purple-200 opacity-90 font-medium">
                  Join the community!
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="flex justify-center mt-8"
        >
          <div className="inline-flex items-center px-4 py-2 bg-slate-800/60 backdrop-blur-sm rounded-full border border-slate-700/40 text-sm text-slate-300 shadow-lg">
            <Calendar className="w-4 h-4 mr-2 text-purple-400" />
            Last updated:{" "}
            {new Date(stats.last_updated).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
