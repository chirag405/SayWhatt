"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserRoomStore } from "@/store/user-room-store";
import { motion, AnimatePresence } from "framer-motion";
import BackgroundBeams from "@/components/ui/acernity/background-beams";
import Spotlight from "@/components/ui/acernity/spotlight";
import GamingIllustration from "@/components/ui/acernity/gaming-illustration";
import {
  CardContainer,
  CardBody,
  CardItem,
} from "@/components/ui/acernity/ThreeDCard";
import Meteors from "@/components/ui/acernity/meteors";
import GameStatistics from "@/components/GameStats";
import { SoundSettings } from "@/components/SoundSettings";
import {
  playSound,
  preloadSounds,
  stopSound,
  SOUND_PATHS,
} from "@/utils/soundUtils";

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

  useEffect(() => {
    resetState();

    // Preload sounds when the component mounts
    preloadSounds();

    // Stop any previous lobby music that might be playing
    stopSound(SOUND_PATHS.lobby);

    // Delay showing the form for a better entrance animation
    setTimeout(() => {
      setIsFormVisible(true);
    }, 800);

    return () => {
      // We don't stop sounds when leaving the home page
      // This allows lobby music to continue playing when transitioning to the lobby
    };
  }, []);

  useEffect(() => {
    if (currentRoom) {
      router.push(`/lobby/${currentRoom.id}`);
    }
  }, [currentRoom]);

  const handleCreateRoom = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

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

  const handleJoinRoom = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Sound Settings Button - positioned in top-right corner */}
      <div className="absolute top-4 right-4 z-20">
        <SoundSettings />
      </div>

      {/* Background Effects */}
      <BackgroundBeams className="opacity-20" />
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="blue" />

      {/* Floating Meteors Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <Meteors number={10} />
      </div>

      {/* Main Content */}
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
        className="w-full max-w-md relative z-10"
      >
        <CardContainer className="w-full">
          <CardBody className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl">
            {/* Game Title */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-center mb-8"
            >
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-500 to-blue-500">
                Game Room
              </h1>
              <div className="mt-3">
                <GamingIllustration className="h-24 mx-auto" />
              </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 relative">
              <motion.div
                className="absolute bottom-0 h-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                animate={{
                  left: activeTab === "create" ? "0%" : "50%",
                  width: "50%",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 py-3 rounded-t font-medium ${
                  activeTab === "create" ? "text-white" : "text-slate-400"
                }`}
                onClick={() => setActiveTab("create")}
              >
                Create Room
              </motion.button>

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 py-3 rounded-t font-medium ${
                  activeTab === "join" ? "text-white" : "text-slate-400"
                }`}
                onClick={() => setActiveTab("join")}
              >
                Join Room
              </motion.button>
            </div>

            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  variants={errorVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="mb-4 p-3 bg-red-900/40 border border-red-500 text-red-200 rounded-lg"
                >
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
                    <form onSubmit={handleCreateRoom} className="space-y-4">
                      <div>
                        <label className="block mb-2 text-slate-300">
                          Your Nickname
                        </label>
                        <motion.input
                          whileFocus={{ scale: 1.02 }}
                          type="text"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          disabled={isLoading}
                          placeholder="Enter your name"
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-slate-300">
                          Number of Rounds
                          <span className="text-sm text-slate-400 ml-2 font-light">
                            (each player gets to be the decider once per round)
                          </span>
                        </label>
                        <motion.select
                          whileFocus={{ scale: 1.02 }}
                          value={totalRounds}
                          onChange={(e) =>
                            setTotalRounds(Number(e.target.value))
                          }
                          className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          disabled={isLoading}
                        >
                          <option value={3}>3 Rounds</option>
                          <option value={5}>5 Rounds</option>
                          <option value={7}>7 Rounds</option>
                        </motion.select>
                      </div>

                      <div>
                        <label className="block mb-2 text-slate-300">
                          Time Limit (per turn)
                        </label>
                        <motion.select
                          whileFocus={{ scale: 1.02 }}
                          value={timeLimit}
                          onChange={(e) => setTimeLimit(Number(e.target.value))}
                          className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          disabled={isLoading}
                        >
                          <option value={30}>30 Seconds</option>
                          <option value={60}>60 Seconds</option>
                          <option value={90}>90 Seconds</option>
                        </motion.select>
                      </div>

                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <svg
                              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Creating Game Room...
                          </div>
                        ) : (
                          "Create & Start Game"
                        )}
                      </motion.button>
                    </form>
                  ) : (
                    <form onSubmit={handleJoinRoom} className="space-y-4">
                      <div>
                        <label className="block mb-2 text-slate-300">
                          Room Code
                        </label>
                        <motion.input
                          whileFocus={{ scale: 1.02 }}
                          type="text"
                          value={roomCode}
                          onChange={(e) =>
                            setRoomCode(e.target.value.toUpperCase())
                          }
                          className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white uppercase tracking-wider font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          disabled={isLoading}
                          maxLength={6}
                          placeholder="ENTER CODE"
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-slate-300">
                          Your Nickname
                        </label>
                        <motion.input
                          whileFocus={{ scale: 1.02 }}
                          type="text"
                          value={joinNickname}
                          onChange={(e) => setJoinNickname(e.target.value)}
                          className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          disabled={isLoading}
                          placeholder="Enter your name"
                        />
                      </div>

                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <svg
                              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Joining Game...
                          </div>
                        ) : (
                          "Join Game"
                        )}
                      </motion.button>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardBody>
        </CardContainer>
      </motion.div>

      {/* Statistics Footer */}
      <div className="mt-8 relative z-10">
        <GameStatistics />
      </div>
    </div>
  );
}
