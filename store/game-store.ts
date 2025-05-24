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
  // Signature changed: Now accepts Room and Player[] directly
  syncWithUserRoomStore: (room: Room | null, players: Player[]) => void; 
  processAIResponses: (turnId: string) => Promise<boolean>;
  submitVote: (
    answerId: string,
    voterId: string
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
  _answersSubscription: null as any, // Using 'any' for Supabase RealtimeChannel type
  _votesSubscription: null as any,
  _scenariosSubscription: null as any,

  subscribeToGame: (roomId) => {
    const supabase = createClient();
    let turnsSubscription: any = null; // To store the turns subscription

    // This function is now streamlined:
    // - It relies on `currentGame.room` and `currentGame.players` being up-to-date from `syncWithUserRoomStore`.
    // - It primarily fetches rounds for the room and then turns for the current round.
    const fetchGameAndRoundData = async () => {
      console.log(`[game-store] fetchGameAndRoundData for room: ${roomId}`);
      const currentRoomState = get().currentGame?.room;
      if (!currentRoomState || currentRoomState.id !== roomId) {
        console.warn(`[game-store] fetchGameAndRoundData: Room ID mismatch or no current room. Expected ${roomId}, got ${currentRoomState?.id}`);
        return null; // Or handle appropriately
      }

      try {
        // Fetch rounds for the current room
        const { data: roundsData, error: roundsError } = await supabase
          .from("rounds")
          .select("*")
          .eq("room_id", roomId)
          .order("round_number");

        if (roundsError) {
          console.error(`[game-store] Error fetching rounds for room ${roomId}:`, roundsError);
          throw roundsError;
        }
        
        const rounds = roundsData || [];
        let currentRound: Round | undefined = rounds.find(r => r.round_number === currentRoomState.current_round);
        let turns: Turn[] = [];
        let fetchedCurrentTurn: Turn | null = null;

        if (currentRound) {
          console.log(`[game-store] Current round for room ${roomId} is ${currentRound.id}, number ${currentRound.round_number}`);
          const { data: turnsData, error: turnsError } = await supabase
            .from("turns")
            .select("*")
            .eq("round_id", currentRound.id)
            .order("turn_number");

          if (turnsError) {
            console.error(`[game-store] Error fetching turns for round ${currentRound.id}:`, turnsError);
            // Continue without turns for this round, or throw
          } else {
            turns = turnsData || [];
            if (currentRoomState.current_turn) {
              fetchedCurrentTurn = turns.find(t => t.turn_number === currentRoomState.current_turn) || null;
            }
          }
        } else {
          console.log(`[game-store] No current round found for room ${roomId} based on room.current_round: ${currentRoomState.current_round}`);
        }
        
        set((state) => {
          if (!state.currentGame) { // Should not happen if currentRoomState is valid
             console.error("[game-store] fetchGameAndRoundData: currentGame became null unexpectedly.");
             return state;
          }
          return {
            ...state,
            currentGame: {
              ...state.currentGame,
              rounds: rounds.map(r => ({ ...r, status: r.status as TurnStatus })),
              turns: turns,
            },
            currentTurn: fetchedCurrentTurn || state.currentTurn, // Update currentTurn based on fetched data
          };
        });
        
        // After updating rounds and current turn, ensure turn-specific subscriptions are correct.
        if (fetchedCurrentTurn?.id && fetchedCurrentTurn.id !== get().currentTurn?.id) {
           // If the current turn changed, (re)subscribe to its answers, votes, scenarios
           get().subscribeToAnswers(fetchedCurrentTurn.id);
           get().subscribeToVotes(fetchedCurrentTurn.id);
           get().subscribeToScenarios(fetchedCurrentTurn.id); // Assuming this is also turn-specific
        }
        return currentRound?.id || null; // Return current round ID for turn subscription management
      } catch (error) {
        console.error(`[game-store] Exception in fetchGameAndRoundData for room ${roomId}:`, error);
        return null;
      }
    };
    
    // Setup Turn Subscription Logic (to be called when currentRoundId changes)
    const setupTurnSpecificSubscription = (currentRoundId: string | null) => {
      console.log(`[game-store] setupTurnSpecificSubscription called for round: ${currentRoundId}`);
      if (turnsSubscription) {
        console.log(`[game-store] Removing previous turns subscription.`);
        turnsSubscription.unsubscribe();
        turnsSubscription = null;
      }

      if (!currentRoundId) {
        console.log(`[game-store] No current round ID, skipping turns subscription.`);
        set({ currentTurn: null, answers: [], votes: [], currentScenario: null }); // Clear turn-specific data
        return;
      }

      console.log(`[game-store] Setting up new turns subscription for round: ${currentRoundId}`);
      turnsSubscription = supabase
        .channel(`game-store-turns-${currentRoundId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "turns",
            filter: `round_id=eq.${currentRoundId}`,
          },
          async (payload) => {
            console.log(`[game-store] Turn change for round ${currentRoundId}:`, payload.eventType, payload.new);
            const newTurn = payload.new as Turn;
            const oldTurn = payload.old as Turn; // For DELETE
            
            set((state) => {
              if (!state.currentGame) return state;
              let updatedTurns = [...state.currentGame.turns];
              let newCurrentTurnState: Turn | null = state.currentTurn;

              switch (payload.eventType) {
                case "INSERT":
                  if (!updatedTurns.find(t => t.id === newTurn.id)) updatedTurns.push(newTurn);
                  // Check if this new turn is now the current turn based on room's current_turn pointer
                  if (state.currentGame.room.current_turn === newTurn.turn_number) {
                    newCurrentTurnState = newTurn;
                  }
                  break;
                case "UPDATE":
                  updatedTurns = updatedTurns.map(t => t.id === newTurn.id ? newTurn : t);
                  if (state.currentTurn?.id === newTurn.id) {
                    newCurrentTurnState = newTurn;
                  }
                  break;
                case "DELETE":
                  updatedTurns = updatedTurns.filter(t => t.id !== oldTurn.id);
                  if (state.currentTurn?.id === oldTurn.id) {
                    newCurrentTurnState = null; // Current turn was deleted
                  }
                  break;
              }
              
              // If currentTurn changed, update scenario and other turn-specific data/subscriptions
              if (newCurrentTurnState?.id !== state.currentTurn?.id) {
                if (newCurrentTurnState?.scenario_id) {
                  get().getScenarioById(newCurrentTurnState.scenario_id).then(scenario => set({ currentScenario: scenario }));
                } else {
                  set({ currentScenario: null });
                }
                // Re-subscribe to answers/votes for the new turn
                if (newCurrentTurnState) {
                  get().subscribeToAnswers(newCurrentTurnState.id);
                  get().subscribeToVotes(newCurrentTurnState.id);
                  get().subscribeToScenarios(newCurrentTurnState.id);
                } else {
                  // Clear answers/votes if no current turn
                  set({ answers: [], votes: []});
                }
              }
              
              return {
                ...state,
                currentGame: { ...state.currentGame, turns: updatedTurns },
                currentTurn: newCurrentTurnState,
              };
            });
          }
        )
        .subscribe((status, err) => {
          if (err) console.error(`[game-store] Turns subscription error for round ${currentRoundId}:`, err.message);
          else console.log(`[game-store] Turns subscription status for round ${currentRoundId}: ${status}`);
        });
    };

    // Initial fetch and setup subscriptions
    fetchGameAndRoundData().then(currentRoundId => {
      setupTurnSpecificSubscription(currentRoundId);
    });

    // Main channel for room and rounds updates
    const mainChannel = supabase
      .channel(`game-store-main-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        async (payload) => {
          console.log(`[game-store] Room change detected (via game-store sub):`, payload.eventType);
          // Room data itself is synced by user-room-store. Here we react to potential changes
          // in current_round or current_turn pointers.
          const newRoundId = await fetchGameAndRoundData();
          const currentSubscribedRoundId = turnsSubscription?.topic.split('-').pop(); // hacky way to get roundId from channel topic
          if (newRoundId !== currentSubscribedRoundId) {
            setupTurnSpecificSubscription(newRoundId);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          console.log(`[game-store] Rounds change detected for room ${roomId}:`, payload.eventType);
          const newRoundId = await fetchGameAndRoundData();
          const currentSubscribedRoundId = turnsSubscription?.topic.split('-').pop();
          if (newRoundId !== currentSubscribedRoundId) {
             setupTurnSpecificSubscription(newRoundId);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) console.error(`[game-store] Main channel subscription error for room ${roomId}:`, err.message);
        else console.log(`[game-store] Main channel subscription status for room ${roomId}: ${status}`);
      });

    return () => {
      console.log(`[game-store] Unsubscribing from game for room: ${roomId}`);
      supabase.removeChannel(mainChannel);
      if (turnsSubscription) {
        turnsSubscription.unsubscribe();
      }
    };
  },

  subscribeToAnswers: (turnId) => {
    const supabase = createClient();
    console.log(`[game-store] Attempting to subscribe to answers for turn: ${turnId}`);

    // Unsubscribe from previous if exists
    if (get()._answersSubscription) {
      console.log(`[game-store] Unsubscribing from previous answers subscription for turn: ${get().currentTurn?.id}`);
      get()._answersSubscription.unsubscribe();
      set({ _answersSubscription: null, answers: [] }); // Clear answers when turn changes
    }

    if (!turnId) {
      console.warn("[game-store] subscribeToAnswers: turnId is invalid. Skipping subscription.");
      return () => {};
    }

    console.log(`[game-store] Subscribing to answers for turn: ${turnId}`);
    const newSubscription = supabase
      .channel(`answers-${turnId}`) // Unique channel name per turn
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "answers",
          filter: `turn_id=eq.${turnId}`,
        },
        (payload) => {
          console.log(`[game-store] Answers change for turn ${turnId}:`, payload.eventType);
          set((state) => {
            let newAnswers = [...state.answers];
            const newAnswer = payload.new as Answer;
            const oldAnswerId = payload.old?.id;

            switch (payload.eventType) {
              case "INSERT":
                if (!newAnswers.find(a => a.id === newAnswer.id)) newAnswers.push(newAnswer);
                break;
              case "UPDATE":
                newAnswers = newAnswers.map((a) =>
                  a.id === newAnswer.id ? newAnswer : a
                );
                break;
              case "DELETE":
                if (oldAnswerId) newAnswers = newAnswers.filter((a) => a.id !== oldAnswerId);
                break;
            }
            return { answers: newAnswers };
          });
        }
      )
      .subscribe((status, err) => {
        if (err) console.error(`[game-store] Answers subscription error for turn ${turnId}:`, err.message);
        else console.log(`[game-store] Answers subscription status for turn ${turnId}: ${status}`);
      });
    
    set({ _answersSubscription: newSubscription });

    return () => {
      console.log(`[game-store] Unsubscribing from answers for turn: ${turnId}`);
      newSubscription.unsubscribe();
      set({ _answersSubscription: null, answers: [] }); // Clear on explicit unsubscribe too
    };
  },
  subscribeToVotes: (turnId) => {
    const supabase = createClient();
    console.log(`[game-store] Attempting to subscribe to votes for turn: ${turnId}`);

    if (get()._votesSubscription) {
      console.log(`[game-store] Unsubscribing from previous votes subscription for turn: ${get().currentTurn?.id}`);
      get()._votesSubscription.unsubscribe();
      set({ _votesSubscription: null, votes: [] }); // Clear votes when turn changes
    }

    if (!turnId) {
      console.warn("[game-store] subscribeToVotes: turnId is invalid. Skipping subscription.");
      return () => {};
    }
    
    const setupSubscriptionForTurn = async () => {
      console.log(`[game-store] Setting up votes subscription for turn: ${turnId}`);
      // Fetch answer IDs for the current turn to filter votes, as votes table doesn't have turn_id directly.
      // This is a simplification; ideally, votes would link to turn_id or this logic would be more robust.
      const { data: turnAnswers, error: answersError } = await supabase
        .from("answers")
        .select("id")
        .eq("turn_id", turnId);

      if (answersError || !turnAnswers || turnAnswers.length === 0) {
        console.warn(`[game-store] No answers found for turn ${turnId}, or error fetching them. Votes subscription might be ineffective. Error: ${answersError?.message}`);
        // Still subscribe to the table, but filtering might not work as expected if no answers.
      }
      const answerIdsForTurn = new Set((turnAnswers || []).map(a => a.id));

      const newSubscription = supabase
        .channel(`votes-${turnId}`) // Unique channel name per turn
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

  // subscribeToTurns will be removed as its logic is integrated into subscribeToGame's turn management
  subscribeToTurns: (roundId: string) => {
    console.warn("[game-store] Standalone subscribeToTurns is deprecated and should be removed. Turn subscriptions are handled by subscribeToGame.");
    // const supabase = createClient();
    // const subscription = supabase
    //   .channel(`turns:${roundId}`)
    //   .on(
    //     "postgres_changes",
    //     {
    //       event: "*", // This listens for all events (INSERT, UPDATE, DELETE)
    //       schema: "public",
    //       table: "turns",
    //       filter: `round_id=eq.${roundId}`,
    //     },
    //     async (payload) => {
    //       console.log("Turn subscription payload:", payload);
    //       const newTurn = payload.new as Turn;
    //       console.log("Turn updated:---", newTurn);
    //       set((state) => ({
    //         currentTurn: newTurn,
    //       }));
    //       if (
    //         newTurn.status === "selecting_scenario" ||
    //         newTurn.status === "voting"
    //       ) {
    //         const supabase = createClient();
    //         const { data: answers } = await supabase
    //           .from("answers")
    //           .select("*")
    //           .eq("turn_id", newTurn.id);
    //         if (answers) {
    //           set({ answers });
    //         }
    //       }
    //     }
    //   )
    //   .subscribe();
    // console.log(`Subscription to turns:${roundId} created`);
    // return () => {
    //   console.log(`Removing subscription for turns:${roundId}`);
    //   supabase.removeChannel(subscription);
    // };
    return () => {
      console.log(`[game-store] Attempted to unsubscribe from deprecated standalone subscribeToTurns for round ${roundId}.`);
    };
  },

  startGame: async (roomId, userId) => {
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
    console.log("[game-store] startGame called for room:", roomId, "user:", userId);
    try {
      // Call the server action to start the game.
      // This action should set the room's game_status to 'in_progress'.
      const result = await actions.startGame(roomId, userId);
      if (!result?.success) {
        console.error("[game-store] Server action startGame failed:", result?.error);
        throw new Error(result?.error || "Failed to start game via server action");
      }

      console.log("[game-store] Server action startGame successful for room:", roomId);
      // user-room-store's subscribeToRoom will detect the room status change to 'in_progress'.
      // It will then call game-store's syncWithUserRoomStore, updating currentGame.room.
      // After that, subscribeToGame will be called here to fetch rounds/turns.

      // Initialize subscriptions for the game.
      // This will call fetchGameAndRoundData, which relies on currentGame.room being up-to-date.
      get().subscribeToGame(roomId);
      
      // Note: The direct update to game_status and re-fetch of room data has been removed.
      // The reactive flow from user-room-store updating game-store is now relied upon.
      // Also, the incorrect syncWithUserRoomStore(roomId) call was removed.

      return true;
    } catch (error: any) {
      console.error("[game-store] startGame client-side error:", error.message);
      // throw error; // Re-throwing might be too aggressive depending on UI handling
      return false; // Indicate failure
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

  syncWithUserRoomStore: (updatedRoom: Room | null, updatedPlayers: Player[]) => {
    console.log("[game-store] syncWithUserRoomStore called with room:", updatedRoom?.id, "and", updatedPlayers?.length, "players.");
    set((state) => {
      const currentGameState = state.currentGame;

      if (!updatedRoom) {
        console.log("[game-store] Room is null, resetting game state.");
        // Consider unsubscribing from all game-specific subscriptions here
        // This would require access to the unsubscribe functions returned by subscribeToX methods
        // For now, just resetting state. Proper unsubscription needs more refactoring.
        return {
          ...state,
          currentGame: null,
          currentScenario: null,
          currentTurn: null,
          answers: [],
          votes: [],
        };
      }

      if (updatedRoom.game_status === "completed" && currentGameState?.room.game_status !== "completed") {
        console.log("[game-store] Room status is completed. Finalizing game state.");
        // Similar to above, consider unsubscribing from active game subscriptions.
        return {
          ...state,
          currentGame: {
            ...currentGameState,
            room: updatedRoom,
            players: updatedPlayers,
            rounds: currentGameState?.rounds || [], // Keep existing rounds data if any
            turns: currentGameState?.turns || [],   // Keep existing turns data if any
          },
          // Potentially keep currentTurn, answers, votes for a final results display
          // currentTurn: null, // Or keep for results
          // answers: [],
          // votes: [],
        };
      }
      
      // If there's no current game state, but we receive a valid room, initialize.
      // This can happen if game-store initializes after user-room-store has a room.
      if (!currentGameState && updatedRoom) {
        console.log("[game-store] Initializing currentGame with room from user-room-store:", updatedRoom.id);
        return {
          ...state,
          currentGame: {
            room: updatedRoom,
            players: updatedPlayers,
            rounds: [], // Rounds will be populated by subscribeToGame
            turns: [],  // Turns will be populated by subscribeToGame (or its turn subscription part)
          },
        };
      }

      // Default update for an ongoing game
      if (currentGameState) {
        return {
          ...state,
          currentGame: {
            ...currentGameState,
            room: updatedRoom,
            players: updatedPlayers,
          },
        };
      }
      return state; // No change if no relevant conditions met
    });
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

  submitVote: async (answerId, voterId) => {
    try {
      const data = await actions.submitVote(answerId, voterId);

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
