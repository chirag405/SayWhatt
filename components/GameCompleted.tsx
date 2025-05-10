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
  Music,
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
  const [showResults, setShowResults] = useState(true);

  // Fix: Ensure each player has point values and handle single player case
  const playersWithPoints = players.map((player) => ({
    ...player,
    total_points: player.total_points ?? 0,
  }));

  // Set drum roll complete immediately when only one player
  const [drumRollComplete, setDrumRollComplete] = useState(
    players.length === 1
  );

  // Sort players by points
  const sortedPlayers = [...playersWithPoints].sort(
    (a, b) => b.total_points - a.total_points
  );
  const winner = sortedPlayers[0];

  useEffect(() => {
    // Play sound on initial load
    playSound(SOUND_PATHS.resultsReveal, "results");

    // Auto-reset timer (1 minute)
    const resetTimer = setTimeout(() => {
      handleResetAndReturn();
    }, 60000); // 60 seconds = 1 minute

    return () => {
      clearTimeout(resetTimer);
    };
  }, []);

  const handlePlaySound = () => {
    playSound(SOUND_PATHS.categorySelect, "category", false);
  };

  const handleShareResults = () => {
    const results = `🎮 SayWhat Game Results:\n🏆 ${sortedPlayers
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
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.4 } },
  };

  // Trophy animation with bounce
  const trophyVariants = {
    initial: { scale: 0, rotate: -15, y: 20 },
    animate: {
      scale: 1,
      rotate: 0,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 0.5,
      },
    },
  };

  // Drum roll animation component
  const DrumRollAnimation = () => (
    <motion.div
      className="flex flex-col items-center justify-center py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative mb-8">
        <motion.div
          className="absolute inset-0 bg-yellow-400 blur-2xl rounded-full opacity-20"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{
            rotate: { duration: 3, repeat: Infinity, ease: "linear" },
            scale: { duration: 1, repeat: Infinity, ease: "easeInOut" },
          }}
          className="relative z-10"
        >
          <Music className="w-20 h-20 text-purple-400" />
        </motion.div>
      </div>

      <GlowingText className="text-3xl md:text-4xl font-bold text-center">
        Calculating Results
      </GlowingText>

      <div className="flex gap-3 mt-8">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-4 h-4 rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
            animate={{
              y: [0, -12, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );

  // Bounce animation for results reveal
  const bounceVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
        mass: 0.8,
        delay: 0.1,
      },
    },
  };

  return (
    <CardContainer perspective={1500} className="w-full max-w-4xl mx-auto">
      <CardBody className="bg-slate-900/60 backdrop-blur-md border border-purple-500/20 rounded-2xl p-6 md:p-8 shadow-lg group/card">
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover/card:border-amber-500/50 transition-all duration-500 pointer-events-none" />

        <AnimatePresence mode="wait">
          {!drumRollComplete ? (
            <DrumRollAnimation />
          ) : (
            <motion.div
              className="max-w-2xl mx-auto"
              variants={container}
              initial="hidden"
              animate={showResults ? "show" : "hidden"}
            >
              {/* Victory Banner */}
              <motion.div
                variants={item}
                className="text-center mb-12"
                initial="hidden"
                animate={showResults ? "visible" : "hidden"}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/20 to-transparent blur-3xl rounded-full transform scale-150 -z-10" />
                  <Sparkles>
                    <TextGenerateEffect
                      words="Mission Complete!"
                      className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-500 pb-2"
                      duration={0.8}
                    />
                  </Sparkles>
                </div>
                <p className="text-purple-300 text-lg mt-4">
                  Your operative excellence has been recorded
                </p>
              </motion.div>

              {/* Winner section */}
              <motion.div
                variants={item}
                initial="hidden"
                animate={showResults ? "visible" : "hidden"}
              >
                <CardItem translateZ={80}>
                  <HoverBorderGradient
                    containerClassName="w-full rounded-2xl"
                    className="p-6 mb-8 text-center"
                    gradientClassName="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500"
                  >
                    <div className="flex justify-center mb-6">
                      <motion.div
                        className="relative"
                        variants={trophyVariants}
                        initial="initial"
                        animate={showResults ? "animate" : "initial"}
                      >
                        <div className="absolute inset-0 bg-yellow-400 blur-xl rounded-full opacity-30 transform scale-150 -z-10" />
                        <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full p-6 shadow-lg shadow-amber-500/30">
                          <Trophy className="w-16 h-16 text-white" />
                        </div>
                      </motion.div>
                    </div>

                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={
                        showResults
                          ? { scale: 1, opacity: 1 }
                          : { scale: 0.8, opacity: 0 }
                      }
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 15,
                        delay: 0.8,
                      }}
                    >
                      <h2 className="text-3xl font-bold mb-2 text-white">
                        {winner.nickname} Wins!
                      </h2>
                      <div className="inline-block bg-amber-900/30 text-amber-300 border border-amber-500/30 rounded-lg py-2 px-4 font-mono font-bold text-2xl">
                        {winner.total_points} points
                      </div>
                    </motion.div>
                  </HoverBorderGradient>
                </CardItem>
              </motion.div>

              {/* Players ranking */}
              <motion.div
                variants={item}
                initial="hidden"
                animate={showResults ? "visible" : "hidden"}
              >
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
                          initial={{ x: -20, opacity: 0 }}
                          animate={
                            showResults
                              ? { x: 0, opacity: 1 }
                              : { x: -20, opacity: 0 }
                          }
                          transition={{
                            delay: showResults ? 0.3 + index * 0.1 : 0,
                            duration: 0.4,
                            type: "spring",
                            damping: 15,
                          }}
                          whileHover={{
                            backgroundColor: "rgba(139, 92, 246, 0.1)",
                          }}
                        >
                          <div className="flex-shrink-0 w-8 text-center font-mono font-bold">
                            {index === 0 ? (
                              <Crown className="h-6 w-6 text-yellow-500 mx-auto" />
                            ) : index === 1 ? (
                              <span className="text-slate-400 text-lg">#2</span>
                            ) : index === 2 ? (
                              <span className="text-amber-700 text-lg">#3</span>
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

              {/* Action buttons */}
              <motion.div
                variants={item}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                initial="hidden"
                animate={showResults ? "visible" : "hidden"}
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
