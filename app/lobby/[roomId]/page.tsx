"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useUserRoomStore } from "@/store/user-room-store";
import { useTabCloseHandler } from "@/utils/useTabCloseHandler";
import { useGameStore } from "@/store/game-store";
import { motion, AnimatePresence } from "framer-motion";
import BackgroundBeams from "@/components/ui/acernity/background-beams";
import Spotlight from "@/components/ui/acernity/spotlight";
import GamingIllustration from "@/components/ui/acernity/gaming-illustration";
import AcernitySpotlight from "@/components/ui/acernity/spotlight";
import {
  CardContainer,
  CardBody,
  CardItem,
} from "@/components/ui/acernity/ThreeDCard";

import Meteors from "@/components/ui/acernity/meteors";
import {
  Users,
  Crown,
  Clock,
  Share2,
  ChevronDown,
  LogOut,
  PlayCircle,
} from "lucide-react";

export default function LobbyScreen() {
  const router = useRouter();
  const params = useParams();
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

  // Import the startGame function directly from the game store
  const { startGame } = useGameStore();

  const [isLeaving, setIsLeaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const [subscriptionsActive, setSubscriptionsActive] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useTabCloseHandler(currentUser?.id || null, currentRoom?.id || null);

  // Fetch initial data with better error handling
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        if (!params.roomId) {
          router.push("/");
          return;
        }

        // Only fetch if we don't have the room or it's a different room
        if (!currentRoom || currentRoom.id !== params.roomId) {
          const { room, success, error } = await fetchRoomById(
            params.roomId as string
          );

          if (!mounted) return;

          if (!success || !room) {
            console.log("Failed to fetch room or room not found:", error);
            router.push("/");
            return;
          }

          if (room.game_status === "in_progress") {
            console.log("Game in progress, redirecting to game screen");
            router.push(`/game/${room.id}`);
            return;
          }
        }

        if (!mounted) return;

        if (currentRoom?.game_status === "in_progress") {
          console.log("Room status is in_progress, redirecting to game");
          router.push(`/game/${currentRoom.id}`);
          return;
        }

        if (!currentUser) {
          console.log("No current user, redirecting to home");
          router.push("/");
          return;
        }

        if (currentRoom && mounted) {
          try {
            await fetchPlayersInRoom(currentRoom.id);
          } catch (playerErr) {
            console.error("Error fetching players:", playerErr);
            // Continue anyway to show at least the room
          }
        }
      } catch (err) {
        console.error("Error in loadData:", err);
        if (mounted) {
          setError("Failed to load game data. Please try again.");
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [params.roomId]);

  // Set up subscriptions when room is loaded - better error handling
  useEffect(() => {
    if (!currentRoom) return;

    let mounted = true;
    const cleanupFunctions: (() => void)[] = [];

    console.log("Setting up subscriptions for room:", currentRoom.id);

    try {
      const unsubscribeRoom = subscribeToRoom(currentRoom.id);
      cleanupFunctions.push(unsubscribeRoom);

      const unsubscribePlayers = subscribeToPlayers(currentRoom.id);
      cleanupFunctions.push(unsubscribePlayers);

      if (mounted) {
        setSubscriptionsActive(true);
      }
    } catch (err) {
      console.error("Error setting up subscriptions:", err);
      if (mounted) {
        setError("Connection issues. Please refresh the page.");
      }
    }

    return () => {
      mounted = false;
      console.log("Cleaning up subscriptions");
      cleanupFunctions.forEach((cleanup) => {
        try {
          cleanup();
        } catch (e) {
          console.error("Error during subscription cleanup:", e);
        }
      });
      setSubscriptionsActive(false);
    };
  }, [currentRoom?.id]);

  // More robust redirect to game when game status changes
  useEffect(() => {
    let redirectTimeout: NodeJS.Timeout;

    console.log("Current room status check:", currentRoom?.game_status);
    if (currentRoom?.game_status === "in_progress") {
      console.log("Redirecting to game screen for room:", currentRoom.id);

      // Add a small delay to ensure all state is updated before navigation
      redirectTimeout = setTimeout(() => {
        router.push(`/game/${currentRoom.id}`);
      }, 100);
    }

    return () => {
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [currentRoom?.game_status, router, currentRoom?.id]);

  // Function to start the game with better error handling
  const handleStartGame = async () => {
    if (!currentRoom || !currentUser) {
      setError("Missing room or user information");
      return;
    }

    setIsStarting(true);
    setError("");

    try {
      console.log("Starting game for room:", currentRoom.id);

      // Call startGame from the game store
      const success = await startGame(currentRoom.id, currentUser.id);

      if (!success) {
        throw new Error("Failed to start game");
      }

      console.log(
        "Game started successfully, game status should update via subscription"
      );

      // Force a manual check to ensure we get the latest room status
      await refreshRoomStatus(currentRoom.id);

      // Force navigation with a delay if subscription doesn't trigger quickly enough
      setTimeout(() => {
        if (currentRoom?.game_status === "in_progress") {
          console.log("Forcing navigation to game screen");
          router.push(`/game/${currentRoom.id}`);
        } else {
          // If status still hasn't updated, try once more with a force flag
          refreshRoomStatus(currentRoom.id).then(() => {
            if (currentRoom?.game_status === "in_progress") {
              router.push(`/game/${currentRoom.id}`);
            } else {
              console.error("Game started but status not updated");
              setError("Game started but status not updated. Please refresh.");
              setIsStarting(false);
            }
          });
        }
      }, 1000);
    } catch (error) {
      console.error("Error starting game:", error);
      setError(error instanceof Error ? error.message : "Failed to start game");
      setIsStarting(false);
    }
  };

  // Poll for room status periodically as backup - with error handling
  useEffect(() => {
    if (!currentRoom?.id) return;

    let pollCount = 0;
    const MAX_POLLS = 30; // Stop polling after ~90 seconds

    const statusInterval = setInterval(async () => {
      pollCount++;
      console.log(
        `Polling for room status updates (${pollCount}/${MAX_POLLS})`
      );

      try {
        await refreshRoomStatus(currentRoom.id);

        // If we've been polling too long, stop to save resources
        if (pollCount >= MAX_POLLS) {
          console.log("Max polling attempts reached, stopping poll");
          clearInterval(statusInterval);
        }
      } catch (err) {
        console.error("Error polling room status:", err);
        // Don't clear the interval, just keep trying
      }
    }, 3000);

    return () => clearInterval(statusInterval);
  }, [currentRoom?.id, refreshRoomStatus]);

  // Function to leave the room with better error handling
  const handleLeaveRoom = async () => {
    if (!currentUser) return;

    setIsLeaving(true);
    setError("");

    try {
      const { success, error } = await deletePlayer(currentUser.id);

      if (success) {
        resetState();
        router.push("/");
      } else {
        console.error("Error leaving room:", error);
        setError(error || "Failed to leave room");
        setIsLeaving(false);
      }
    } catch (err) {
      console.error("Exception in handleLeaveRoom:", err);
      setError("An unexpected error occurred");
      setIsLeaving(false);
    }
  };

  const copyRoomCode = () => {
    if (!currentRoom) return;

    navigator.clipboard
      .writeText(currentRoom.room_code)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy room code:", err);
      });
  };

  // Reset state when navigating away - more robust approach
  useEffect(() => {
    return () => {
      // Get current pathname to check if we're going to game page
      const pathname = window.location.pathname;
      if (!pathname.includes("/game")) {
        console.log(
          "Navigating away from lobby (not to game), resetting state"
        );
        resetState();
      } else {
        console.log("Navigating to game page, preserving state");
      }
    };
  }, [resetState]);

  // Loading state while data is being fetched
  if (!currentRoom || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex justify-center items-center p-4">
        <BackgroundBeams className="opacity-20" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-lg shadow-xl p-8 relative z-10"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="h-8 w-8 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin mr-3"></div>
            <h2 className="text-xl font-semibold text-white">
              Loading Game Lobby...
            </h2>
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-center mt-2"
            >
              {error}
            </motion.p>
          )}
        </motion.div>
      </div>
    );
  }

  const isHost = currentUser.id === currentRoom.host_id;
  const minimumPlayers = 2; // Define minimum players needed

  console.log("room status:", currentRoom.game_status);
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4 overflow-hidden relative">
      <BackgroundBeams className="opacity-20" />
      <AcernitySpotlight
        className="-top-40 -left-20 md:left-60 md:-top-20"
        fill="blue"
      />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Room Header */}
          <CardContainer className="mb-6">
            <CardBody className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-6 shadow-xl">
              <div className="flex flex-col items-center">
                {/* Room Code Display */}
                <motion.div className="relative" whileHover={{ scale: 1.02 }}>
                  <div
                    className="bg-gradient-to-r from-indigo-900 to-purple-900 p-4 px-6 rounded-xl mb-4 relative overflow-hidden group cursor-pointer"
                    onClick={copyRoomCode}
                  >
                    <div className="absolute inset-0 bg-blue-500/10 transform rotate-45 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                    <div className="flex items-center justify-center">
                      <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300 tracking-wider">
                        {currentRoom.room_code}
                      </h1>
                      <Share2 className="ml-3 h-5 w-5 text-blue-400 opacity-70 group-hover:opacity-100" />
                    </div>
                    <div className="text-xs text-center text-blue-300 mt-1 opacity-80">
                      Click to copy room code
                    </div>

                    <AnimatePresence>
                      {copySuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute bottom-0 left-0 right-0 bg-green-500/20 text-green-300 text-center text-xs py-1"
                        >
                          Copied to clipboard!
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Game Settings */}
                <div className="flex flex-wrap justify-center gap-4 mb-6">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-slate-800/60 backdrop-blur-sm p-3 px-4 rounded-lg flex items-center"
                  >
                    <Clock className="h-5 w-5 text-cyan-400 mr-2" />
                    <span className="text-slate-300">
                      {currentRoom.time_limit}s per turn
                    </span>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-slate-800/60 backdrop-blur-sm p-3 px-4 rounded-lg flex items-center"
                  >
                    <Users className="h-5 w-5 text-purple-400 mr-2" />
                    <span className="text-slate-300">
                      {currentRoom.total_rounds} rounds
                    </span>
                  </motion.div>
                </div>

                <p className="text-xs text-slate-400 italic mb-5">
                  Each round consists of every player getting a turn as the
                  decider
                </p>

                {/* Subscription status indicator for debugging - can be removed in production */}
                {process.env.NODE_ENV === "development" && (
                  <div className="text-xs text-gray-500 text-center mb-2">
                    Connection status:{" "}
                    <span
                      className={
                        subscriptionsActive ? "text-green-400" : "text-red-400"
                      }
                    >
                      {subscriptionsActive ? "Active ✓" : "Inactive ✗"}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleLeaveRoom}
                    disabled={isLeaving}
                    className="bg-red-500/80 hover:bg-red-600 text-white px-6 py-2 rounded-lg flex items-center font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {isLeaving ? "Leaving..." : "Leave Room"}
                  </motion.button>

                  {isHost && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleStartGame}
                      disabled={
                        isStarting || roomPlayers.length < minimumPlayers
                      }
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-2 rounded-lg flex items-center font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      {isStarting ? "Starting..." : "Start Game"}
                    </motion.button>
                  )}
                </div>

                {isHost && roomPlayers.length < minimumPlayers && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mt-4 text-red-400 bg-red-900/20 px-3 py-1 rounded"
                  >
                    Need at least {minimumPlayers} players to start
                  </motion.p>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mt-4 text-red-400 bg-red-900/20 px-3 py-1 rounded"
                  >
                    {error}
                  </motion.p>
                )}
              </div>
            </CardBody>
          </CardContainer>

          {/* Players List */}
          <CardContainer className="mb-6">
            <CardBody className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-400" />
                Players ({roomPlayers.length})
              </h2>

              {roomPlayers.length === 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-slate-400 text-center py-8"
                >
                  No players have joined yet
                </motion.p>
              )}

              <div className="space-y-2">
                <AnimatePresence>
                  {roomPlayers.map((player, index) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        player.id === currentUser.id
                          ? "bg-blue-900/30 border border-blue-700/50"
                          : "bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 text-white font-bold">
                          {player.nickname.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white">
                          {player.nickname}
                        </span>
                        {player.id === currentRoom.host_id && (
                          <div className="flex items-center bg-amber-900/30 text-amber-300 px-2 py-1 text-xs rounded border border-amber-700/30">
                            <Crown className="h-3 w-3 mr-1" />
                            Host
                          </div>
                        )}
                      </div>

                      {player.id === currentUser.id && (
                        <span className="text-blue-300 text-sm bg-blue-900/30 px-2 py-1 rounded">
                          You
                        </span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardBody>
          </CardContainer>

          {/* Room info and help section */}
          <CardContainer className="mb-6">
            <CardBody className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-6 shadow-xl overflow-hidden">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowHelp(!showHelp)}
              >
                <h3 className="text-lg font-medium text-white">How to Play</h3>
                <motion.div
                  animate={{ rotate: showHelp ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="h-5 w-5 text-blue-400" />
                </motion.div>
              </div>

              <AnimatePresence>
                {showHelp && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 space-y-3">
                      <p className="text-sm text-slate-300">
                        Share the room code with friends to have them join your
                        game. Once everyone is here, the host can start the
                        game.
                      </p>
                      <p className="text-sm text-slate-300">
                        In each round, players take turns being the "decider"
                        who chooses the winning submission from the other
                        players.
                      </p>
                      <div className="text-sm text-blue-300 bg-blue-900/20 p-3 rounded-lg border border-blue-800/30 mt-2">
                        Click on the room code to copy it to your clipboard for
                        easy sharing!
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardBody>
          </CardContainer>
        </motion.div>
      </div>
    </div>
  );
}
