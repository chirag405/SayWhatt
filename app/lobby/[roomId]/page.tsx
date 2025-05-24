"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUserRoomStore } from "@/store/user-room-store";
import { useTabCloseHandler } from "@/utils/useTabCloseHandler";
import { useGameStore } from "@/store/game-store";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";

import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card"; // Updated import for TypeScript support

// import { Vortex } from "@/components/ui/vortex"; // NEW
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"; // NEW
import { Button as AceternityButton } from "@/components/ui/moving-border"; // NEW
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient"; // NEW (Optional for extra flair)
import { CosmicParticlesBackground } from "@/components/ui/cosmic-particles-background";
import { useToast } from "@/components/ui/toast"; // NEW for toast notifications
// Lucide Icons
import {
  Users,
  Crown,
  Clock,
  Share2,
  ChevronDown,
  LogOut,
  PlayCircle,
  Info, // For How to Play
  AlertTriangle, // For errors
  Copy, // NEW for copy icon
  CheckCircle, // NEW for copy success
} from "lucide-react";

// Sound Utilities
import {
  playSound,
  SOUND_PATHS,
  preloadSounds,
  stopSound,
  stopAllSounds,
  checkAndStartLobbyMusic,
} from "@/utils/soundUtils";
import { SoundSettings } from "@/components/SoundSettings";

import { Spotlight } from "@/components/ui/spotlight";

// Placeholder for a more gamified loading spinner
const GamifiedLoader = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-t-purple-500 border-r-blue-500 border-b-pink-500 border-l-transparent rounded-full animate-spin"></div>
      <PlayCircle className="absolute inset-0 m-auto h-8 w-8 text-cyan-400 animate-pulse" />
    </div>
    <TextGenerateEffect
      words={text}
      className="text-xl font-semibold text-slate-200"
      duration={0.5}
    />
  </div>
);

export default function LobbyScreen() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const { showToast, ToastContainer } = useToast(); // NEW Toast hook
  const {
    currentRoom,
    currentUser,
    roomPlayers,
    fetchRoomById,
    fetchPlayersInRoom,
    subscribeToRoom,
    subscribeToPlayers,
    deletePlayer,
    resetState,
    refreshRoomStatus,
  } = useUserRoomStore();

  const { startGame } = useGameStore();

  const [isLeaving, setIsLeaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const [subscriptionsActive, setSubscriptionsActive] = useState(false); // Kept for dev info
  const [showHelp, setShowHelp] = useState(false);
  const [copySuccess, setCopySuccess] = useState(""); // Changed to string for better animation key

  useTabCloseHandler(currentUser?.id || null, currentRoom?.id || null);

  useEffect(() => {
    // Ensure sounds are preloaded first
    preloadSounds();

    // Start lobby music automatically when entering the lobby screen
    checkAndStartLobbyMusic();

    return () => {
      // Only stop lobby music when actually leaving the app
      // Don't stop when navigating to game page
      if (!window.location.pathname.includes("/game/")) {
        console.log("Leaving lobby, stopping music");
        stopSound(SOUND_PATHS.lobby, false);
      }
    };
  }, []);

  // Separate function for playing UI sounds
  const playClickSound = () => {
    playSound(SOUND_PATHS.categorySelect, "category", false);
  };

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        if (!params.roomId) {
          router.push("/");
          return;
        }
        if (!currentRoom || currentRoom.id !== params.roomId) {
          const {
            room,
            success,
            error: fetchError,
          } = await fetchRoomById(params.roomId as string);
          if (!mounted) return;
          if (!success || !room) {
            console.log("Failed to fetch room:", fetchError);
            router.push("/");
            return;
          }
          if (room.game_status === "in_progress") {
            showToast({
              message: "This game has already started!",
              type: "error",
              duration: 5000,
              position: "top-center",
            });
            setTimeout(() => {
              router.push("/");
            }, 2000);
            return;
          }
        }
        if (!mounted) return;
        if (currentRoom?.game_status === "in_progress") {
          showToast({
            message: "This game has already started!",
            type: "error",
            duration: 5000,
            position: "top-center",
          });
          setTimeout(() => {
            router.push("/");
          }, 2000);
          return;
        }
        if (!currentUser) {
          router.push("/");
          return;
        }
        if (currentRoom && mounted) {
          await fetchPlayersInRoom(currentRoom.id);
        }
      } catch (err) {
        console.error("Error in loadData:", err);
        if (mounted)
          setError(
            "System Malfunction: Failed to load game data. Please try re-entering the portal."
          );
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [params.roomId, currentRoom?.id]); // Added currentRoom.id to dependencies

  useEffect(() => {
    if (!currentRoom?.id) return;
    let mounted = true;
    const cleanupFunctions: (() => void)[] = [];
    try {
      cleanupFunctions.push(subscribeToRoom(currentRoom.id));
      cleanupFunctions.push(subscribeToPlayers(currentRoom.id));
      if (mounted) setSubscriptionsActive(true);
    } catch (err) {
      console.error("Error setting up subscriptions:", err);
      if (mounted)
        setError(
          "Connection Anomaly: Real-time updates might be unstable. Refresh advised."
        );
    }
    return () => {
      mounted = false;
      cleanupFunctions.forEach((cleanup) => {
        try {
          cleanup();
        } catch (e) {
          console.error("Cleanup Error:", e);
        }
      });
      setSubscriptionsActive(false);
    };
  }, [currentRoom?.id]);

  useEffect(() => {
    if (!currentRoom?.id || currentRoom?.game_status !== "waiting") return;
    const playerJoinChannel = supabase.channel(`player-join-${currentRoom.id}`);
    playerJoinChannel
      .on("broadcast", { event: "player-joined" }, () => {
        playSound(SOUND_PATHS.playerJoin, "lobby");
      })
      .subscribe();
    return () => {
      supabase.removeChannel(playerJoinChannel);
    };
  }, [currentRoom?.id, currentRoom?.game_status, supabase]); // Added supabase to dependencies

  useEffect(() => {
    let redirectTimeout: NodeJS.Timeout;
    if (currentRoom?.game_status === "in_progress") {
      redirectTimeout = setTimeout(
        () => router.push(`/game/${currentRoom.id}`),
        100
      );
    }
    return () => {
      if (redirectTimeout) clearTimeout(redirectTimeout);
    };
  }, [currentRoom?.game_status, router, currentRoom?.id]);

  const handleStartGame = async () => {
    if (!currentRoom || !currentUser) {
      setError("Critical Error: Room or User data missing.");
      return;
    }
    setIsStarting(true);
    setError("");
    try {
      stopAllSounds(false); // Pass false to stop lobby music as well
      playSound(SOUND_PATHS.transition, "results");
      const success = await startGame(currentRoom.id, currentUser.id);
      if (!success) throw new Error("Game failed to initialize.");
      router.push(`/game/${currentRoom.id}`);
      // Backup navigation removed for brevity as primary push should be reliable with Next.js router.
    } catch (error) {
      console.error("Error starting game:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Launch Sequence Failed. Try again."
      );
      setIsStarting(false);
    }
  };

  useEffect(() => {
    // Status Polling
    if (!currentRoom?.id) return;
    let pollCount = 0;
    const MAX_POLLS = 30;
    const statusInterval = setInterval(async () => {
      pollCount++;
      try {
        await refreshRoomStatus(currentRoom.id);
        if (pollCount >= MAX_POLLS) clearInterval(statusInterval);
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 3000);
    return () => clearInterval(statusInterval);
  }, [currentRoom?.id, refreshRoomStatus]);

  const handleLeaveRoom = async () => {
    if (!currentUser) return;
    setIsLeaving(true);
    setError("");
    try {
      const { success, error: deleteError } = await deletePlayer(
        currentUser.id
      );
      if (success) {
        resetState();
        router.push("/");
      } else {
        setError(deleteError || "Ejection Failed. Manual exit required.");
        setIsLeaving(false);
      }
    } catch (err) {
      setError("Unexpected Ejection Error.");
      setIsLeaving(false);
    }
  };
  const copyRoomCode = () => {
    if (!currentRoom) return;
    playSound(SOUND_PATHS.categorySelect, "copy", false);
    navigator.clipboard
      .writeText(currentRoom.room_code)
      .then(() => {
        showToast({
          message: "Game code copied to clipboard! Share with friends!",
          type: "success",
          duration: 2500,
          position: "bottom-center",
        });
        setCopySuccess("Code Copied!");
        setTimeout(() => setCopySuccess(""), 2000);
      })
      .catch((err) => {
        showToast({
          message: "Failed to copy room code",
          type: "error",
          duration: 3000,
          position: "bottom-center",
        });
        setCopySuccess("Copy Failed!");
        console.error("Failed to copy:", err);
      });
  };
  useEffect(() => {
    // Reset state on navigate away or reload
    return () => {
      const pathname = window.location.pathname;
      if (!pathname.includes("/game/")) resetState();
    };
  }, [resetState]);

  // Removed duplicate reload handler - now using the universal ReloadHandler component

  if (!currentRoom || !currentUser) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
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
        {/* Single Vortex component for the loading state */}
        {/* <Vortex
          backgroundColor="transparent"
          className="fixed inset-0 w-full h-full z-0"
          baseHue={260}
          rangeY={200}
        /> */}

        <CardContainer className="relative z-10">
          <CardBody className="bg-slate-900/70 backdrop-blur-lg border border-slate-700 rounded-2xl p-8 shadow-2xl shadow-purple-500/30">
            <GamifiedLoader
              text={error ? "Error Encountered" : "Entering Lobby Matrix..."}
            />
            {error && (
              <CardItem translateZ={20} className="w-full mt-4">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-center p-3 bg-red-700/20 border border-red-500/50 rounded-lg"
                >
                  <AlertTriangle className="inline h-5 w-5 mr-2" /> {error}
                </motion.p>
              </CardItem>
            )}
          </CardBody>
        </CardContainer>
      </div>
    );
  }

  const isHost = currentUser.id === currentRoom.host_id;
  const minimumPlayers = 2;
  console.log("are u the host ", isHost);
  return (
    <div className="min-h-screen bg-black p-4 md:p-6 lg:p-8 overflow-hidden relative">
      {/* Toast Container for notifications */}
      <ToastContainer />

      {/* Background Effects */}
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
      {/* <Vortex
        backgroundColor="transparent"
        className="fixed inset-0 w-full h-full z-0"
        particleColors={["#3b82f6", "#8b5cf6", "#ec4899", "#10b981"]}
        rangeY={200}
        baseHue={260}
      /> */}

      <Spotlight
        className="-top-40 -left-20 md:left-60 md:-top-20 z-[1]"
        fill="blue"
      />

      <div className="absolute top-6 right-6 z-50">
        <CardContainer className="w-auto h-auto">
          <CardItem
            translateZ={50}
            rotateX={-15}
            rotateZ={10}
            className="p-1 bg-slate-800/60 backdrop-blur-lg border border-slate-700 rounded-lg hover:shadow-2xl hover:shadow-cyan-500/50"
          >
            <SoundSettings />
          </CardItem>
        </CardContainer>
      </div>

      {/* Main content - Now organized in a top-to-bottom structure with two columns */}
      <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[calc(100vh-4rem)]">
        {/* Left Column - For room info and host controls */}
        <div className="flex flex-col space-y-6">
          <CardContainer perspective={1200}>
            <CardBody className="bg-slate-900/75 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-8 md:p-10 shadow-2xl shadow-purple-600/40 group/card">
              <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover/card:border-purple-500/70 transition-all duration-500 pointer-events-none animate-pulse-border" />

              <div className="flex flex-col items-center space-y-6">
                {" "}
                <CardItem translateZ={80} className="w-full text-center">
                  <TextGenerateEffect
                    words="Lobby"
                    className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 pb-2"
                  />
                  <p className="text-md text-slate-400 mt-2">
                    Prepare for assignment, Operative{" "}
                    <span className="text-cyan-300 font-semibold">
                      {currentUser.nickname}
                    </span>
                    !
                  </p>
                </CardItem>{" "}
                <CardItem translateZ={60} className="w-full max-w-lg">
                  {" "}
                  <div
                    className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-6 rounded-xl cursor-pointer relative overflow-hidden border-2 border-slate-700/70 hover:border-cyan-500/70 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 group"
                    onClick={() => {
                      copyRoomCode();
                    }}
                  >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-cyan-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col space-y-2">
                        <span className="text-xs font-medium text-slate-400">
                          GAME CODE
                        </span>
                        <div className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-300 to-purple-300 tracking-widest font-mono">
                          {currentRoom.room_code}
                        </div>
                      </div>
                      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-cyan-900/50 border border-cyan-700/50 group-hover:bg-cyan-800/70 group-hover:border-cyan-600/70 transition-all duration-300">
                        {copySuccess ? (
                          <CheckCircle className="h-5 w-5 text-green-400 animate-pulse" />
                        ) : (
                          <Copy className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                        )}
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <span className="text-sm text-slate-400 group-hover:text-cyan-300 transition-colors duration-300">
                        {copySuccess
                          ? copySuccess
                          : "Click to copy & share with friends"}
                      </span>
                    </div>

                    {/* Pulse effect when hovering */}
                    <div className="absolute inset-0 bg-cyan-500/5 scale-0 group-hover:scale-100 rounded-xl transition-transform duration-300 origin-center" />
                  </div>
                </CardItem>
                <div className="flex flex-wrap justify-center gap-5 w-full">
                  {[
                    {
                      icon: Clock,
                      label: `${currentRoom.time_limit}s / Turn`,
                      valueKey: "time",
                      color: "text-cyan-400",
                    },
                    {
                      icon: Users,
                      label: `${currentRoom.total_rounds} Rounds`,
                      valueKey: "rounds",
                      color: "text-purple-400",
                    },
                  ].map((item) => (
                    <CardItem
                      key={item.valueKey}
                      translateZ={40}
                      whileHover={{ y: -3, scale: 1.05 }}
                      className="bg-slate-800/70 backdrop-blur-sm p-4 px-6 rounded-xl flex items-center space-x-3 border border-slate-700 shadow-md"
                    >
                      <item.icon className={`h-6 w-6 ${item.color}`} />
                      <span className="text-slate-200 text-base font-medium">
                        {item.label}
                      </span>
                    </CardItem>
                  ))}
                </div>
              </div>

              {/* Game Controls Section - PROMINENTLY POSITIONED */}
              {isHost && (
                <div className="mt-12 pt-8 border-t border-slate-700/50">
                  <CardItem translateZ={100} className="w-full">
                    <div
                      className={`w-full ${
                        roomPlayers.length >= minimumPlayers
                          ? "bg-emerald-900/80 border-emerald-700/50 hover:border-emerald-600"
                          : "bg-gray-700/80 border-gray-600/50"
                      } text-white border-2 rounded-xl relative overflow-hidden shadow-lg`}
                    >
                      <div
                        className={`absolute inset-0 ${
                          roomPlayers.length >= minimumPlayers
                            ? "bg-[radial-gradient(var(--emerald-400)_40%,transparent_60%)]"
                            : "bg-[radial-gradient(var(--gray-500)_40%,transparent_60%)]"
                        }`}
                      ></div>
                      <motion.button
                        className={`color-w h-full w-full z-10 relative flex items-center justify-center px-8 py-5 ${
                          roomPlayers.length >= minimumPlayers && !isStarting
                            ? "bg-emerald-600/50 hover:bg-emerald-500/70"
                            : isStarting
                              ? "bg-emerald-700/70"
                              : "bg-gray-600/50 cursor-not-allowed"
                        } rounded-lg transition-all`}
                        whileHover={
                          roomPlayers.length >= minimumPlayers && !isStarting
                            ? { letterSpacing: "0.05em", scale: 1.02 }
                            : {}
                        }
                        whileTap={
                          roomPlayers.length >= minimumPlayers && !isStarting
                            ? { scale: 0.98 }
                            : {}
                        }
                        onClick={() => {
                          if (
                            roomPlayers.length >= minimumPlayers &&
                            !isStarting
                          ) {
                            handleStartGame();
                            playSound(
                              SOUND_PATHS.categorySelect,
                              "start",
                              false
                            );
                          }
                        }}
                        disabled={
                          isStarting || roomPlayers.length < minimumPlayers
                        }
                        title={
                          roomPlayers.length < minimumPlayers
                            ? `Need at least ${minimumPlayers} players to start`
                            : ""
                        }
                      >
                        {isStarting ? (
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                        ) : (
                          <PlayCircle className="h-8 w-8 mr-3" />
                        )}
                        <span className="text-xl font-semibold">
                          {isStarting
                            ? "Initializing Mission..."
                            : roomPlayers.length < minimumPlayers
                              ? `Need ${minimumPlayers - roomPlayers.length} more player(s)`
                              : "LAUNCH MISSION"}
                        </span>
                      </motion.button>
                    </div>
                  </CardItem>

                  {roomPlayers.length < minimumPlayers && (
                    <CardItem translateZ={20} className="w-full mt-4">
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center text-yellow-400 bg-yellow-900/30 px-6 py-3 rounded-lg border border-yellow-700/50 shadow-md"
                      >
                        <AlertTriangle className="inline h-5 w-5 mr-2" />
                        Awaiting Reinforcements:{" "}
                        {minimumPlayers - roomPlayers.length} more Operative(s)
                        needed.
                      </motion.p>
                    </CardItem>
                  )}
                </div>
              )}
            </CardBody>
          </CardContainer>

          {/* Exit Game Button */}
          <div className="flex justify-center mt-4">
            <CardItem translateZ={50} className="w-full max-w-md">
              <div className="w-full bg-red-900/80 text-white border border-red-700/50 hover:border-red-600 rounded-[0.75rem] relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(var(--red-500)_40%,transparent_60%)]"></div>
                <motion.button
                  className="h-full w-full z-10 relative flex items-center justify-center px-8 py-3.5 bg-red-600/50 hover:bg-red-500/70 rounded-[0.6rem] transition-all"
                  whileHover={{ letterSpacing: "0.05em", scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleLeaveRoom();
                    playClickSound();
                  }}
                  disabled={isLeaving}
                >
                  <LogOut className="h-6 w-6 mr-3" />
                  <span className="text-lg">
                    {isLeaving ? "Exiting..." : "Exit Mission"}
                  </span>
                </motion.button>
              </div>
            </CardItem>
          </div>

          {/* Error Display */}
          {error && (
            <CardItem translateZ={20} className="w-full max-w-lg mx-auto mt-4">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-red-300 bg-red-900/40 px-6 py-3 rounded-lg border border-red-700/60 shadow-md"
              >
                <AlertTriangle className="inline h-5 w-5 mr-2" /> {error}
              </motion.p>
            </CardItem>
          )}
        </div>

        {/* Right Column - For players list and mission briefing */}
        <div className="flex flex-col space-y-6">
          {/* Players List */}
          <CardContainer perspective={1000} className="h-full">
            <CardBody className="bg-slate-900/70 backdrop-blur-lg border border-slate-700/70 rounded-2xl p-6 md:p-8 shadow-xl shadow-blue-500/30 group/card flex flex-col">
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover/card:border-blue-500/60 transition-all duration-500 pointer-events-none animate-pulse-border-blue" />

              <CardItem
                translateZ={50}
                as="h2"
                className="text-2xl md:text-3xl font-semibold mb-6 text-white flex items-center"
              >
                <Users className="h-7 w-7 mr-4 text-blue-400" />
                Operatives Deployed ({roomPlayers.length})
              </CardItem>

              <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] pr-2">
                {roomPlayers.length === 0 ? (
                  <CardItem translateZ={20} className="w-full">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-slate-400 text-center py-16 text-xl italic"
                    >
                      No operatives detected in this sector. Awaiting
                      arrivals...
                    </motion.p>
                  </CardItem>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {roomPlayers.map((player, index) => (
                        <CardItem
                          key={player.id}
                          translateZ={30 + index * 2} // Staggered 3D effect
                          as={motion.div}
                          initial={{ opacity: 0, x: -30, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 30, scale: 0.95 }}
                          transition={{
                            delay: index * 0.08,
                            type: "spring",
                            stiffness: 100,
                            damping: 15,
                          }}
                          className={`flex items-center justify-between p-4 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.015] ${
                            player.id === currentUser.id
                              ? "bg-blue-700/40 border border-blue-500/70 ring-2 ring-blue-400/50"
                              : "bg-slate-800/60 border border-slate-700/50 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <CardItem
                              translateZ={10}
                              className="h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-700 text-white font-bold text-lg shadow-inner"
                              onClick={() => {}}
                              whileHover={{}}
                            >
                              {player.nickname.charAt(0).toUpperCase()}
                            </CardItem>
                            <div className="flex flex-col">
                              {" "}
                              <CardItem
                                translateZ={5}
                                as="span"
                                className="font-medium text-slate-100 text-lg font-special-elite"
                                onClick={() => {}}
                                whileHover={{}}
                              >
                                {player.nickname}
                                {player.id === currentUser.id && (
                                  <span className="ml-2 text-blue-300 text-sm bg-blue-800/40 px-2 py-0.5 rounded-md border border-blue-600/50">
                                    You
                                  </span>
                                )}
                              </CardItem>
                              {player.id === currentRoom.host_id && (
                                <CardItem
                                  translateZ={15}
                                  className="flex items-center bg-amber-600/30 text-amber-300 px-2 py-0.5 mt-1 text-xs rounded-md border border-amber-500/40 shadow-sm w-fit"
                                  onClick={() => {}}
                                  whileHover={{}}
                                >
                                  <Crown className="h-3 w-3 mr-1" />
                                  <span>Sector Commander</span>
                                </CardItem>
                              )}
                            </div>
                          </div>
                        </CardItem>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <CardItem
                translateZ={20}
                className="text-sm text-slate-400 italic text-center max-w-xl mt-6 mx-auto"
              >
                Each round, one Operative becomes the Decider. Wisdom and wit
                are your weapons.
              </CardItem>

              {process.env.NODE_ENV === "development" && (
                <CardItem
                  translateZ={10}
                  className="text-xs text-gray-600 text-center mt-4"
                >
                  Matrix Sync:{" "}
                  <span
                    className={
                      subscriptionsActive ? "text-green-500" : "text-red-500"
                    }
                  >
                    {subscriptionsActive ? "Online" : "Offline"}
                  </span>
                </CardItem>
              )}
            </CardBody>
          </CardContainer>

          {/* Mission Briefing Card */}
          <CardContainer perspective={1000}>
            <CardBody className="bg-slate-900/70 backdrop-blur-lg border border-slate-700/70 rounded-2xl p-6 md:p-8 shadow-xl shadow-teal-500/30 group/card overflow-visible">
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover/card:border-teal-500/60 transition-all duration-500 pointer-events-none animate-pulse-border-teal" />
              <CardItem
                translateZ={40}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => {
                  setShowHelp(!showHelp);
                  playClickSound();
                }}
              >
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <Info className="h-5 w-5 mr-2.5 text-teal-400" />
                  Mission Briefing
                </h3>
                <motion.div
                  animate={{ rotate: showHelp ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="h-6 w-6 text-teal-400" />
                </motion.div>
              </CardItem>
              <AnimatePresence>
                {showHelp && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{
                      height: "auto",
                      opacity: 1,
                      marginTop: "1.5rem",
                    }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="overflow-visible"
                  >
                    <CardItem
                      translateZ={20}
                      className="space-y-4 text-sm text-slate-300 leading-relaxed"
                      scaleEffect={false}
                    >
                      <p>
                        Welcome, Operative. Your mission parameters have been
                        initialized:
                      </p>
                      <ul className="list-disc list-inside space-y-2 pl-2">
                        <li>
                          Transmit the{" "}
                          <strong className="text-cyan-300">Room Code</strong>{" "}
                          to your fellow operatives.
                        </li>
                        <li>
                          Once all operatives are assembled, the{" "}
                          <strong className="text-amber-300">
                            Sector Commander (Host)
                          </strong>{" "}
                          activates the mission protocol.
                        </li>
                        <li>
                          In each operation phase, operatives will take turns as
                          the{" "}
                          <strong className="text-purple-300">Decider</strong>.
                        </li>
                        <li>
                          The MethHead analyzes submissions from all operatives
                          and identifies the most strategic response.
                        </li>
                        <li>
                          Submissions are evaluated by our tactical assessment
                          protocol. Results are classified until the operation
                          concludes.
                        </li>
                        <li>
                          Victory requires creativity, strategic thinking, and
                          tactical adaptation.
                        </li>
                      </ul>
                      <div className="text-sm text-teal-300 bg-teal-900/30 p-3.5 rounded-lg border border-teal-700/40 mt-3">
                        <Info className="inline h-4 w-4 mr-1.5" />
                        Tip: Tap the Room Code above for instant clipboard
                        transmission. Maintain operational security.
                      </div>
                    </CardItem>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardBody>
          </CardContainer>
        </div>
      </div>

      {/* Styling for animated borders and custom fonts if needed */}
      <style jsx global>{`
        .animate-pulse-border {
          /* For purple cards */
          animation: pulse-border-purple 4s infinite ease-in-out;
        }
        @keyframes pulse-border-purple {
          0%,
          100% {
            border-color: rgba(168, 85, 247, 0.2);
            box-shadow: 0 0 10px rgba(168, 85, 247, 0.1);
          }
          50% {
            border-color: rgba(168, 85, 247, 0.6);
            box-shadow: 0 0 25px rgba(168, 85, 247, 0.25);
          }
        }
        .group-hover\\/card:hover .animate-pulse-border {
          animation-duration: 2s;
        }

        .animate-pulse-border-blue {
          /* For blue cards */
          animation: pulse-border-blue 4.2s infinite ease-in-out;
        }
        @keyframes pulse-border-blue {
          0%,
          100% {
            border-color: rgba(59, 130, 246, 0.2);
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.1);
          }
          50% {
            border-color: rgba(59, 130, 246, 0.6);
            box-shadow: 0 0 25px rgba(59, 130, 246, 0.25);
          }
        }
        .group-hover\\/card:hover .animate-pulse-border-blue {
          animation-duration: 2.1s;
        }

        .animate-pulse-border-teal {
          /* For teal cards */
          animation: pulse-border-teal 4.4s infinite ease-in-out;
        }
        @keyframes pulse-border-teal {
          0%,
          100% {
            border-color: rgba(20, 184, 166, 0.2);
            box-shadow: 0 0 10px rgba(20, 184, 166, 0.1);
          }
          50% {
            border-color: rgba(20, 184, 166, 0.6);
            box-shadow: 0 0 25px rgba(20, 184, 166, 0.25);
          }
        }
        .group-hover\\/card:hover .animate-pulse-border-teal {
          animation-duration: 2.2s;
        }

        /* Example for a more distinct mono font for Room Code if needed */
        /* @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400..900&display=swap'); */
        .mono-font-display {
          /* font-family: 'Orbitron', sans-serif; */ /* Or any other cool mono/display font */
        }
      `}</style>
    </div>
  );
}
