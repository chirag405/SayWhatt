"use client";

import { motion } from "framer-motion";
import { Player } from "@/types/types";
import { GlowingText } from "./ui/glowing-text";

interface GameHeaderProps {
  roundNumber: number;
  totalRounds: number;
  turnNumber: number;
  currentDecider?: Player | null;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  roundNumber,
  totalRounds,
  turnNumber,
  currentDecider,
}) => {
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-slate-800/90 backdrop-blur-md border-b border-purple-500/20 p-4"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">
            Round {roundNumber}/{totalRounds}
          </h2>
          <div className="flex items-center mt-1">
            <span className="text-gray-400">Turn #{turnNumber}</span>
            {currentDecider && (
              <>
                <span className="mx-2 text-gray-500">•</span>
                <div className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs text-white mr-1">
                    D
                  </div>
                  <GlowingText className="text-sm">
                    {currentDecider.nickname}
                  </GlowingText>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Game phase indicator */}
        <div className="bg-slate-700/50 px-3 py-1 rounded-full flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          <span className="text-xs text-gray-300">Game in progress</span>
        </div>
      </div>
    </motion.div>
  );
};
