import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  User,
  Share2,
  Home,
  Crown,
  Star,
  Award,
  Gift,
} from "lucide-react";
import { Player } from "@/types/types";
import { motion, AnimatePresence } from "framer-motion";
import Sparkles from "@/components/ui/Sparkles";
import { GlowingText } from "@/components/ui/glowing-text";
import { Card } from "@/components/ui/card";
import { GradientButton } from "@/components/ui/gradient-button";
import { resetAllStores } from "@/store/store-util";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { playSound, stopAllSounds, SOUND_PATHS } from "@/utils/soundUtils";

// Fun avatar emojis for the game completion screen
const AVATAR_EMOJIS = [
  "🏆",
  "🥇",
  "🥈",
  "🥉",
  "😎",
  "🤠",
  "👑",
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
];
interface GameCompletedProps {
  players: Player[];
}

export function GameCompleted({ players }: GameCompletedProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Ensure we have at least one player
  const safePlayersList =
    players && players.length > 0
      ? players
      : [
          {
            id: "last-player",
            nickname: "Last Player Standing",
            total_points: 100,
            is_host: true,
            room_id: "",
            created_at: "",
            updated_at: "",
            has_been_decider: false,
          },
        ];

  // Fix: Ensure each player has point values
  const playersWithPoints = safePlayersList.map((player) => ({
    ...player,
    total_points: player.total_points ?? 0,
  }));

  // Detect single player mode for special handling
  const isSinglePlayerMode = playersWithPoints.length === 1;

  // Sort players by points
  const sortedPlayers = [...playersWithPoints].sort(
    (a, b) => b.total_points - a.total_points
  );

  // Get the winner - in single player case, it's the only player
  const winner = sortedPlayers[0];

  useEffect(() => {
    // Play sound on initial load
    playSound(SOUND_PATHS.resultsReveal, "results");

    // Short loading delay to allow animations to complete
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // Auto-reset timer (1 minute)
    const resetTimer = setTimeout(() => {
      handleResetAndReturn();
    }, 60000); // 60 seconds = 1 minute

    return () => {
      clearTimeout(loadingTimeout);
      clearTimeout(resetTimer);
      // Stop any sounds that might be playing when component unmounts
      stopAllSounds();
    };
  }, []);

  const handlePlaySound = () => {
    playSound(SOUND_PATHS.categorySelect, "category", false);
  };

  const handleShareResults = () => {
    const results = isSinglePlayerMode
      ? `🎮 SayWhat Solo Mission Complete!\n🏆 ${winner.nickname}: ${winner.total_points} points`
      : `🎮 SayWhat Game Results:\n🏆 ${sortedPlayers
          .map((p, i) => `${i + 1}. ${p.nickname}: ${p.total_points} points`)
          .join("\n")}`;

    navigator.clipboard.writeText(results);
    setCopied(true);
    handlePlaySound();
    setTimeout(() => setCopied(false), 2000);
  };
  const handleResetAndReturn = () => {
    resetAllStores();
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentRoom");
    // Use window.location.href for hard redirect to ensure clean state
    window.location.href = "/";
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.3 } },
  };

  // Trophy animation with bounce
  const trophyVariants = {
    initial: { scale: 0.8 },
    animate: {
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
      },
    },
  };

  // Generate player avatars - memoized to ensure consistency
  const playerAvatars = useMemo(() => {
    const avatarMap = new Map();

    // Create a deterministic but random-looking assignment based on player IDs
    safePlayersList.forEach((player, index) => {
      // Use a simple hash of the player ID to get a consistent avatar
      let hashSum = 0;
      for (let i = 0; i < player.id.length; i++) {
        hashSum += player.id.charCodeAt(i);
      }

      // Select emoji
      const emojiIndex = hashSum % AVATAR_EMOJIS.length;

      // Top 3 winners get special emojis
      let emoji = AVATAR_EMOJIS[emojiIndex];
      if (index === 0) emoji = "🏆";
      else if (index === 1) emoji = "🥇";
      else if (index === 2) emoji = "🥈";

      avatarMap.set(player.id, { emoji });
    });

    return avatarMap;
  }, [safePlayersList.map((p) => p.id).join(",")]);

  // Loading animation component
  const LoadingAnimation = () => (
    <motion.div
      className="flex flex-col items-center justify-center py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-12 h-12 border-4 border-t-purple-500 border-purple-300 rounded-full animate-spin mb-4" />
      <GlowingText className="text-xl font-bold text-center">
        Generating Results...
      </GlowingText>
    </motion.div>
  );

  return (
    <CardContainer
      perspective={1500}
      className="w-full max-w-4xl mx-auto h-full"
    >
      <CardBody className="bg-slate-900/60 backdrop-blur-md border border-purple-500/20 rounded-2xl p-4 shadow-lg group/card">
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover/card:border-amber-500/50 transition-all duration-500 pointer-events-none" />

        <AnimatePresence mode="wait">
          {isLoading ? (
            <LoadingAnimation />
          ) : (
            <motion.div
              className="max-w-2xl mx-auto"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {/* Compact Victory Banner */}
              <motion.div variants={item} className="text-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/20 to-transparent blur-3xl rounded-full transform scale-150 -z-10" />
                  <Sparkles>
                    <TextGenerateEffect
                      words={
                        isSinglePlayerMode
                          ? "Solo Mission Complete!"
                          : "Mission Complete!"
                      }
                      className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-500"
                      duration={0.6}
                    />
                  </Sparkles>
                </div>
              </motion.div>

              {/* Condensed Layout with Winner and Rankings side by side for multi-player */}
              <div
                className={`grid ${!isSinglePlayerMode ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"} gap-4`}
              >
                {/* Winner section */}
                <motion.div variants={item}>
                  <CardItem translateZ={60}>
                    <HoverBorderGradient
                      containerClassName="w-full rounded-xl"
                      className="p-3"
                      gradientClassName={
                        isSinglePlayerMode
                          ? "bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500"
                          : "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500"
                      }
                    >
                      <div className="flex items-center">
                        <motion.div
                          className="relative flex-shrink-0"
                          variants={trophyVariants}
                          initial="initial"
                          animate="animate"
                        >
                          <div className="absolute inset-0 bg-yellow-400 blur-lg rounded-full opacity-30 -z-10" />
                          <div
                            className={`rounded-full p-3 ${
                              isSinglePlayerMode
                                ? "bg-gradient-to-br from-purple-400 to-blue-500 shadow-blue-500/30"
                                : "bg-gradient-to-br from-yellow-400 to-amber-500 shadow-amber-500/30"
                            }`}
                          >
                            <Trophy className="w-8 h-8 text-white" />
                          </div>
                        </motion.div>

                        <div className="ml-4 flex-1">
                          <h2 className="text-xl font-bold text-white">
                            {isSinglePlayerMode
                              ? `${winner.nickname}`
                              : `${winner.nickname} Wins!`}
                          </h2>
                          <div className="inline-block bg-amber-900/30 text-amber-300 border border-amber-500/30 rounded-lg py-1 px-3 mt-1 font-mono font-bold text-lg">
                            {winner.total_points} points
                          </div>
                        </div>
                      </div>
                    </HoverBorderGradient>
                  </CardItem>
                </motion.div>

                {/* Players ranking - show only if more than one player */}
                {!isSinglePlayerMode && (
                  <motion.div variants={item}>
                    <CardItem translateZ={50}>
                      <Card className="border-purple-500/20 bg-slate-800/50 backdrop-blur-sm overflow-hidden h-full">
                        <div className="p-2 border-b border-purple-500/20 flex items-center gap-2">
                          <Award className="h-4 w-4 text-purple-400" />
                          <h3 className="font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                            Final Rankings
                          </h3>
                        </div>

                        <div className="divide-y divide-purple-500/10 max-h-36 overflow-y-auto">
                          {sortedPlayers.slice(0, 5).map((player, index) => (
                            <motion.div
                              key={player.id}
                              className={`flex items-center p-2 ${
                                index === 0 ? "bg-amber-500/10" : ""
                              }`}
                              variants={item}
                              whileHover={{
                                backgroundColor: "rgba(139, 92, 246, 0.1)",
                              }}
                            >
                              <div className="flex-shrink-0 w-6 text-center font-mono font-bold">
                                {index === 0 ? (
                                  <Crown className="h-4 w-4 text-yellow-500 mx-auto" />
                                ) : (
                                  <span
                                    className={`text-sm ${
                                      index === 1
                                        ? "text-slate-400"
                                        : index === 2
                                          ? "text-amber-700"
                                          : "text-slate-500"
                                    }`}
                                  >
                                    #{index + 1}
                                  </span>
                                )}
                              </div>

                              <div className="flex-shrink-0 mx-2">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
                                    index === 0
                                      ? "bg-gradient-to-br from-yellow-400 to-amber-500 ring-1 ring-yellow-500/50"
                                      : index === 1
                                        ? "bg-gradient-to-br from-slate-400 to-slate-500"
                                        : index === 2
                                          ? "bg-gradient-to-br from-amber-700 to-amber-800"
                                          : "bg-gradient-to-br from-slate-700 to-slate-800"
                                  }`}
                                >
                                  <span className="text-xl">
                                    {playerAvatars.get(player.id)?.emoji ||
                                      player.nickname[0].toUpperCase()}
                                  </span>
                                </div>
                              </div>

                              <div className="flex-1 truncate">
                                <p
                                  className={`font-medium text-sm truncate ${index === 0 ? "text-yellow-100" : "text-white"}`}
                                >
                                  {player.nickname}
                                </p>
                              </div>

                              <div className="font-bold text-sm ml-1">
                                <div
                                  className={`px-2 py-0.5 rounded font-mono ${
                                    index === 0
                                      ? "bg-amber-900/30 text-amber-300"
                                      : index === 1
                                        ? "bg-slate-700/80 text-slate-300"
                                        : index === 2
                                          ? "bg-amber-800/30 text-amber-700"
                                          : "bg-slate-800/80 text-slate-400"
                                  }`}
                                >
                                  {player.total_points}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </Card>
                    </CardItem>
                  </motion.div>
                )}
              </div>

              {/* For single player, show a compact stats card */}
              {isSinglePlayerMode && (
                <motion.div variants={item} className="mt-4">
                  <CardItem translateZ={40}>
                    <Card className="border-purple-500/20 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
                      <div className="p-3 flex items-center gap-2">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl bg-gradient-to-br from-blue-500 to-indigo-500 ring-1 ring-blue-500/50">
                            {winner.nickname[0].toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white">
                            Lone Survivor
                          </h4>
                          <div className="inline-block bg-blue-900/30 text-blue-300 border border-blue-500/30 rounded-lg py-1 px-2 mt-1 font-mono text-sm">
                            {winner.total_points} points earned
                          </div>
                        </div>
                      </div>
                    </Card>
                  </CardItem>
                </motion.div>
              )}

              {/* Action buttons */}
              <motion.div
                variants={item}
                className="grid grid-cols-2 gap-3 mt-4"
              >
                <CardItem translateZ={30}>
                  <GradientButton
                    onClick={handleShareResults}
                    className="w-full py-2 flex items-center justify-center text-sm"
                    gradientFrom="from-blue-500"
                    gradientTo="to-indigo-600"
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    {copied ? "Copied!" : "Share Results"}
                  </GradientButton>
                </CardItem>

                <CardItem translateZ={30}>
                  <GradientButton
                    onClick={handleResetAndReturn}
                    className="w-full py-2 flex items-center justify-center text-sm"
                    gradientFrom="from-slate-500"
                    gradientTo="to-slate-700"
                    variant="secondary"
                  >
                    <Home className="w-4 h-4 mr-1" />
                    Return Home
                  </GradientButton>
                </CardItem>
              </motion.div>

              <motion.div
                variants={item}
                className="text-center mt-2 text-xs text-slate-500"
              >
                Auto-exit in 60s
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardBody>
    </CardContainer>
  );
}
