"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

import { TurnStatus, Player, Scenario, Turn } from "@/types/types";

// Components
import { useGameStore } from "@/store/game-store";
import { useUserRoomStore } from "@/store/user-room-store";
import { VotingPhase } from "@/components/VotingPhase";
import { CategorySelection } from "@/components/CategorySelection";
import { ScenarioSelection } from "@/components/ScenarioSelection";
import { AnswerSubmission } from "@/components/AnswerSubmission";
import { getScenarioById } from "@/actions/game";
import { useTabCloseHandler } from "@/utils/useTabCloseHandler";
import { DisconnectionNotice } from "@/components/DisconnectionNotice";
import { GameCompleted } from "@/components/GameCompleted";
import { GameSidebar } from "@/components/GameSidebar";
import { GameHeader } from "@/components/GameHeader";
import { GameTimer } from "@/components/GameTimer";

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
  }>({
    main: false,
    turn: false,
    round: false,
  });

  // User and room store
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
    disconnectedPlayers,
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

  // Fix missing currentRound/currentTurn data
  useEffect(() => {
    if (
      currentGame &&
      !currentRound &&
      !currentTurn &&
      currentGame.rounds?.length > 0
    ) {
      // Get the current round from currentGame
      const gameRound = currentGame.rounds.find(
        (r) => r.round_number === currentGame.room.current_round
      );

      if (gameRound) {
        // Manually set current round in userRoomStore
        const userRoomState = useUserRoomStore.getState();
        userRoomState.currentRound = gameRound;

        // Find current turn if available
        if (currentGame.turns?.length > 0) {
          const gameTurn = currentGame.turns.find(
            (t) => t.turn_number === currentGame.room.current_turn
          );

          if (gameTurn) {
            userRoomState.setCurrentTurn(gameTurn);
          }
        }
      }
    }
  }, [currentGame, currentRound, currentTurn]);

  // Initialize game and subscriptions - more robust approach
  useEffect(() => {
    if (!roomId) {
      console.log("[GameScreen] No roomId, skipping initialization");
      return;
    }

    let mounted = true;
    const cleanupFunctions: (() => void)[] = [];

    const initGame = async () => {
      if (!mounted) return;

      setIsLoading(true);
      console.log("[GameScreen] Starting game initialization");

      try {
        // Fetch initial data
        console.log("[GameScreen] Fetching room data...");
        const roomResult = await fetchRoomById(roomId);
        if (!roomResult.success) {
          throw new Error(roomResult.error || "Failed to fetch room");
        }

        if (!mounted) return;
        console.log("[GameScreen] Room data fetched successfully");

        console.log("[GameScreen] Fetching players in room...");
        await fetchPlayersInRoom(roomId);

        if (!mounted) return;
        console.log("[GameScreen] Players fetched successfully");

        // Set up subscriptions
        console.log("[GameScreen] Setting up subscriptions...");
        try {
          const unsubscribeRoom = subscribeToRoom(roomId);
          cleanupFunctions.push(unsubscribeRoom);

          const unsubscribePlayers = subscribeToPlayers(roomId);
          cleanupFunctions.push(unsubscribePlayers);

          const unsubscribeGame = subscribeToGame(roomId);
          cleanupFunctions.push(unsubscribeGame);

          const unsubscribeRounds = subscribeToRounds(roomId);
          cleanupFunctions.push(unsubscribeRounds);

          if (mounted) {
            setSubscriptionsActive((prev) => ({ ...prev, main: true }));
          }
        } catch (subError) {
          console.error("[GameScreen] Subscription error:", subError);
          throw new Error("Failed to set up game subscriptions");
        }

        console.log("[GameScreen] Subscriptions set up successfully");

        if (mounted) {
          setIsLoading(false);
          console.log("[GameScreen] Game initialized successfully");
        }
      } catch (err) {
        console.error("[GameScreen] Error initializing game:", err);
        if (mounted) {
          setError("Failed to load game. Please try again.");
          setIsLoading(false);
        }
      }
    };

    initGame();

    return () => {
      mounted = false;
      console.log("[GameScreen] Cleaning up main subscriptions");
      cleanupFunctions.forEach((cleanup) => {
        try {
          cleanup();
        } catch (e) {
          console.error("Error during cleanup:", e);
        }
      });
    };
  }, [roomId]);

  // Subscribe to turn-specific data when current turn changes - with better cleanup
  useEffect(() => {
    console.log("[GameScreen] Current turn changed:", currentTurn);
    if (!currentTurn) {
      console.log("[GameScreen] No current turn, skipping turn subscriptions");
      return;
    }

    let mounted = true;
    const turnId = currentTurn.id; // Capture current value to avoid closure issues
    const cleanupFunctions: (() => void)[] = [];

    console.log("[GameScreen] Setting up turn subscriptions for turn:", turnId);

    try {
      const unsubscribeAnswers = subscribeToAnswers(turnId);
      cleanupFunctions.push(unsubscribeAnswers);

      const unsubscribeVotes = subscribeToVotes(turnId);
      cleanupFunctions.push(unsubscribeVotes);

      const unsubscribeScenarios = subscribeToScenarios(turnId);
      cleanupFunctions.push(unsubscribeScenarios);

      if (mounted) {
        setSubscriptionsActive((prev) => ({ ...prev, turn: true }));
      }
    } catch (err) {
      console.error("[GameScreen] Error setting up turn subscriptions:", err);
    }

    return () => {
      mounted = false;
      console.log(
        "[GameScreen] Cleaning up turn subscriptions for turn:",
        turnId
      );
      cleanupFunctions.forEach((cleanup) => {
        try {
          cleanup();
        } catch (e) {
          console.error("Error during turn subscription cleanup:", e);
        }
      });
      setSubscriptionsActive((prev) => ({ ...prev, turn: false }));
    };
  }, [currentTurn?.id]);

  // Subscribe to round-specific data when current round changes - with better cleanup
  useEffect(() => {
    console.log("[GameScreen] Current round changed:", currentRound);
    if (!currentRound) {
      console.log(
        "[GameScreen] No current round, skipping round subscriptions"
      );
      return;
    }

    let mounted = true;
    const roundId = currentRound.id; // Capture current value
    const cleanupFunctions: (() => void)[] = [];

    console.log(
      "[GameScreen] Setting up round subscriptions for round:",
      roundId
    );

    try {
      const unsubscribeTurns = subscribeToTurns(roundId);
      cleanupFunctions.push(unsubscribeTurns);

      const unsubscribeDeciderHistory = subscribeToDeciderHistory(roundId);
      cleanupFunctions.push(unsubscribeDeciderHistory);

      if (mounted) {
        setSubscriptionsActive((prev) => ({ ...prev, round: true }));
      }
    } catch (err) {
      console.error("[GameScreen] Error setting up round subscriptions:", err);
    }

    return () => {
      mounted = false;
      console.log(
        "[GameScreen] Cleaning up round subscriptions for round:",
        roundId
      );
      cleanupFunctions.forEach((cleanup) => {
        try {
          cleanup();
        } catch (e) {
          console.error("Error during round subscription cleanup:", e);
        }
      });
      setSubscriptionsActive((prev) => ({ ...prev, round: false }));
    };
  }, [currentRound?.id]);

  // Fetch scenario when the currentTurn's scenario_id changes - with error handling
  useEffect(() => {
    let mounted = true;

    const fetchScenario = async () => {
      if (currentTurn?.scenario_id) {
        console.log(
          "[GameScreen] Fetching scenario for turn:",
          currentTurn.scenario_id
        );
        try {
          const scenario = await storeGetScenarioById(currentTurn.scenario_id);
          if (mounted) {
            console.log("[GameScreen] Scenario fetched:", scenario);
            setCurrentScenario(scenario);
          }
        } catch (error) {
          console.error("[GameScreen] Failed to fetch scenario:", error);
          if (mounted) {
            // Don't set an error state here as it's not critical - just log it
          }
        }
      } else {
        console.log("[GameScreen] No scenario_id in current turn");
        if (mounted) {
          setCurrentScenario(null);
        }
      }
    };

    fetchScenario();

    return () => {
      mounted = false;
    };
  }, [currentTurn?.scenario_id]);

  // Redirect if not authenticated or game data missing
  useEffect(() => {
    console.log("[GameScreen] Checking auth state:", {
      isLoading,
      currentUser,
      currentRoom,
    });

    if (!isLoading && (!currentUser || !currentRoom)) {
      console.log(
        "[GameScreen] User not authenticated or room not found, redirecting"
      );
      router.push("/");
    }
  }, [currentUser, currentRoom, isLoading, router]);

  // Handle loading and error states
  if (isLoading) {
    console.log("[GameScreen] Rendering loading state");
    return (
      <div className="flex items-center justify-center h-screen">
        Loading game...
      </div>
    );
  }

  if (error) {
    console.log("[GameScreen] Rendering error state:", error);
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={() => router.push("/")}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (!currentGame || !currentUser || !currentRoom) {
    console.log("[GameScreen] Missing required data:", {
      currentGame,
      currentUser,
      currentRoom,
    });
    return (
      <div className="flex items-center justify-center h-screen">
        Game data not available
      </div>
    );
  }

  // Handle disconnected state
  if (disconnectedPlayers.includes(currentUser.id)) {
    console.log(
      "[GameScreen] Rendering disconnected notice for user:",
      currentUser.id
    );
    return <DisconnectionNotice roomCode={currentRoom.room_code} />;
  }

  // Render the appropriate game phase based on current status
  const renderGamePhase = () => {
    console.log("[GameScreen] Rendering game phase with state:", {
      gameCompleted,
      currentTurn,
      currentRound,
      isRoundVotingPhase,
    });

    if (gameCompleted) {
      console.log("[GameScreen] Rendering GameCompleted component");
      return <GameCompleted players={currentGame.players} />;
    }

    if (!currentTurn || !currentRound) {
      console.log(
        "[GameScreen] No current turn or round, showing waiting message"
      );
      console.log("Detailed state:", {
        currentGame,
        currentRound,
        currentTurn,
        roomPlayers,
        isRoundVotingPhase,
      });
      return <div>Waiting for game to start...</div>;
    }

    // If we're in voting phase for the entire round
    if (isRoundVotingPhase) {
      console.log("[GameScreen] Rendering round voting phase");
      return (
        <VotingPhase
          turnId={currentTurn.id}
          currentUserId={currentUser.id}
          isDecider={isDecider}
        />
      );
    }

    console.log(
      "[GameScreen] Current Turn Status:-----------------",
      currentTurn.status
    );
    switch (currentTurn.status) {
      case "selecting_category":
        console.log("[GameScreen] Rendering CategorySelection");
        return (
          <CategorySelection
            roundId={currentRound.id}
            turnId={currentTurn.id}
            userId={currentUser.id}
            isDecider={isDecider}
            currentDecider={currentGame.players.find(
              (p) => p.id === currentTurn.decider_id
            )}
          />
        );

      case "selecting_scenario":
        console.log("[GameScreen] Rendering ScenarioSelection");
        return (
          <ScenarioSelection
            turnId={currentTurn.id}
            userId={currentUser.id}
            isDecider={isDecider}
            category={currentTurn.category || ""}
            currentDecider={currentGame.players.find(
              (p) => p.id === currentTurn.decider_id
            )}
          />
        );

      case "answering":
        console.log("[GameScreen] Rendering AnswerSubmission");
        return (
          <AnswerSubmission
            turnId={currentTurn.id}
            playerId={currentUser.id}
            scenario={currentScenario}
            timeLimit={currentRoom.time_limit}
            timerEnd={timerEnd}
            isDecider={isDecider}
            currentDecider={currentGame.players.find(
              (p) => p.id === currentTurn.decider_id
            )}
          />
        );

      case "voting":
        console.log("[GameScreen] Rendering VotingPhase");
        return (
          <VotingPhase
            turnId={currentTurn.id}
            currentUserId={currentUser.id}
            isDecider={isDecider}
          />
        );

      case "completed":
        console.log("[GameScreen] Turn completed, waiting for next turn");
        return (
          <div className="text-center">
            Turn completed! Preparing next turn...
          </div>
        );

      default:
        console.log(
          "[GameScreen] Unknown turn status, showing waiting message"
        );
        return <div>Waiting for game to progress...</div>;
    }
  };

  console.log("[GameScreen] Rendering main game UI");
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Game sidebar */}
      <GameSidebar
        players={currentGame.players}
        currentUserId={currentUser.id}
        currentTurn={turnNumber}
        roundNumber={roundNumber}
        totalRounds={totalRounds}
      />

      {/* Main game area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Game header with round info */}
        <GameHeader
          roundNumber={roundNumber}
          totalRounds={totalRounds}
          turnNumber={turnNumber || 0}
          currentDecider={currentGame.players.find(
            (p) => p.id === currentTurn?.decider_id
          )}
        />

        {/* Timer display when needed */}
        {timerEnd && currentTurn?.status === "answering" && (
          <GameTimer endTime={timerEnd} timeLimit={currentRoom.time_limit} />
        )}

        {/* Subscription status indicator for debugging - can be removed in production */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-gray-200 text-xs p-1 text-center">
            Subscriptions: Main: {subscriptionsActive.main ? "✓" : "✗"} | Turn:{" "}
            {subscriptionsActive.turn ? "✓" : "✗"} | Round:{" "}
            {subscriptionsActive.round ? "✓" : "✗"}
          </div>
        )}

        {/* Main game content */}
        <div className="flex-1 p-6 overflow-y-auto">{renderGamePhase()}</div>
      </div>
    </div>
  );
}
