"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// Types and Stores
import { Scenario } from "@/types/types";
import { useGameStore } from "@/store/game-store";
import { useUserRoomStore } from "@/store/user-room-store";

// Components
import { VotingPhase } from "@/components/VotingPhase";
import { CategorySelection } from "@/components/CategorySelection";
import { ScenarioSelection } from "@/components/ScenarioSelection";

import { AnswerSubmission } from "@/components/AnswerSubmission";
import { useTabCloseHandler } from "@/utils/useTabCloseHandler";
import { GameCompleted } from "@/components/GameCompleted";
import { GameTimer } from "@/components/GameTimer";
import { GameSidebar } from "@/components/GameSidebar";
import { Card } from "@/components/ui/card";
import { GradientButton } from "@/components/ui/gradient-button";
import { GlowingText } from "@/components/ui/glowing-text";
import { SoundSettings } from "@/components/SoundSettings";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
// import { Vortex } from "@/components/ui/vortex";
import { CosmicParticlesBackground } from "@/components/ui/cosmic-particles-background";

import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

// Sound utilities
import {
  preloadSounds,
  playSound,
  stopAllSounds,
  SOUND_PATHS,
  checkAndStartLobbyMusic,
} from "@/utils/soundUtils";
import { createClient } from "@/utils/supabase/client";
import { Spotlight } from "@/components/ui/spotlight";

// Icons
import {
  Clock,
  AlertTriangle,
  Trophy,
  Users,
  ArrowLeft,
  Home,
  Star,
  Zap,
  User,
} from "lucide-react";
import { toast } from "sonner";

export default function GameScreen() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.roomId as string;
  const supabase = createClient();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [subscriptionsActive, setSubscriptionsActive] = useState<{
    main: boolean;
    turn: boolean;
    round: boolean;
  }>({ main: false, turn: false, round: false });
  const [animationComplete, setAnimationComplete] = useState(false);

  // References for tracking previous state
  const prevTurnStateRef = useRef<string | null>(null);
  const prevRoundNumberRef = useRef<number | null>(null);
  const timerTickRef = useRef<NodeJS.Timeout | null>(null);
  const timerEndValueRef = useRef<string | null>(null);

  // Store hooks
  const {
    currentUser,
    currentRoom,
    roomPlayers,
    fetchRoomById,
    fetchPlayersInRoom,
    subscribeToRoom,
    subscribeToPlayers,
    subscribeToDeciderHistory,
    currentTurn,
    isRoundVotingPhase,
    currentRound,
    subscribeToRounds,
    deletePlayer,
    resetState,
  } = useUserRoomStore();
  const {
    subscribeToTurns,
    currentGame,
    subscribeToGame,
    subscribeToAnswers,
    subscribeToVotes,
    subscribeToScenarios,
    timerEnd,
    getScenarioById: storeGetScenarioById,
    isProcessingAI,
  } = useGameStore();

  // Computed values
  const gameCompleted = currentGame?.room.game_status === "completed";
  const roundNumber = currentRound?.round_number || 0;
  const totalRounds = currentRoom?.total_rounds || 0;
  const isDecider = currentTurn?.decider_id === currentUser?.id;
  const turnNumber = currentTurn?.turn_number || 0;
  const timeLeft = timerEnd
    ? Math.max(
        0,
        Math.floor((new Date(timerEnd).getTime() - Date.now()) / 1000)
      )
    : 0;

  useTabCloseHandler(currentUser?.id || null, currentRoom?.id || null);
  // Preload sounds when component mounts but keep lobby music playing
  useEffect(() => {
    // Preload game-related sounds for later use
    preloadSounds();
    checkAndStartLobbyMusic(); // Add this line

    // Instead of stopping all sounds, we'll keep lobby music playing
    // This allows continuous background music throughout the game

    return () => {
      // Only stop game-specific sounds, not lobby music when leaving
      // We'll manage lobby music via settings only
    };
  }, []);

  // Track timer end value for timer tick sound
  useEffect(() => {
    timerEndValueRef.current = timerEnd ? timerEnd.toISOString() : null;
  }, [timerEnd]);

  // Play timer tick sound during the last 10 seconds
  useEffect(() => {
    // Clear existing interval if any
    if (timerTickRef.current) {
      clearInterval(timerTickRef.current);
      timerTickRef.current = null;
    }

    // Only set up interval if we're in the answering phase and have a timer
    if (currentTurn?.status === "answering" && timerEnd) {
      timerTickRef.current = setInterval(() => {
        const endTime = new Date(timerEndValueRef.current || "").getTime();
        const currentTime = Date.now();
        const secondsLeft = Math.floor((endTime - currentTime) / 1000);

        // Play tick sound in the last 10 seconds
        if (secondsLeft > 0 && secondsLeft <= 10) {
          playSound(SOUND_PATHS.timerTick, "category");
        }

        // Clear interval when time runs out
        if (secondsLeft <= 0 && timerTickRef.current) {
          clearInterval(timerTickRef.current);
          timerTickRef.current = null;
        }
      }, 1000);
    }

    return () => {
      if (timerTickRef.current) {
        clearInterval(timerTickRef.current);
        timerTickRef.current = null;
      }
    };
  }, [currentTurn?.status, timerEnd]);

  // Subscribe to real-time vote events to play voting sounds
  useEffect(() => {
    if (!currentTurn?.id) return;

    const voteChannel = supabase.channel(`realtime-votes-${currentTurn.id}`);

    voteChannel
      .on("broadcast", { event: "vote-cast" }, (payload) => {
        const { voteType } = payload.payload;
        if (voteType === "up") {
          playSound(SOUND_PATHS.voteUp, "voting");
        } else if (voteType === "down") {
          playSound(SOUND_PATHS.voteDown, "voting");
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(voteChannel);
    };
  }, [currentTurn?.id]);

  // Listen for turn and round transitions to play sounds
  useEffect(() => {
    // Track if turn state changed
    if (
      prevTurnStateRef.current !== currentTurn?.status &&
      currentTurn?.status
    ) {
      prevTurnStateRef.current = currentTurn.status;

      // Play sound when category/scenario gets selected
      if (
        currentTurn.status === "selecting_scenario" ||
        currentTurn.status === "answering"
      ) {
        playSound(SOUND_PATHS.categorySelect, "category");
      }

      // Play transition sound when turn status changes
      if (
        currentTurn.status === "voting" ||
        currentTurn.status === "completed"
      ) {
        playSound(SOUND_PATHS.transition, "results");
      }
    }

    // Track if round changed
    if (prevRoundNumberRef.current !== roundNumber && roundNumber > 0) {
      // Play transition sound when round changes
      if (prevRoundNumberRef.current !== null) {
        playSound(SOUND_PATHS.transition, "results");
      }
      prevRoundNumberRef.current = roundNumber;
    }

    // Play final results sound when game completes
    if (gameCompleted && prevTurnStateRef.current !== "completed") {
      playSound(SOUND_PATHS.resultsReveal, "results");
      prevTurnStateRef.current = "completed";
    } // Check if only one player remains - this should trigger game completion
    if (currentGame?.players.length === 1 && !gameCompleted) {
      console.log("Only one player left, ending game");
      // Force room status to completed if not already done by database trigger
      const updateRoomToCompleted = async () => {
        const supabase = createClient();
        try {
          // Update room status
          await supabase
            .from("rooms")
            .update({
              game_status: "completed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", roomId);

          // Also update any active rounds
          if (currentRound?.id) {
            await supabase
              .from("rounds")
              .update({
                status: "completed",
                is_complete: true,
              })
              .eq("id", currentRound.id);
          }

          // Force refresh game state to ensure UI updates
          fetchRoomById(roomId);

          // Play results sound
          playSound(SOUND_PATHS.resultsReveal, "results");
        } catch (error) {
          console.error("Error updating room status:", error);
        }
      };
      updateRoomToCompleted();
    }
  }, [
    currentTurn?.status,
    roundNumber,
    gameCompleted,
    currentGame?.players.length,
    roomId,
  ]);

  // Subscribe to player departure events
  useEffect(() => {
    if (!roomId || !currentUser?.id) return;

    const playerDepartureChannel = supabase.channel(
      `players-departure:${roomId}`
    );
    playerDepartureChannel
      .on("broadcast", { event: "PLAYER_DELETED" }, (payload) => {
        const departedPlayerId = payload.payload.playerId;
        const departedPlayerName = payload.payload.playerName || "A player";
        const wasDecider = payload.payload.wasDecider;
        const wasHost = payload.payload.wasHost;
        const gameCompleted = payload.payload.gameCompleted;

        // Show notification to users
        let message = `${departedPlayerName} has left the game.`;
        let variant = "default";

        if (wasDecider) {
          message = `${departedPlayerName} (Decider) has left the game. A new decider has been assigned.`;
          variant = "destructive";
        } else if (wasHost) {
          message = `${departedPlayerName} (Host) has left the game. A new host has been assigned.`;
          variant = "warning";
        }

        // Force refresh game state after a player leaves
        fetchRoomById(roomId);

        // If the game is completed (only one player remains), show a special message and update UI
        if (gameCompleted) {
          message = `${departedPlayerName} has left. Only one player remains. Moving to results screen...`;
          variant = "destructive";

          // Force room status to completed - belt and suspenders approach
          const updateRoomToCompleted = async () => {
            const supabase = createClient();
            try {
              await supabase
                .from("rooms")
                .update({
                  game_status: "completed",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", roomId);

              // Also update any active rounds
              const { data } = await supabase
                .from("rounds")
                .select("id")
                .eq("room_id", roomId)
                .eq("is_complete", false)
                .limit(1);

              if (data && data.length > 0) {
                await supabase
                  .from("rounds")
                  .update({
                    status: "completed",
                    is_complete: true,
                  })
                  .eq("id", data[0].id);
              }

              // Force refresh to ensure UI updates
              fetchRoomById(roomId);
            } catch (error) {
              console.error("Error updating room status:", error);
            }
          };

          updateRoomToCompleted();
        }

        // Show toast notification
        toast(message, {
          style: {
            backgroundColor:
              variant === "destructive"
                ? "#f87171"
                : variant === "warning"
                  ? "#fbbf24"
                  : "#374151",
            color: "#fff",
          },
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(playerDepartureChannel);
    };
  }, [roomId, currentUser?.id, fetchRoomById]);
  // Data initialization and subscriptions
  useEffect(() => {
    if (!roomId) return;

    // Removed duplicate reload handler - now using the universal ReloadHandler component

    let mounted = true;
    const cleanupFunctions: (() => void)[] = [];

    const initGame = async () => {
      if (!mounted) return;
      setIsLoading(true);

      try {
        const roomResult = await fetchRoomById(roomId);
        if (!roomResult.success)
          throw new Error(roomResult.error || "Failed to fetch room");
        if (!mounted) return;

        await fetchPlayersInRoom(roomId);
        cleanupFunctions.push(
          subscribeToRoom(roomId),
          subscribeToPlayers(roomId),
          subscribeToGame(roomId),
          subscribeToRounds(roomId)
        );
        setSubscriptionsActive((prev) => ({ ...prev, main: true }));
        // setIsLoading(false); // Moved into criticalDataPromise resolution
        // setTimeout(() => mounted && setAnimationComplete(true), 1000); // Moved

        // ---- NEW: Wait for critical data with timeout ----
        const criticalDataPromise = new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(
              new Error(
                "Timeout waiting for critical game data. Game might be out of sync."
              )
            );
          }, 15000); // 15-second timeout

          // Check if data is already present
          if (
            useGameStore.getState().currentTurn &&
            useUserRoomStore.getState().currentRound
          ) {
            clearTimeout(timeoutId);
            // No need to unsubscribe if we haven't subscribed yet for this specific check
            resolve();
            return; // Exit if data is already there
          }

          const unsubscribeGameStore = useGameStore.subscribe((state) => {
            const newTurn = state.currentTurn;
            // Check currentRound directly from the store's state
            const currentRound = useUserRoomStore.getState().currentRound;
            if (newTurn && currentRound) {
              clearTimeout(timeoutId);
              unsubscribeGameStore();
              resolve();
            }
            return newTurn;
          });

          // Initial check again in case it populated between the first check and subscription setup
          // This is a bit redundant due to the subscribe model but can catch very fast updates
          if (
            useGameStore.getState().currentTurn &&
            useUserRoomStore.getState().currentRound
          ) {
            clearTimeout(timeoutId);
            unsubscribeGameStore(); // Ensure cleanup if it resolves here
            resolve();
          }
        });

        await criticalDataPromise; // Wait for the promise

        // If criticalDataPromise resolved, it means data is available. Now set loading to false.
        if (mounted) {
          setIsLoading(false);
          setTimeout(() => setAnimationComplete(true), 1000); // Original animation timeout
        }
        // ---- END NEW ----
      } catch (err) {
        console.error("[GameScreen] Error initializing game:", err);
        if (mounted) setError("Failed to load game. Please try again.");
        setIsLoading(false);
      }
    };

    initGame();
    return () => {
      mounted = false;
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [roomId]);

  // Turn and round subscriptions
  useEffect(() => {
    if (!currentTurn) return;
    const cleanupFunctions: (() => void)[] = [
      subscribeToAnswers(currentTurn.id),
      subscribeToVotes(currentTurn.id),
      subscribeToScenarios(currentTurn.id),
    ];
    setSubscriptionsActive((prev) => ({ ...prev, turn: true }));
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
      setSubscriptionsActive((prev) => ({ ...prev, turn: false }));
    };
  }, [currentTurn?.id]);

  useEffect(() => {
    if (!currentRound) return;
    const cleanupFunctions: (() => void)[] = [
      subscribeToTurns(currentRound.id),
      subscribeToDeciderHistory(currentRound.id),
    ];
    setSubscriptionsActive((prev) => ({ ...prev, round: true }));
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
      setSubscriptionsActive((prev) => ({ ...prev, round: false }));
    };
  }, [currentRound?.id]);

  // Scenario fetching
  useEffect(() => {
    let mounted = true;
    const fetchScenario = async () => {
      if (currentTurn?.scenario_id) {
        try {
          const scenario = await storeGetScenarioById(currentTurn.scenario_id);
          mounted && setCurrentScenario(scenario);
        } catch (error) {
          console.error("[GameScreen] Scenario fetch error:", error);
        }
      } else {
        mounted && setCurrentScenario(null);
      }
    };
    fetchScenario();
    return () => {
      mounted = false;
    };
  }, [currentTurn?.scenario_id]);

  // Prop definitions
  const renderGamePhase = () => {
    if (gameCompleted) return <GameCompleted players={currentGame.players} />;

    if (isProcessingAI) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <GlowingText className="text-3xl font-bold text-red-500 mb-2">
            🧪 The MethHead is deciding your fate... 💀
          </GlowingText>
          <GlowingText className="text-xl font-semibold text-orange-400 mb-6">
            ⚠️ Get ready to be unfair! 🔥
          </GlowingText>
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="relative">
              <div className="w-20 h-20 border-4 border-t-red-500 border-orange-300 rounded-full animate-spin" />
              <div
                className="absolute inset-0 w-20 h-20 border-4 border-b-yellow-500 border-transparent rounded-full animate-spin animate-reverse"
                style={{ animationDuration: "1s" }}
              />
            </div>
          </motion.div>
          <motion.div
            className="mt-4 text-lg text-gray-300"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            💊 Cooking up chaos... 🌪️
          </motion.div>
        </div>
      );
    }

    if (!currentTurn || !currentRound) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <GlowingText className="text-2xl font-bold text-purple-600">
            Waiting for game to start...
          </GlowingText>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-16 h-16 border-4 border-t-purple-500 border-purple-300 rounded-full animate-spin" />
          </motion.div>
        </div>
      );
    }

    const commonProps = {
      isDecider,
      currentDecider: currentGame!.players.find(
        (p) => p.id === currentTurn.decider_id
      ),
    };

    const categorySelectionProps = {
      roundId: currentRound.id,
      turnId: currentTurn.id,
      userId: currentUser?.id || "",
      ...commonProps,
    };

    const scenarioSelectionProps = {
      turnId: currentTurn.id,
      userId: currentUser?.id || "",
      category: currentTurn.category || "",
      ...commonProps,
    };

    const answerSubmissionProps = {
      turnId: currentTurn.id,
      playerId: currentUser?.id || "",
      scenario: currentScenario,
      timeLimit: currentRoom?.time_limit || 30,
      timerEnd: timerEnd,
      ...commonProps,
    };

    const votingPhaseProps = {
      turnId: currentTurn.id,
      currentUserId: currentUser?.id || "",
      ...commonProps,
    };

    switch (currentTurn.status) {
      case "selecting_category":
        return <CategorySelection {...categorySelectionProps} />;
      case "selecting_scenario":
        return <ScenarioSelection {...scenarioSelectionProps} />;
      case "answering":
        return <AnswerSubmission {...answerSubmissionProps} />;
      case "voting":
        return <VotingPhase {...votingPhaseProps} />;
      default:
        return (
          <div className="text-center">
            <GlowingText className="text-2xl font-bold mb-4">
              {currentTurn.status === "completed"
                ? "Turn Completed!"
                : "Waiting..."}
            </GlowingText>
          </div>
        );
    }
  };

  const handleExit = async () => {
    if (isExiting || !currentUser?.id || !roomId) return;
    setIsExiting(true);
    try {
      await deletePlayer(currentUser.id);
      resetState();
      // Use window.location for a hard redirect to ensure clean state
      window.location.href = "/";
    } catch (error) {
      console.error("[GameScreen] Error during exit:", error);
      setIsExiting(false);
    }
  };
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black overflow-hidden relative flex items-center justify-center">
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

        <CardContainer className="relative z-10">
          <CardBody className="bg-slate-900/75 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-8 md:p-10 shadow-2xl shadow-purple-600/40 group/card">
            <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover/card:border-purple-500/70 transition-all duration-500 pointer-events-none" />
            <CardItem translateZ={60} className="mb-6 flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-b-purple-500 border-r-blue-500 border-t-pink-500 border-l-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="h-8 w-8 text-purple-400" />
                </div>
              </div>
            </CardItem>{" "}
            <CardItem translateZ={80} className="text-center mb-6">
              <TextGenerateEffect
                words="Entering Game Matrix"
                className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 pb-2"
                duration={0.7}
              />
              <p className="text-md text-purple-300 mt-2">
                Preparing your gaming experience...
              </p>
            </CardItem>
            <CardItem translateZ={40}>
              <motion.div
                initial={{ width: "0%" }}
                animate={{
                  width: "100%",
                  transition: { duration: 2.5, ease: "easeInOut" },
                }}
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-1.5 rounded-full"
              />
            </CardItem>
          </CardBody>
        </CardContainer>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black overflow-hidden relative flex items-center justify-center">
        {/* Background Effects */}
        {/* <Vortex
          backgroundColor="black"
          className="fixed inset-0 w-full h-full z-0"
          particleColors={["#3b82f6", "#8b5cf6", "#ec4899", "#10b981"]}
          rangeY={200}
          baseHue={260}
          darkMode={true}
        /> */}

        <CardContainer className="relative z-10 max-w-lg">
          <CardBody className="bg-slate-900/75 backdrop-blur-xl border border-red-500/30 rounded-2xl p-8 shadow-2xl">
            <CardItem translateZ={20}>
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/40">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <GlowingText className="text-2xl font-bold text-red-500 mb-4">
                  Connection Error
                </GlowingText>
                <p className="text-gray-300 mb-6">{error}</p>
                <GradientButton
                  onClick={() => router.push("/")}
                  className="w-full flex items-center justify-center gap-2"
                  gradientFrom="from-gray-600"
                  gradientTo="to-gray-700"
                >
                  <Home className="h-4 w-4" />
                  <span>Return to Home Base</span>
                </GradientButton>
              </div>
            </CardItem>
          </CardBody>
        </CardContainer>
      </div>
    );
  }

  if (!currentGame || !currentUser || !currentRoom) return null;
  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
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
        className="-top-40 left-0 md:left-60 md:-top-20 z-10"
        fill="blue"
      />

      {/* Sound Settings Button - Positioned in top-right corner */}
      <div className="absolute top-4 right-4 z-50">
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

      <div className="flex min-h-screen z-10 relative">
        {/* Sidebar */}
        <div className="flex-shrink-0 z-10">
          <GameSidebar
            players={currentGame.players}
            currentUserId={currentUser.id}
            currentTurn={turnNumber}
            roundNumber={roundNumber}
            totalRounds={totalRounds}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col px-1 md:px-6 lg:px-10 py-6 overflow-hidden">
          {/* Game Header - Round info, timer, etc */}{" "}
          <CardContainer perspective={1200}>
            <CardBody className="w-full bg-slate-900/75 backdrop-blur-xl border border-slate-700/80 rounded-lg shadow-lg shadow-purple-500/20 mb-6 p-5">
              <div className="absolute inset-0 rounded-lg border-2 border-transparent group-hover:border-purple-500/50 transition-all duration-500 pointer-events-none animate-pulse-border" />

              <div className="flex justify-between items-center gap-4">
                <CardItem
                  translateZ={20}
                  className="flex flex-col flex-shrink-0"
                >
                  <div className="flex items-center">
                    <Trophy className="h-5 w-5 text-yellow-400 mr-2" />
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                      Round {roundNumber}/{totalRounds}
                    </h2>
                  </div>
                  <p className="text-gray-400 mt-1">Turn #{turnNumber}</p>
                </CardItem>

                <CardItem translateZ={20} className="flex-1 min-w-0">
                  <div className="bg-slate-800/50 px-3 py-2 rounded-lg border border-purple-500/20">
                    <p className="text-purple-300 truncate">
                      Decider:{" "}
                      <span className="font-semibold">
                        {currentGame.players.find(
                          (p) => p.id === currentTurn?.decider_id
                        )?.nickname || "..."}
                      </span>
                    </p>
                  </div>
                </CardItem>

                {timerEnd && currentTurn?.status === "answering" && (
                  <CardItem translateZ={30} className="flex-shrink-0">
                    <HoverBorderGradient
                      containerClassName="rounded-lg overflow-hidden"
                      className="bg-slate-800/90 px-4 py-2 flex items-center"
                      gradientClassName="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500"
                    >
                      <Clock className="w-5 h-5 text-amber-400 mr-2" />
                      <GameTimer
                        endTime={timerEnd}
                        timeLimit={currentRoom.time_limit}
                      />
                    </HoverBorderGradient>
                  </CardItem>
                )}

                <CardItem translateZ={25} className="flex-shrink-0">
                  <GradientButton
                    onClick={handleExit}
                    className="flex items-center gap-1.5 text-sm py-2 px-3"
                    gradientFrom="from-gray-600"
                    gradientTo="to-slate-700"
                    variant="outline"
                  >
                    <Home className="h-4 w-4" />
                    <span>Exit</span>
                  </GradientButton>
                </CardItem>
              </div>
            </CardBody>
          </CardContainer>
          {/* Game Content Area */}
          <CardContainer className="flex-1 w-full">
            <CardBody className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-700/70 rounded-xl p-6 md:p-8 shadow-xl overflow-hidden flex">
              <div className="flex-1 relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTurn?.id || "loading"}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                    className="h-full"
                  >
                    <CardItem translateZ={50} className="w-full h-full">
                      {gameCompleted ? (
                        <div className="relative">
                          <div className="absolute -top-10 -right-10 -left-10 -bottom-10 bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-orange-500/20 blur-3xl z-0 pointer-events-none rounded-full"></div>
                          <div className="relative z-10">
                            {renderGamePhase()}
                          </div>
                        </div>
                      ) : (
                        renderGamePhase()
                      )}
                    </CardItem>
                  </motion.div>
                </AnimatePresence>
              </div>
            </CardBody>
          </CardContainer>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        .animate-pulse-border {
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
        .group-hover:hover .animate-pulse-border {
          animation-duration: 2s;
        }
      `}</style>
    </div>
  );
}
