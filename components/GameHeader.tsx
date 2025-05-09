"use client";

import { motion } from "framer-motion";
import { Player } from "@/types/types";
import { GlowingText } from "./ui/glowing-text";
import { CardContainer, CardBody, CardItem } from "./ui/3d-card";
import { HoverBorderGradient } from "./ui/hover-border-gradient";
import { Trophy, Activity, Crown } from "lucide-react";
import Sparkles from "./ui/Sparkles";

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
    <CardContainer perspective={800} className="w-full">
      <CardBody className="bg-slate-800/80 backdrop-blur-md border-b border-purple-500/20 p-4 shadow-lg shadow-purple-500/10 group/header">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <CardItem translateZ={20} className="flex items-center gap-2 mb-1">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                Round {roundNumber}/{totalRounds}
              </h2>
            </CardItem>

            <CardItem translateZ={15} className="flex items-center">
              <div className="flex items-center">
                <span className="text-gray-400">Turn #{turnNumber}</span>
                {currentDecider && (
                  <>
                    <span className="mx-2 text-gray-500">•</span>
                    <div className="flex items-center">
                      <motion.div
                        className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs text-white mr-1.5"
                        whileHover={{ scale: 1.1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 10,
                        }}
                      >
                        <Crown className="w-3 h-3" />
                      </motion.div>
                      <Sparkles density={20}>
                        <GlowingText className="text-sm font-medium">
                          {currentDecider.nickname}
                        </GlowingText>
                      </Sparkles>
                    </div>
                  </>
                )}
              </div>
            </CardItem>
          </div>

          {/* Game phase indicator */}
          <CardItem translateZ={30}>
            <HoverBorderGradient
              containerClassName="rounded-full overflow-hidden"
              className="bg-slate-800/70 px-3 py-1 flex items-center space-x-2"
              gradientClassName="bg-gradient-to-r from-green-400/40 to-emerald-500/40"
            >
              <motion.span
                className="w-2 h-2 rounded-full bg-green-400"
                animate={{
                  opacity: [0.5, 1, 0.5],
                  boxShadow: [
                    "0 0 0 rgba(74, 222, 128, 0)",
                    "0 0 8px rgba(74, 222, 128, 0.8)",
                    "0 0 0 rgba(74, 222, 128, 0)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs text-gray-300">Game in progress</span>
            </HoverBorderGradient>
          </CardItem>
        </div>
      </CardBody>
    </CardContainer>
  );
};
