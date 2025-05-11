import { useState, useEffect } from "react";
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
import { playSound, SOUND_PATHS } from "@/utils/soundUtils";

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
            // Add default values for other required properties
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
    }, 1000);

    // Auto-reset timer (1 minute)
    const resetTimer = setTimeout(() => {
      handleResetAndReturn();
    }, 60000); // 60 seconds = 1 minute

    return () => {
      clearTimeout(loadingTimeout);
      clearTimeout(resetTimer);
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
    router.push("/");
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.4 } },
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

  // Loading animation component
  const LoadingAnimation = () => (
    <motion.div
      className="flex flex-col items-center justify-center py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-16 h-16 border-4 border-t-purple-500 border-purple-300 rounded-full animate-spin mb-6" />

      <GlowingText className="text-2xl font-bold text-center">
        Generating Results...
      </GlowingText>
    </motion.div>
  );

  return (
    <CardContainer perspective={1500} className="w-full max-w-4xl mx-auto">
      <CardBody className="bg-slate-900/60 backdrop-blur-md border border-purple-500/20 rounded-2xl p-6 md:p-8 shadow-lg group/card">
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
              {/* Victory Banner */}
              <motion.div variants={item} className="text-center mb-12">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/20 to-transparent blur-3xl rounded-full transform scale-150 -z-10" />
                  <Sparkles>
                    <TextGenerateEffect
                      words={
                        isSinglePlayerMode
                          ? "Solo Mission Complete!"
                          : "Mission Complete!"
                      }
                      className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-500 pb-2"
                      duration={0.8}
                    />
                  </Sparkles>
                </div>
                <p className="text-purple-300 text-lg mt-4">
                  {isSinglePlayerMode
                    ? "Your lone operative skills have been recorded"
                    : "Your operative excellence has been recorded"}
                </p>
              </motion.div>

              {/* Winner section */}
              <motion.div variants={item}>
                <CardItem translateZ={80}>
                  <HoverBorderGradient
                    containerClassName="w-full rounded-2xl"
                    className="p-6 mb-8 text-center"
                    gradientClassName={
                      isSinglePlayerMode
                        ? "bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500"
                        : "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500"
                    }
                  >
                    <div className="flex justify-center mb-6">
                      <motion.div
                        className="relative"
                        variants={trophyVariants}
                        initial="initial"
                        animate="animate"
                      >
                        <div className="absolute inset-0 bg-yellow-400 blur-xl rounded-full opacity-30 transform scale-150 -z-10" />
                        <div
                          className={`rounded-full p-6 shadow-lg ${
                            isSinglePlayerMode
                              ? "bg-gradient-to-br from-purple-400 to-blue-500 shadow-blue-500/30"
                              : "bg-gradient-to-br from-yellow-400 to-amber-500 shadow-amber-500/30"
                          }`}
                        >
                          <Trophy className="w-16 h-16 text-white" />
                        </div>
                      </motion.div>
                    </div>

                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 15,
                      }}
                    >
                      <h2 className="text-3xl font-bold mb-2 text-white">
                        {isSinglePlayerMode
                          ? `${winner.nickname} - Last One Standing!`
                          : `${winner.nickname} Wins!`}
                      </h2>
                      <div className="inline-block bg-amber-900/30 text-amber-300 border border-amber-500/30 rounded-lg py-2 px-4 font-mono font-bold text-2xl">
                        {winner.total_points} points
                      </div>
                    </motion.div>
                  </HoverBorderGradient>
                </CardItem>
              </motion.div>

              {/* Players ranking - show only if more than one player */}
              {!isSinglePlayerMode && (
                <motion.div variants={item}>
                  <CardItem translateZ={60}>
                    <Card className="mb-8 border-purple-500/20 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
                      <div className="p-4 border-b border-purple-500/20 flex items-center gap-3">
                        <Award className="h-5 w-5 text-purple-400" />
                        <h3 className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                          Final Rankings
                        </h3>
                      </div>

                      <div className="divide-y divide-purple-500/10">
                        {sortedPlayers.map((player, index) => (
                          <motion.div
                            key={player.id}
                            className={`flex items-center p-4 ${
                              index === 0 ? "bg-amber-500/10" : ""
                            }`}
                            variants={item}
                            whileHover={{
                              backgroundColor: "rgba(139, 92, 246, 0.1)",
                            }}
                          >
                            <div className="flex-shrink-0 w-8 text-center font-mono font-bold">
                              {index === 0 ? (
                                <Crown className="h-6 w-6 text-yellow-500 mx-auto" />
                              ) : index === 1 ? (
                                <span className="text-slate-400 text-lg">
                                  #2
                                </span>
                              ) : index === 2 ? (
                                <span className="text-amber-700 text-lg">
                                  #3
                                </span>
                              ) : (
                                <span className="text-slate-500 text-lg">
                                  #{index + 1}
                                </span>
                              )}
                            </div>

                            <div className="flex-shrink-0 mx-3">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg ${
                                  index === 0
                                    ? "bg-gradient-to-br from-yellow-400 to-amber-500 ring-2 ring-yellow-500/50"
                                    : index === 1
                                      ? "bg-gradient-to-br from-slate-400 to-slate-500"
                                      : index === 2
                                        ? "bg-gradient-to-br from-amber-700 to-amber-800"
                                        : "bg-gradient-to-br from-slate-700 to-slate-800"
                                }`}
                              >
                                {player.nickname[0].toUpperCase()}
                              </div>
                            </div>

                            <div className="flex-1">
                              <p
                                className={`font-medium ${index === 0 ? "text-yellow-100" : "text-white"}`}
                              >
                                {player.nickname}
                              </p>
                            </div>

                            <div className="font-bold text-lg">
                              <HoverBorderGradient
                                containerClassName="rounded-lg"
                                className={`px-3 py-1 font-mono ${
                                  index === 0
                                    ? "bg-amber-900/30 text-amber-300"
                                    : index === 1
                                      ? "bg-slate-700/80 text-slate-300"
                                      : index === 2
                                        ? "bg-amber-800/30 text-amber-700"
                                        : "bg-slate-800/80 text-slate-400"
                                }`}
                                gradientClassName={
                                  index === 0
                                    ? "bg-gradient-to-r from-yellow-500 to-amber-500"
                                    : "bg-gradient-to-r from-purple-500 to-pink-500"
                                }
                              >
                                {player.total_points}
                              </HoverBorderGradient>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </Card>
                  </CardItem>
                </motion.div>
              )}

              {/* For single player, show a special stats card */}
              {isSinglePlayerMode && (
                <motion.div variants={item}>
                  <CardItem translateZ={60}>
                    <Card className="mb-8 border-purple-500/20 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
                      <div className="p-4 border-b border-purple-500/20 flex items-center gap-3">
                        <Award className="h-5 w-5 text-blue-400" />
                        <h3 className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                          Last One Standing
                        </h3>
                      </div>
                      <div className="p-6 text-center">
                        <div className="flex justify-center mb-4">
                          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl bg-gradient-to-br from-blue-500 to-indigo-500 ring-2 ring-blue-500/50">
                            {winner.nickname[0].toUpperCase()}
                          </div>
                        </div>
                        <h4 className="text-xl font-semibold text-white mb-2">
                          {winner.nickname}
                        </h4>
                        <p className="text-blue-300 mb-4">Lone Survivor</p>
                        <div className="inline-block bg-blue-900/30 text-blue-300 border border-blue-500/30 rounded-lg py-2 px-4 font-mono font-bold text-xl">
                          {winner.total_points} points earned
                        </div>
                      </div>
                    </Card>
                  </CardItem>
                </motion.div>
              )}

              {/* Action buttons */}
              <motion.div
                variants={item}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <CardItem translateZ={40}>
                  <GradientButton
                    onClick={handleShareResults}
                    className="w-full py-3 flex items-center justify-center"
                    gradientFrom="from-blue-500"
                    gradientTo="to-indigo-600"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    {copied ? "Results Copied!" : "Share Results"}
                  </GradientButton>
                </CardItem>

                <CardItem translateZ={40}>
                  <GradientButton
                    onClick={handleResetAndReturn}
                    className="w-full py-3 flex items-center justify-center"
                    gradientFrom="from-slate-500"
                    gradientTo="to-slate-700"
                    variant="secondary"
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Return to Home Base
                  </GradientButton>
                </CardItem>
              </motion.div>

              <motion.div
                variants={item}
                className="text-center mt-8 text-xs text-slate-500"
              >
                Exit automatically in 60 seconds
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardBody>
    </CardContainer>
  );
}
