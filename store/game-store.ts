// app/stores/game-store.ts
import { create } from "zustand";
import { createClient } from "@/utils/supabase/client";
import {
  GameState,
  Player,
  Room,
  Round,
  Scenario,
  Answer,
  Vote,
  TurnStatus,
  Turn,
  VoteType,
  GameStatus,
} from "@/types/types";
import * as actions from "@/actions/game";
import { useUserRoomStore } from "./user-room-store";
// Import the action instead of using actions.nextRound
// This is to avoid calling the store function recursively
import { nextRound, nextTurn, selectCategory } from "@/actions/game";

interface GameStoreState {
  currentGame: GameState | null;
  currentScenario: Scenario | null;
  currentTurn: Turn | null;
  answers: Answer[];
  votes: Vote[];
  timerEnd: Date | null;
  isProcessingAI: boolean;
  // disconnectedPlayers: string[];

  subscribeToGame: (roomId: string) => () => void;
  subscribeToAnswers: (turnId: string) => () => void;
  subscribeToVotes: (turnId: string) => () => void;
  subscribeToScenarios: (turnId: string) => () => void;
  subscribeToTurns: (roundId: string) => () => void;

  startGame: (roomId: string, userId: string) => Promise<boolean>;
  selectCategory: (
    turnId: string,
    category: string,
    userId: string
  ) => Promise<boolean>;
  generateScenarios: (turnId: string) => Promise<Scenario[]>;
  selectScenario: (
    turnId: string,
    scenario: { id?: string; customText?: string },
    context: string,
    userId: string
  ) => Promise<void>;
  submitAnswer: (
    answerText: string,
    turnId: string,
    playerId: string
  ) => Promise<any>;
  syncWithUserRoomStore: (roomId: string) => void;
  processAIResponses: (turnId: string) => Promise<boolean>;
  submitVote: (
    answerId: string,
    voterId: string,
    voteType?: "up" | "down"
  ) => Promise<{ success: boolean }>;
  nextTurn: (turnId: string) => Promise<{ gameEnded: boolean }>;
  processAfterVoting: (roomId: string) => Promise<boolean>;
  // handleDisconnection: (playerId: string, roomId: string) => Promise<void>;
  fetchDeciderHistory: (roundId: string) => Promise<any[]>;
  startTimer: (duration: number) => void;
  clearTimer: () => void;
  getScenarioById: (scenarioId: string) => Promise<Scenario>;
  fetchTurnById: (turnId: string) => Promise<Turn | null>;
  resetState: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  currentGame: null,
  currentScenario: null,
  currentTurn: null,
  answers: [],
  votes: [],
  timerEnd: null,
  isProcessingAI: false,
  disconnectedPlayers: [],

  subscribeToGame: (roomId) => {
    const supabase = createClient();

    const fetchAndUpdateGame = async () => {
      console.log("Fetching game data for room:", roomId);

      // Fetch room
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (roomError || !room) {
        console.error("Room fetch error:", roomError);
        return;
      }

      // Fetch rounds
      const { data: rounds, error: roundsError } = await supabase
        .from("rounds")
        .select("*")
        .eq("room_id", roomId)
        .order("round_number");

      if (roundsError) {
        console.error("Rounds fetch error:", roundsError);
        return;
      }

      // Fetch players
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomId)
        .order("total_points", { ascending: false });

      if (playersError) console.error("Players fetch error:", playersError);

      // Fetch current turn if available
      const currentRound = rounds.find(
        (r) => r.round_number === room.current_round
      );
      let turns: Turn[] = [];

      if (currentRound) {
        const { data: turnsData } = await supabase
          .from("turns")
          .select("*")
          .eq("round_id", currentRound.id)
          .order("turn_number");

        turns = turnsData || [];

        // Find current turn
        const currentTurn = turns.find(
          (t) => t.turn_number === room.current_turn
        );
        if (currentTurn) {
          set({ currentTurn });
        }
      }

      // Update state
      set({
        currentGame: {
          room,
          rounds: rounds.map((round) => ({
            ...round,
            status: round.status as TurnStatus,
          })),
          players: players || [],
          turns,
        },
      });

      // Return the round IDs for subscription use
      return rounds.map((r) => r.id);
    };

    // Initial fetch and get round IDs
    let roundIds: string[] = [];
    fetchAndUpdateGame().then((ids) => {
      if (ids) roundIds = ids;
    });

    // Subscription setup
    const channel = supabase
      .channel(`game:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        async () => {
          const ids = await fetchAndUpdateGame();
          if (ids) roundIds = ids;
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        fetchAndUpdateGame
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          const ids = await fetchAndUpdateGame();
          if (ids) roundIds = ids;
        }
      );

    // Subscribe to the channel first
    channel.subscribe();

    // Handle turn changes separately with correct round IDs
    const setupTurnSubscription = () => {
      if (roundIds.length === 0) {
        // Wait and retry if round IDs aren't available yet
        setTimeout(setupTurnSubscription, 1000);
        return;
      }

      const roundIdsFilter = roundIds.map((id) => `'${id}'`).join(",");

      const turnChannel = supabase
        .channel(`game-turns:${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "turns",
            filter: `round_id=in.(${roundIdsFilter})`,
          },
          async (payload) => {
            const newTurn = payload.new as Turn;

            // Update currentTurn
            set({ currentTurn: newTurn });

            // If turn has a scenario_id, fetch and update current scenario
            if (newTurn.scenario_id) {
              try {
                const scenario = await get().getScenarioById(
                  newTurn.scenario_id
                );
                set({ currentScenario: scenario });
              } catch (error) {
                console.error("Failed to fetch scenario:", error);
              }
            }

            // Refresh overall game state
            fetchAndUpdateGame();
          }
        )
        .subscribe();

      return turnChannel;
    };

    const turnChannel = setupTurnSubscription();

    // Return cleanup function
    return () => {
      supabase.removeChannel(channel);
      if (turnChannel) supabase.removeChannel(turnChannel);
    };
  },

  subscribeToAnswers: (turnId) => {
    const supabase = createClient();
    const subscription = supabase
      .channel(`answers:${turnId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "answers",
          filter: `turn_id=eq.${turnId}`,
        },
        (payload) => {
          set((state) => {
            let newAnswers = [...state.answers];
            const newAnswer = payload.new as Answer;

            switch (payload.eventType) {
              case "INSERT":
                newAnswers.push(newAnswer);
                break;
              case "UPDATE":
                newAnswers = newAnswers.map((a) =>
                  a.id === newAnswer.id ? newAnswer : a
                );
                break;
              case "DELETE":
                newAnswers = newAnswers.filter((a) => a.id !== payload.old.id);
                break;
            }
            return { answers: newAnswers };
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  },
  subscribeToVotes: (turnId) => {
    const supabase = createClient();

    // First get all answer IDs for this turn
    const fetchVoteSubscription = async () => {
      const { data: turnAnswers } = await supabase
        .from("answers")
        .select("id")
        .eq("turn_id", turnId);

      if (!turnAnswers || turnAnswers.length === 0) {
        return () => {}; // No answers to vote on yet
      }

      // Instead of using IN clause with string concatenation, use individual channels
      // or just listen to all votes and filter client-side
      const subscription = supabase
        .channel(`votes:${turnId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "votes",
          },
          (payload) => {
            // Filter votes client-side to only include ones for our answers
            const answerIds = new Set(turnAnswers.map((a) => a.id));
            const voteData = payload.new as Vote;

            if (
              !voteData ||
              !voteData.answer_id ||
              !answerIds.has(voteData.answer_id)
            ) {
              return; // Skip votes that don't belong to our answers
            }

            set((state) => {
              let newVotes = [...state.votes];
              const newVote = voteData;

              switch (payload.eventType) {
                case "INSERT":
                  newVotes.push(newVote);
                  break;
                case "UPDATE":
                  newVotes = newVotes.map((v) =>
                    v.id === newVote.id ? newVote : v
                  );
                  break;
                case "DELETE":
                  newVotes = newVotes.filter((v) => v.id !== payload.old.id);
                  break;
              }
              return { votes: newVotes };
            });
          }
        )
        .subscribe();

      return () => supabase.removeChannel(subscription);
    };

    // Start the subscription and return disposer
    let disposer = () => {};
    fetchVoteSubscription().then((dispose) => {
      disposer = dispose;
    });

    return () => disposer();
  },

  subscribeToScenarios: (turnId) => {
    const supabase = createClient();
    const subscription = supabase
      .channel(`scenarios:${turnId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scenarios",
          filter: `turn_id=eq.${turnId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            set({ currentScenario: payload.new as Scenario });
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  },

  subscribeToTurns: (roundId) => {
    const supabase = createClient();
    const subscription = supabase
      .channel(`turns:${roundId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // This listens for all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "turns",
          filter: `round_id=eq.${roundId}`,
        },
        async (payload) => {
          // Log the entire payload to see what's coming through
          console.log("Turn subscription payload:", payload);

          const newTurn = payload.new as Turn;
          console.log("Turn updated:---", newTurn);

          // Make sure to update both the currentTurn in your store AND notify components
          set((state) => ({
            currentTurn: newTurn,
            // Optionally update any other state that depends on the turn
          }));

          // If status has changed to voting, refresh answers
          if (
            newTurn.status === "selecting_scenario" ||
            newTurn.status === "voting"
          ) {
            const supabase = createClient();
            const { data: answers } = await supabase
              .from("answers")
              .select("*")
              .eq("turn_id", newTurn.id);

            if (answers) {
              set({ answers });
            }
          }
        }
      )
      .subscribe();

    // Make sure we're actually getting a response from the subscription
    console.log(`Subscription to turns:${roundId} created`);

    return () => {
      console.log(`Removing subscription for turns:${roundId}`);
      supabase.removeChannel(subscription);
    };
  },

  startGame: async (roomId, userId) => {
    try {
      console.log("Starting game for room:", roomId);

      // Use the server action
      const result = await actions.startGame(roomId, userId);
      if (!result?.success) throw new Error("Failed to start game");

      // Force a direct update to the room status
      const supabase = createClient();
      await supabase
        .from("rooms")
        .update({ game_status: "in_progress" })
        .eq("id", roomId);

      // IMPORTANT: Fetch the updated room data to ensure state is consistent
      const { data: updatedRoom } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      // Update the local state immediately with the new room status
      set((state) => ({
        currentGame: state.currentGame
          ? {
              ...state.currentGame,
              room: updatedRoom,
            }
          : null,
      }));

      console.log(
        "Game started successfully, room status updated to in_progress"
      );

      // Initialize subscriptions
      get().subscribeToGame(roomId);

      // Explicitly sync with user room store
      get().syncWithUserRoomStore(roomId);

      return true;
    } catch (error) {
      console.error("Game start failed:", error);
      throw error;
    }
  },

  selectCategory: async (turnId, category, userId) => {
    try {
      // console.log("Client: Selecting category:", category);

      // Make the API call
      const result = await selectCategory(turnId, category, userId);
      // console.log("Selection result:", result);
      if (!result) {
        console.error("Failed to select category");
        return false;
      }
      if (result) {
        // Optimistic update - only do this if we get a success response
        set((state) => {
          if (!state.currentTurn) return state;

          return {
            currentTurn: {
              ...state.currentTurn,
              category,
              status: "selecting_scenario",
            },
          };
        });
        return true;
      } else {
        console.error("Category selection failed - server returned false");
        return false;
      }
    } catch (error) {
      console.error("Category selection error:", error);
      return false;
    }
  },

  // In useGameStore:
  syncWithUserRoomStore: (roomId: string) => {
    // Get data from userRoomStore
    const { currentRoom, currentTurn, currentRound, setCurrentRoom } =
      useUserRoomStore.getState();
    // Get the latest room data
    const supabase = createClient();
    supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single()
      .then(({ data: latestRoom }) => {
        // Update the userRoomStore with the latest room data
        if (setCurrentRoom && latestRoom) {
          setCurrentRoom(latestRoom);
        }

        // Update gameStore with the latest data
        set((state) => {
          if (!state.currentGame) return state;
          return {
            currentGame: {
              ...state.currentGame,
              room: latestRoom || state.currentGame.room,
            },
            currentTurn: currentTurn || state.currentTurn,
          };
        });
      });

    // Update gameStore with the latest data
    if (currentRoom) {
      set((state) => {
        // Only update if we have a currentGame
        if (!state.currentGame) return state;

        return {
          currentGame: {
            ...state.currentGame,
            room: currentRoom,
          },
          currentTurn: currentTurn || state.currentTurn,
        };
      });
    }

    // If we have a round ID but no currentTurn, fetch it
    if (currentRound?.id && !currentTurn) {
      get()
        .fetchTurnById(currentRound.id)
        .then((turn) => {
          if (turn) {
            set({ currentTurn: turn });

            // Also update turn in userRoomStore
            const { setCurrentTurn } = useUserRoomStore.getState();
            if (setCurrentTurn) {
              setCurrentTurn(turn);
            }
          }
        });
    }
  },

  generateScenarios: async (turnId) => {
    const scenarios = await actions.generateScenarios(turnId);
    if (scenarios?.length) set({ currentScenario: scenarios[0] });
    return scenarios || [];
  },

  selectScenario: async (turnId, scenario, context, userId) => {
    await actions.selectScenario(turnId, scenario, context, userId);

    // If we selected a scenario by ID, update our current scenario
    if (scenario.id) {
      const scenarioData = await get().getScenarioById(scenario.id);
      set({ currentScenario: scenarioData });
    }
  },

  submitAnswer: async (answerText, turnId, playerId) => {
    try {
      await actions.submitAnswer(answerText, turnId, playerId);

      // Fetch the newly created answer to ensure we have the correct data
      const supabase = createClient();
      const { data: newAnswer, error } = await supabase
        .from("answers")
        .select("*")
        .eq("turn_id", turnId)
        .eq("player_id", playerId)
        .single();

      if (error) throw error;

      if (newAnswer) {
        set((state) => {
          // Check if this answer already exists in state
          const existingIndex = state.answers.findIndex(
            (a) => a.player_id === playerId && a.turn_id === turnId
          );

          if (existingIndex >= 0) {
            // Replace existing answer
            const updatedAnswers = [...state.answers];
            updatedAnswers[existingIndex] = newAnswer;
            return { answers: updatedAnswers };
          } else {
            // Add new answer
            return { answers: [...state.answers, newAnswer] };
          }
        });

        // Broadcast submission to ensure all clients are in sync
        supabase.channel("answer-submissions").send({
          type: "broadcast",
          event: "answer_submitted",
          payload: { turnId, playerId },
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error in submitAnswer:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  processAIResponses: async (turnId) => {
    set({ isProcessingAI: true });
    try {
      console.log("Processing AI responses for turn:", turnId);

      // Process AI responses for the current turn
      const result = await actions.processAIResponses(turnId);

      if (result) {
        // Refresh answers with AI responses
        const supabase = createClient();
        const { data: updatedAnswers } = await supabase
          .from("answers")
          .select("*")
          .eq("turn_id", turnId);

        if (updatedAnswers) {
          set({ answers: updatedAnswers });
        }
      }

      console.log("AI responses processed successfully");
      return result;
    } catch (error) {
      console.error("Error processing AI responses:", error);
      throw error;
    } finally {
      set({ isProcessingAI: false });
    }
  },
  submitVote: async (answerId, voterId, voteType = "up") => {
    try {
      const data = await actions.submitVote(answerId, voterId, voteType);

      // Update local state with the new vote
      if (data && data.length > 0) {
        set((state) => ({
          votes: [...state.votes, data[0]],
        }));
      }

      return { success: true };
    } catch (err) {
      console.error("Error submitting vote:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "An unknown error occurred",
      };
    }
  },

  nextTurn: async (turnId) => {
    try {
      // Call the server action to advance to the next turn
      const result = await actions.nextTurn(turnId);

      // If the game ended, update local state
      if (result.gameEnded) {
        set((state) => {
          if (!state.currentGame) return state;

          return {
            currentGame: {
              ...state.currentGame,
              room: {
                ...state.currentGame.room,
                game_status: "completed" as GameStatus,
              },
            },
          };
        });
      }

      // Reset answers and votes for next turn
      set({
        answers: [],
        votes: [],
        currentScenario: null,
      });

      return result;
    } catch (err) {
      console.error("Error in nextTurn:", err);
      return { gameEnded: false };
    }
  },
  fetchDeciderHistory: async (roundId) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("decider_history")
        .select("*")
        .eq("round_id", roundId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching decider history:", error);
      return [];
    }
  },
  processAfterVoting: async (roomId: string): Promise<boolean> => {
    try {
      const { currentGame, currentTurn } = get();

      if (!currentGame || !currentTurn) {
        console.error("No active game or turn in processAfterVoting");
        return false;
      }

      // Get current turn ID
      const turnId = currentTurn.id;
      if (!turnId) {
        console.error("No turn ID available for processAfterVoting");
        return false;
      }

      // Call nextTurn with the current turn ID
      const result = await actions.nextTurn(turnId);

      // Reset local state for next turn
      set({
        answers: [],
        votes: [],
        currentScenario: null,
      });

      return !result.gameEnded;
    } catch (err) {
      console.error("Error processing after voting:", err);
      return false;
    }
  },

  fetchTurnById: async (turnId: string): Promise<Turn | null> => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("turns")
        .select("*")
        .eq("id", turnId)
        .single();

      if (error) throw error;
      return data as Turn;
    } catch (error) {
      console.error("Error fetching turn:", error);
      return null;
    }
  },
  startTimer: (duration) => {
    set({ timerEnd: new Date(Date.now() + duration * 1000) });
  },

  clearTimer: () => {
    set({ timerEnd: null });
  },

  getScenarioById: async (scenarioId: string): Promise<Scenario> => {
    try {
      const scenario = await actions.getScenarioById(scenarioId);
      return scenario;
    } catch (error) {
      console.error("Error fetching scenario:", error);
      throw error;
    }
  },
  resetState: () => {
    set({
      currentGame: null,
      currentScenario: null,
      currentTurn: null,
      answers: [],
      votes: [],
      timerEnd: null,
      // disconnectedPlayers: [], // Uncomment if you're using this
    });
  },
}));
