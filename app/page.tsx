"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserRoomStore } from "@/store/user-room-store";
import { motion, AnimatePresence } from "framer-motion";

// Aceternity UI Components

import { Spotlight } from "@/components/ui/spotlight";
import GamifiedTitle from "@/components/ui/GamifiedTitle"; // Added import

import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
// import { Vortex } from "@/components/ui/vortex";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { CosmicParticlesBackground } from "@/components/ui/cosmic-particles-background";

// Custom Components
import GameStatistics from "@/components/GameStats";

// Sound Utilities
import {
  playSound,
  preloadSounds,
  stopSound,
  stopAllSounds,
  SOUND_PATHS,
} from "@/utils/soundUtils";

// Icons
import { Gamepad2, Users, Clock, ArrowRight } from "lucide-react";
import GameFooter from "@/components/GameFooter";

export default function HomeScreen() {
  const router = useRouter();
  const { currentRoom, createAndJoinRoom, joinRoom, resetState } =
    useUserRoomStore();
  const [activeTab, setActiveTab] = useState("create");

  // Create room form state
  const [nickname, setNickname] = useState("");
  const [totalRounds, setTotalRounds] = useState(3);
  const [timeLimit, setTimeLimit] = useState(60);

  // Join room form state
  const [roomCode, setRoomCode] = useState("");
  const [joinNickname, setJoinNickname] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  // Play sound effect on button click
  const playClickSound = () => {
    playSound(SOUND_PATHS.categorySelect, "category");
  };

  // Play typing sound
  const playTypingSound = () => {
    playSound(SOUND_PATHS.typingKeypress, "typing", false);
  };

  // Play rick roll sound
  const playRickRoll = () => {
    playSound(SOUND_PATHS.rickRoll, "results", false);
  };
  useEffect(() => {
    resetState();

    // Clear any reload detection flags when reaching home page
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("pageUnloadTime");
      sessionStorage.removeItem("lastPathname");
      sessionStorage.removeItem("lastLocation");
    }

    // Preload sounds when the component mounts
    preloadSounds();

    // Stop any previous sounds that might be playing
    stopAllSounds();

    // Delay showing the form for a better entrance animation
    setTimeout(() => {
      setIsFormVisible(true);
    }, 800);

    return () => {
      // No cleanup needed for sounds here
    };
  }, [resetState]);

  useEffect(() => {
    if (currentRoom) {
      stopAllSounds(false); // Add this line
      router.push(`/lobby/${currentRoom.id}`);
    }
  }, [currentRoom, router]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    playClickSound();

    if (!nickname.trim()) {
      setError("Please enter a nickname");
      setIsLoading(false);
      return;
    }

    const result = await createAndJoinRoom({
      nickname: nickname.trim(),
      totalRounds,
      timeLimit,
    });

    if (!result.success) {
      setError(result.error || "Failed to create room");
    }
    setIsLoading(false);
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    playClickSound();

    if (!roomCode.trim() || !joinNickname.trim()) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    const result = await joinRoom({
      roomCode: roomCode.trim().toUpperCase(),
      nickname: joinNickname.trim(),
    });

    if (!result.success) {
      setError(result.error || "Failed to join room");
    }
    setIsLoading(false);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        when: "beforeChildren",
      },
    },
    exit: {
      opacity: 0,
      y: -50,
      transition: { duration: 0.4 },
    },
  };

  const formVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: {
      opacity: 1,
      height: "auto",
      transition: {
        duration: 0.5,
      },
    },
  };

  const errorVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 500, damping: 15 },
    },
  };
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 w-full h-full z-0 bg-black"></div>
      {/* Particles Background */}
      <CosmicParticlesBackground
        particleColors={[
          "rgba(59, 130, 246, 0.6)",
          "rgba(139, 92, 246, 0.6)",
          "rgba(236, 72, 153, 0.6)",
          "rgba(16, 185, 129, 0.6)",
        ]}
        baseHue={260}
        particleCount={80}
        connectionDistance={150}
      />
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20 z-10"
        fill="blue"
      />
      {/* Title */}
      <div className="w-full max-w-4xl text-center relative z-10 mb-4 md:mb-8">
        {" "}
        {/* Adjusted mb */}
        <GamifiedTitle title="SayWhat" />
      </div>
      {/* Main Content */}
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
        className="w-full max-w-lg relative z-20"
      >
        <CardContainer className="w-full">
          <CardBody className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/70 rounded-2xl p-8 shadow-xl">
            {/* Tabs */}
            <div className="flex gap-6 mb-8 relative">
              <motion.div
                className="absolute bottom-0 h-1.5 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                animate={{
                  left: activeTab === "create" ? "0%" : "50%",
                  width: "50%",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />

              <CardItem
                translateZ={30}
                as={motion.button}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 py-3 rounded-t text-lg font-medium relative ${
                  activeTab === "create"
                    ? "text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gradient-to-r after:from-blue-400 after:to-purple-500"
                    : "text-slate-400"
                }`}
                onClick={() => {
                  setActiveTab("create");
                  playClickSound();
                }}
              >
                Create Game
              </CardItem>

              <CardItem
                translateZ={30}
                as={motion.button}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 py-3 rounded-t text-lg font-medium relative ${
                  activeTab === "join"
                    ? "text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gradient-to-r after:from-cyan-400 after:to-teal-500"
                    : "text-slate-400"
                }`}
                onClick={() => {
                  setActiveTab("join");
                  playClickSound();
                }}
              >
                Join Game
              </CardItem>
            </div>
            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  variants={errorVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="mb-6 p-4 bg-red-900/40 border border-red-500 text-red-200 rounded-lg flex items-center"
                >
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse mr-3"></span>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
            {/* Form Section */}
            <AnimatePresence mode="wait">
              {isFormVisible && (
                <motion.div
                  key={activeTab}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={formVariants}
                >
                  {activeTab === "create" ? (
                    <form onSubmit={handleCreateRoom} className="space-y-6">
                      <CardItem translateZ={30} className="w-full">
                        <div>
                          <div className="mb-2.5 flex items-center text-base">
                            <Users className="w-5 h-5 mr-2.5 text-purple-400 flex-shrink-0" />
                            <TextGenerateEffect
                              words="Your Nickname"
                              className="text-slate-300 text-base"
                              duration={0.3}
                            />
                          </div>
                          <motion.input
                            whileFocus={{
                              scale: 1.02,
                              borderColor: "#a78bfa",
                              boxShadow: "0 0 15px rgba(167, 139, 250, 0.5)",
                            }}
                            type="text"
                            value={nickname}
                            onChange={(e) => {
                              setNickname(e.target.value);
                              playTypingSound();
                            }}
                            className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-purple-300 text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none placeholder-slate-500 shadow-[0_0_0px_theme(colors.purple.400)] focus:shadow-[0_0_15px_theme(colors.purple.300)] transition-shadow duration-300 font-special-elite typewriter-cursor"
                            disabled={isLoading}
                            placeholder="Enter your name..."
                          />
                        </div>
                      </CardItem>
                      <CardItem translateZ={40} className="w-full">
                        <div>
                          <label className="block mb-2 text-slate-300 flex items-center">
                            <Gamepad2 className="w-4 h-4 mr-2 text-blue-400" />
                            Number of Rounds
                            <span className="text-sm text-slate-400 ml-2 font-light">
                              (each player becomes the decider)
                            </span>
                          </label>
                          <motion.div className="flex gap-3">
                            {[3, 5, 7].map((num) => (
                              <motion.button
                                key={num}
                                type="button"
                                whileHover={{ scale: 1.05, y: -3 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setTotalRounds(num);
                                  playClickSound();
                                }}
                                className={`flex-1 py-3 border ${
                                  totalRounds === num
                                    ? "bg-blue-900/40 border-blue-500 text-blue-200"
                                    : "bg-slate-800/50 border-slate-700 text-white"
                                } rounded-lg font-medium transition-all duration-200`}
                              >
                                {num}
                              </motion.button>
                            ))}
                          </motion.div>
                        </div>
                      </CardItem>
                      <CardItem translateZ={50} className="w-full">
                        <div>
                          <label className="block mb-2 text-slate-300 flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-cyan-400" />
                            Time Limit (per turn)
                          </label>
                          <motion.div className="flex gap-3">
                            {[30, 60, 90].map((time) => (
                              <motion.button
                                key={time}
                                type="button"
                                whileHover={{ scale: 1.05, y: -3 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setTimeLimit(time);
                                  playClickSound();
                                }}
                                className={`flex-1 py-3 border ${
                                  timeLimit === time
                                    ? "bg-cyan-900/40 border-cyan-500 text-cyan-200"
                                    : "bg-slate-800/50 border-slate-700 text-white"
                                } rounded-lg font-medium transition-all duration-200`}
                              >
                                {time}s
                              </motion.button>
                            ))}
                          </motion.div>
                        </div>
                      </CardItem>
                      <CardItem translateZ={60} className="w-full">
                        <div
                          className={`w-full ${isLoading ? "bg-blue-800/70" : "bg-blue-900/80"} text-white border ${isLoading ? "border-blue-600/80" : "border-blue-700/50 hover:border-blue-600"} rounded-[0.75rem] relative overflow-hidden transition-colors duration-300`}
                        >
                          <div
                            className={`absolute inset-0 bg-[radial-gradient(var(--blue-500)_40%,transparent_60%)] ${isLoading ? "opacity-70" : "opacity-100"}`}
                          ></div>
                          <motion.button
                            type="submit"
                            disabled={isLoading}
                            className={`h-full w-full z-10 relative flex items-center justify-center px-6 py-4 ${isLoading ? "bg-gradient-to-r from-blue-700/80 to-purple-700/80" : "bg-gradient-to-r from-blue-600/70 to-purple-600/70"} rounded-[0.6rem] transition-all`}
                            whileHover={
                              isLoading
                                ? {}
                                : {
                                    letterSpacing: "0.05em",
                                    scale: 1.02,
                                  }
                            }
                            whileTap={isLoading ? {} : { scale: 0.98 }}
                          >
                            {isLoading ? (
                              <div className="inline-flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                                <span className="text-white/90 font-medium">
                                  Creating Lobby...
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center">
                                <span className="font-semibold">
                                  Create Game Room
                                </span>
                                <ArrowRight className="w-5 h-5 ml-2" />
                              </div>
                            )}
                          </motion.button>
                        </div>
                      </CardItem>
                    </form>
                  ) : (
                    <form onSubmit={handleJoinRoom} className="space-y-6">
                      <CardItem translateZ={30} className="w-full">
                        <HoverBorderGradient
                          containerClassName="w-full"
                          className="p-4 bg-slate-800/50 rounded-lg"
                        >
                          <label className="block mb-2 text-slate-300">
                            Room Code
                          </label>
                          <motion.input
                            whileFocus={{ scale: 1.02, borderColor: "#0ea5e9" }}
                            type="text"
                            value={roomCode}
                            onChange={(e) => {
                              setRoomCode(e.target.value.toUpperCase());
                              playTypingSound();
                            }}
                            className="w-full p-3 bg-slate-800/70 border border-slate-600 rounded-lg text-white uppercase tracking-widest font-mono focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                            disabled={isLoading}
                            maxLength={6}
                            placeholder="ENTER CODE"
                          />
                        </HoverBorderGradient>
                      </CardItem>

                      <CardItem translateZ={40} className="w-full">
                        <div>
                          <div className="mb-2.5 flex items-center text-base">
                            <Users className="w-5 h-5 mr-2.5 text-teal-400 flex-shrink-0" />
                            <TextGenerateEffect
                              words="Your Nickname"
                              className="text-slate-300 text-base"
                              duration={0.3}
                            />
                          </div>
                          <motion.input
                            whileFocus={{
                              scale: 1.02,
                              borderColor: "#5eead4",
                              boxShadow: "0 0 15px rgba(94, 234, 212, 0.5)",
                            }}
                            type="text"
                            value={joinNickname}
                            onChange={(e) => {
                              setJoinNickname(e.target.value);
                              playTypingSound();
                            }}
                            className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-teal-300 text-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder-slate-500 shadow-[0_0_0px_theme(colors.teal.400)] focus:shadow-[0_0_15px_theme(colors.teal.300)] transition-shadow duration-300 font-special-elite typewriter-cursor"
                            disabled={isLoading}
                            placeholder="Enter your name..."
                          />
                        </div>
                      </CardItem>

                      <CardItem translateZ={60} className="w-full">
                        <div
                          className={`w-full ${isLoading ? "bg-emerald-800/70" : "bg-emerald-900/80"} text-white border ${isLoading ? "border-emerald-600/80" : "border-emerald-700/50 hover:border-emerald-600"} rounded-[0.75rem] relative overflow-hidden transition-colors duration-300`}
                        >
                          <div
                            className={`absolute inset-0 bg-[radial-gradient(var(--emerald-500)_40%,transparent_60%)] ${isLoading ? "opacity-70" : "opacity-100"}`}
                          ></div>
                          <motion.button
                            type="submit"
                            disabled={isLoading}
                            className={`h-full w-full z-10 relative flex items-center justify-center px-6 py-4 ${isLoading ? "bg-gradient-to-r from-emerald-700/80 to-teal-700/80" : "bg-gradient-to-r from-emerald-600/70 to-teal-600/70"} rounded-[0.6rem] transition-all`}
                            whileHover={
                              isLoading
                                ? {}
                                : {
                                    letterSpacing: "0.05em",
                                    scale: 1.02,
                                  }
                            }
                            whileTap={isLoading ? {} : { scale: 0.98 }}
                          >
                            {isLoading ? (
                              <div className="inline-flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                                <span className="text-white/90 font-medium">
                                  Joining Game...
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center">
                                <span className="font-semibold">Join Game</span>
                                <ArrowRight className="w-5 h-5 ml-2" />
                              </div>
                            )}
                          </motion.button>
                        </div>
                      </CardItem>
                    </form>
                  )}{" "}
                </motion.div>
              )}
            </AnimatePresence>
          </CardBody>
        </CardContainer>
      </motion.div>
      {/* Rick Roll Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, type: "spring", bounce: 0.6 }}
        className="relative z-20 mt-10"
      >
        <CardItem translateZ={100} className="relative">
          <motion.button
            onClick={playRickRoll}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 p-0.5 font-black text-xl shadow-xl transition-all hover:shadow-[0_0_40px_8px_rgba(255,0,0,0.5)]"
            whileHover={{
              scale: 1.05,
              rotate: [0, -1, 1, -1, 0],
              transition: { rotate: { repeat: 3, duration: 0.3 } },
            }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="block rounded-[0.70rem] bg-black px-6 py-3 text-center transition-all group-hover:bg-transparent">
              <span className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 bg-clip-text font-bold text-transparent transition-all group-hover:text-black">
                ⚠️ Don't Click Here ⚠️
              </span>
              <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-red-500 shadow-lg shadow-red-900/40 animate-ping"></span>
            </span>
            <span className="absolute -inset-4 z-0 transform-gpu rounded-2xl bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 opacity-30 blur-xl transition-all"></span>
          </motion.button>
        </CardItem>
      </motion.div>
      {/* Statistics Footer */}
      <div className="mt-16 relative z-10">
        <GameStatistics />
        <GameFooter />
      </div>
    </div>
  );
}
