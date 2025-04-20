"use client";
import { useEffect, useState } from "react";
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
// import { DisconnectionNotice } from "@/components/DisconnectionNotice";
import { GameCompleted } from "@/components/GameCompleted";
import { GameTimer } from "@/components/GameTimer";
import { Sparkles } from "@/components/ui/acernity/Sparkles";
import { AcernityCard } from "@/components/ui/acernity/card";
import { GradientButton } from "@/components/ui/acernity/gradient-button";
import AcernitySpotlight from "@/components/ui/acernity/spotlight";
import { GlowingText } from "@/components/ui/acernity/glowing-text";

export default function GameScreen() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.roomId as string;

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [subscriptionsActive, setSubscriptionsActive] = useState<{
    main: boolean;
    turn: boolean;
    round: boolean;
  }>({ main: false, turn: false, round: false });
  const [animationComplete, setAnimationComplete] = useState(false);

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
  } = useUserRoomStore();
  const {
    subscribeToTurns,
    currentGame,
    subscribeToGame,
    subscribeToAnswers,
    subscribeToVotes,
    subscribeToScenarios,
    // disconnectedPlayers,s
    timerEnd,
    getScenarioById: storeGetScenarioById,
  } = useGameStore();

  // Computed values
  const gameCompleted = currentGame?.room.game_status === "completed";
  const roundNumber = currentRound?.round_number || 0;
  const totalRounds = currentRoom?.total_rounds || 0;
  const isDecider = currentTurn?.decider_id === currentUser?.id;
  const turnNumber = currentTurn?.turn_number || 0;

  useTabCloseHandler(currentUser?.id || null, currentRoom?.id || null);

  // Data initialization and subscriptions
  useEffect(() => {
    if (!roomId) return;

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
        setIsLoading(false);
        setTimeout(() => mounted && setAnimationComplete(true), 1000);
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

    if (!currentTurn || !currentRound) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Sparkles>
            <GlowingText className="text-2xl font-bold text-purple-600">
              Waiting for game to start...
            </GlowingText>
          </Sparkles>
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

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="w-24 h-24 border-4 border-t-purple-500 animate-spin mb-6" />
          <Sparkles>
            <h2 className="text-3xl font-bold text-white mb-2">
              Loading game...
            </h2>
          </Sparkles>
          <p className="text-purple-300 text-lg">Preparing your adventure</p>
        </motion.div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <AcernityCard className="p-8 max-w-md border-red-200/20">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <GradientButton onClick={() => router.push("/")} className="w-full">
            Return to Home
          </GradientButton>
        </AcernityCard>
      </div>
    );

  if (!currentGame || !currentUser || !currentRoom) return null;

  return (
    <AcernitySpotlight className="flex h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-80 bg-slate-800/80 backdrop-blur-md border-r border-purple-500/20 p-4 flex flex-col"
      >
        <div className="mb-8 text-center">
          <Sparkles>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
              Prompt Game
            </h1>
          </Sparkles>
          <div className="mt-2 px-4 py-1 bg-purple-900/30 rounded-full inline-flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs text-gray-300">
              Room: {currentRoom.room_code}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Round Progress</span>
            <span className="text-sm font-medium text-purple-300">
              {roundNumber}/{totalRounds}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              style={{ width: `${(roundNumber / totalRounds) * 100}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${(roundNumber / totalRounds) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-3">
            Players
          </h3>
          <div className="space-y-2">
            {currentGame.players.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.3 }}
                className={`flex items-center p-2 rounded-lg ${
                  player.id === currentUser.id
                    ? "bg-purple-500/20 border border-purple-500/30"
                    : "hover:bg-slate-700/50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                    player.id === currentTurn?.decider_id
                      ? "bg-gradient-to-br from-amber-400 to-orange-500"
                      : "bg-gradient-to-br from-purple-500/70 to-pink-500/70"
                  }`}
                >
                  {player.nickname[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-medium ${
                        player.id === currentUser.id
                          ? "text-purple-300"
                          : "text-white"
                      }`}
                    >
                      {player.nickname}
                    </span>
                    <span className="text-sm font-medium text-purple-300">
                      {player.total_points || 0}
                    </span>
                  </div>
                  {player.id === currentTurn?.decider_id && (
                    <span className="text-xs text-amber-400">Decider</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-slate-800/90 backdrop-blur-md border-b border-purple-500/20 p-4"
        >
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white">
                Round {roundNumber}/{totalRounds}
              </h2>
              <p className="text-gray-400">
                Turn #{turnNumber} •{" "}
                <span className="text-purple-300">
                  Decider:{" "}
                  {currentGame.players.find(
                    (p) => p.id === currentTurn?.decider_id
                  )?.nickname || "..."}
                </span>
              </p>
            </div>

            {timerEnd && currentTurn?.status === "answering" && (
              <div className="bg-slate-700/70 px-4 py-2 rounded-lg flex items-center">
                <svg
                  className="w-5 h-5 text-amber-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <GameTimer
                  endTime={timerEnd}
                  timeLimit={currentRoom.time_limit}
                />
              </div>
            )}
          </div>
        </motion.div>

        <div className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTurn?.id || "loading"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full"
            >
              {renderGamePhase()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AcernitySpotlight>
  );
}
