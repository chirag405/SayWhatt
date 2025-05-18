import { create } from "zustand";
import { createClient } from "@/utils/supabase/client";
import {
  createAndJoinRoom,
  joinRoom,
  getPlayerById,
  deletePlayer,
  updateRoomStatus,
  getPlayersInRoom,
  getRoomByCode,
} from "@/actions/user";
import { Player, Room, Round, Turn } from "@/types/types";
import { fetchRoomById } from "@/actions/game";
import { useGameStore } from "./game-store";

interface UserRoomState {
  currentUser: Player | null;
  currentRoom: Room | null;
  roomPlayers: Player[];
  currentRound: Round | null;
  lastRoomCheck: number; // Add timestamp to track last room check

  currentTurn: Turn | null;
  isRoundVotingPhase: boolean;
  setCurrentTurn: (turn: Turn | null) => void;
  setCurrentRoom: (room: Room | null) => void;
  // Realtime subscriptions
  subscribeToRoom: (roomId: string) => () => void;
  subscribeToPlayers: (roomId: string) => () => void;
  subscribeToRounds: (roomId: string) => () => void;

  subscribeToDeciderHistory: (roundId: string) => () => void;

  // Room methods
  createAndJoinRoom: (params: {
    nickname: string;
    totalRounds: number;
    timeLimit: number;
  }) => Promise<{
    success: boolean;
    room?: Room;
    player?: Player;
    error?: string;
  }>;

  joinRoom: (params: { roomCode: string; nickname: string }) => Promise<{
    success: boolean;
    room?: Room;
    player?: Player;
    error?: string;
  }>;

  fetchRoomById: (
    roomId: string
  ) => Promise<{ success: boolean; room?: Room; error?: string }>;
  fetchRoomByCode: (
    roomCode: string
  ) => Promise<{ success: boolean; room?: Room; error?: string }>;
  updateRoomStatus: (params: {
    roomId: string;
    status: "waiting" | "in_progress" | "completed";
  }) => Promise<{ success: boolean; room?: Room; error?: string }>;

  // Player methods
  fetchPlayerById: (
    playerId: string
  ) => Promise<{ success: boolean; player?: Player; error?: string }>;
  fetchPlayersInRoom: (
    roomId: string
  ) => Promise<{ success: boolean; players?: Player[]; error?: string }>;
  deletePlayer: (
    playerId: string
  ) => Promise<{ success: boolean; error?: string }>;

  // Updated: New method to fetch turn data
  fetchCurrentTurn: (
    roundId: string
  ) => Promise<{ success: boolean; turn?: Turn | null; error?: string }>;

  setRoomPlayers: (players: Player[]) => void;

  // Utility
  resetState: () => void;

  // New method to force refresh room status
  refreshRoomStatus: (roomId: string) => Promise<void>;
}

export const useUserRoomStore = create<UserRoomState>((set, get) => ({
  currentUser: null,
  currentRoom: null,
  roomPlayers: [],
  currentRound: null,
  lastRoomCheck: 0,
  currentTurn: null,
  isRoundVotingPhase: false,
  // Realtime subscription for room changes
  subscribeToRoom: (roomId) => {
    console.log("Subscribing to room changes for:", roomId);
    const supabase = createClient();

    // Initial fetch of the room data
    const fetchInitialRoomData = async () => {
      try {
        const { data: room, error } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", roomId)
          .single();

        if (error) {
          console.error("Error fetching initial room data:", error);
          return;
        }

        if (room) {
          console.log(
            "Initial room data loaded:",
            room.id,
            "status:",
            room.game_status
          );

          // Check if the game is already completed
          if (room.game_status === "completed") {
            console.log("Room is already in completed state");
            // Make sure game store is in completed state too
            const gameStore = useGameStore.getState();
            if (gameStore.currentGame) {
              gameStore.currentGame.room.game_status = "completed";
            }
          }

          // If room has current_turn number, fetch the actual turn data
          if (room.current_turn) {
            const roundId = get().currentRound?.id;
            if (roundId) {
              get()
                .fetchCurrentTurn(roundId)
                .then(({ turn }) => {
                  // Force immediate update of room status with turn data
                  set((state) => ({
                    currentRoom: room,
                    currentTurn: turn || null,
                    isRoundVotingPhase: room.round_voting_phase || false,
                    lastRoomCheck: Date.now(),
                  }));

                  // Sync with gameStore if we're in a game
                  if (room.game_status === "in_progress") {
                    const gameStore = useGameStore.getState();
                    if (gameStore.currentGame) {
                      gameStore.syncWithUserRoomStore(roomId);
                    }
                  }
                });
            } else {
              // No round id available, just update room
              set((state) => ({
                currentRoom: room,
                isRoundVotingPhase: room.round_voting_phase || false,
                lastRoomCheck: Date.now(),
              }));

              // Still sync with gameStore
              if (room.game_status === "in_progress") {
                const gameStore = useGameStore.getState();
                if (gameStore.currentGame) {
                  gameStore.syncWithUserRoomStore(roomId);
                }
              }
            }
          } else {
            // No current turn, just update room
            set((state) => ({
              currentRoom: room,
              isRoundVotingPhase: room.round_voting_phase || false,
              lastRoomCheck: Date.now(),
            }));

            // Still sync with gameStore
            if (room.game_status === "in_progress") {
              const gameStore = useGameStore.getState();
              if (gameStore.currentGame) {
                gameStore.syncWithUserRoomStore(roomId);
              }
            }
          }
        }
      } catch (err) {
        console.error("Exception in fetchInitialRoomData:", err);
      }
    };

    // Load initial data
    fetchInitialRoomData();

    // Set up realtime subscription with better logging
    const channel = supabase.channel(`room:${roomId}`).on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        console.log("Room change detected:", payload.eventType);
        console.log("Room payload data:", payload);
        const updatedRoom = payload.new as Room;
        console.log("Room status updated to:", updatedRoom.game_status);

        // Specifically handle when game_status changes to completed
        if (
          updatedRoom.game_status === "completed" &&
          get().currentRoom?.game_status !== "completed"
        ) {
          console.log("Game is now complete! Transitioning to results screen.");
          // Play results sound if available
          try {
            // This needs access to the client-side sound API
            const gameStore = useGameStore.getState();

            // Update game state to completed in game store
            if (gameStore.currentGame) {
              gameStore.currentGame.room.game_status = "completed";
            }
          } catch (error) {
            console.error("Error updating game state on completion:", error);
          }

          // Show toast notification if possible
          try {
            // This would need to be handled at component level
          } catch (err) {}
        }

        // If room has current_turn number and it changed, fetch the actual turn data
        if (updatedRoom.current_turn !== get().currentRoom?.current_turn) {
          const roundId = get().currentRound?.id;
          if (roundId) {
            get()
              .fetchCurrentTurn(roundId)
              .then(({ turn }) => {
                set((state) => ({
                  currentRoom: updatedRoom,
                  currentTurn: turn || null,
                  isRoundVotingPhase: updatedRoom.round_voting_phase || false,
                  lastRoomCheck: Date.now(),
                }));

                // Sync with gameStore if we're in a game
                if (updatedRoom.game_status === "in_progress") {
                  const gameStore = useGameStore.getState();
                  if (gameStore.currentGame) {
                    gameStore.syncWithUserRoomStore(roomId);
                  }
                }
              });
          } else {
            // No round id available, just update room
            set((state) => ({
              currentRoom: updatedRoom,
              isRoundVotingPhase: updatedRoom.round_voting_phase || false,
              lastRoomCheck: Date.now(),
            }));

            // Still sync with gameStore
            if (updatedRoom.game_status === "in_progress") {
              const gameStore = useGameStore.getState();
              if (gameStore.currentGame) {
                gameStore.syncWithUserRoomStore(roomId);
              }
            }
          }
        } else {
          // Current turn hasn't changed, just update room
          set((state) => ({
            currentRoom: updatedRoom,
            isRoundVotingPhase: updatedRoom.round_voting_phase || false,
            lastRoomCheck: Date.now(),
          }));

          // Still sync with gameStore
          if (updatedRoom.game_status === "in_progress") {
            const gameStore = useGameStore.getState();
            if (gameStore.currentGame) {
              gameStore.syncWithUserRoomStore(roomId);
            }
          }
        }
      }
    );
    const subscription = channel.subscribe((status) => {
      console.log(`Room subscription status for ${roomId}:`, status);
    });

    // Also subscribe to game_completed notifications
    const gameCompletedChannel = supabase
      .channel("game_completed_channel")
      .on("broadcast", { event: "game_completed" }, (payload) => {
        console.log("Game completed notification received:", payload);

        const roomId = payload.payload?.room_id;
        const reason = payload.payload?.reason;

        if (roomId === get().currentRoom?.id) {
          console.log(`Game completed for room ${roomId}. Reason: ${reason}`);

          // Force refresh room data
          get().fetchRoomById(roomId);

          // Update game store directly if possible
          try {
            const gameStore = useGameStore.getState();
            if (gameStore.currentGame) {
              gameStore.currentGame.room.game_status = "completed";
            }
          } catch (error) {
            console.error("Error updating game store on completion:", error);
          }
        }
      })
      .subscribe((status, err) => {
        if (err) console.error("Game completed subscription error:", err);
        console.log("Game completed subscription status:", status);
      });

    return () => {
      console.log("Unsubscribing from room:", roomId);
      supabase.removeChannel(channel);
      supabase.removeChannel(gameCompletedChannel);
    };
  },
  setCurrentRoom: (room) => {
    set({ currentRoom: room });
  },

  subscribeToDeciderHistory: (roundId) => {
    const supabase = createClient();
    console.log(`Subscribing to decider history for round: ${roundId}`);

    const subscription = supabase
      .channel(`decider_history:${roundId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "decider_history",
          filter: `round_id=eq.${roundId}`,
        },
        (payload) => {
          console.log("Decider history change:", payload);

          // We don't need to update state here as the room and round
          // subscriptions will handle the updates we care about
        }
      )
      .subscribe((status, err) => {
        if (err) console.error("Decider history subscription error:", err);
        console.log("Decider history subscription status:", status);
      });

    return () => {
      console.log(`Unsubscribing from decider history for round: ${roundId}`);
      supabase.removeChannel(subscription);
    };
  },

  // New method to force refresh room status
  refreshRoomStatus: async (roomId) => {
    try {
      const supabase = createClient();
      const { data: room, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (error) {
        console.error("Error refreshing room status:", error);
        return;
      }

      if (room) {
        // If room has current_turn number, fetch the actual turn data
        if (
          room.current_turn &&
          room.current_turn !== get().currentRoom?.current_turn
        ) {
          const roundId = get().currentRound?.id;
          if (roundId) {
            const { turn } = await get().fetchCurrentTurn(roundId);

            set((state) => {
              // Deep comparison to prevent unnecessary state updates
              if (
                JSON.stringify(state.currentRoom) === JSON.stringify(room) &&
                JSON.stringify(state.currentTurn) === JSON.stringify(turn)
              ) {
                console.log("Room and turn data unchanged, skipping refresh");
                return state;
              }

              console.log("Room status refreshed:", room.game_status);
              return {
                ...state,
                currentRoom: room,
                currentTurn: turn || null,
                isRoundVotingPhase: room.round_voting_phase || false,
              };
            });
          } else {
            // No round id available, just update room
            set((state) => {
              // Deep comparison to prevent unnecessary state updates
              if (JSON.stringify(state.currentRoom) === JSON.stringify(room)) {
                console.log("Room data unchanged, skipping refresh");
                return state;
              }

              console.log("Room status refreshed:", room.game_status);
              return {
                ...state,
                currentRoom: room,
                isRoundVotingPhase: room.round_voting_phase || false,
              };
            });
          }
        } else {
          // Current turn hasn't changed, just update room
          set((state) => {
            // Deep comparison to prevent unnecessary state updates
            if (JSON.stringify(state.currentRoom) === JSON.stringify(room)) {
              console.log("Room data unchanged, skipping refresh");
              return state;
            }

            console.log("Room status refreshed:", room.game_status);
            return {
              ...state,
              currentRoom: room,
              isRoundVotingPhase: room.round_voting_phase || false,
            };
          });
        }
      }
    } catch (err) {
      console.error("Exception in refreshRoomStatus:", err);
    }
  },

  setRoomPlayers: (players) => {
    set({ roomPlayers: players });
  },

  // Enhanced version of subscribeToPlayers in user-room-store.js
  subscribeToPlayers: (roomId) => {
    const supabase = createClient();
    console.log(`Subscribing to players in room: ${roomId}`);

    // Set up initial fetch on subscription
    const fetchAllPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", roomId);

        if (error) {
          console.error("Error fetching players on subscription:", error);
          return;
        }

        // Update the state with the latest players from the database
        // This ensures we have the full, accurate list
        set({ roomPlayers: data });
        console.log("Initial players loaded:", data.length);
      } catch (err) {
        console.error("Exception in fetchAllPlayers:", err);
      }
    };

    // Load players immediately
    fetchAllPlayers();

    // Set up periodic refresh as a safety mechanism
    const refreshInterval = setInterval(() => {
      console.log("Performing safety refresh of player list");
      fetchAllPlayers();
    }, 15000); // Refresh every 15 seconds

    // Enhanced subscription with better handling of DELETE
    const subscription = supabase
      .channel(`players_channel:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log("Player change detected:", payload.eventType);
          console.log("Player payload:", payload);

          if (payload.eventType === "DELETE") {
            const deletedPlayer = payload.old as Player;
            console.log("Player deleted:", deletedPlayer.id);

            // Update local state to remove the player
            set((state) => {
              console.log(
                "Removing player from local state:",
                deletedPlayer.id
              );
              console.log("Current players before:", state.roomPlayers.length);

              // Also force a refresh of the player list from the database
              fetchAllPlayers();

              return {
                roomPlayers: state.roomPlayers.filter(
                  (p) => p.id !== deletedPlayer.id
                ),
              };
            });
          } else if (payload.eventType === "INSERT") {
            // Handle insert as before
            const newPlayer = payload.new as Player;
            set((state) => {
              if (!state.roomPlayers.some((p) => p.id === newPlayer.id)) {
                return { roomPlayers: [...state.roomPlayers, newPlayer] };
              }
              return state;
            });
          } else if (payload.eventType === "UPDATE") {
            // Handle update as before
            const updatedPlayer = payload.new as Player;
            set((state) => {
              const updatedPlayers = state.roomPlayers.map((p) =>
                p.id === updatedPlayer.id ? updatedPlayer : p
              );
              return { roomPlayers: updatedPlayers };
            });
          }
        }
      )
      .subscribe();

    // Return a cleanup function that removes all subscriptions and intervals
    return () => {
      console.log(`Unsubscribing from players in room: ${roomId}`);
      supabase.removeChannel(subscription);
      clearInterval(refreshInterval);
    };
  },
  setCurrentTurn: (turn) => {
    set({ currentTurn: turn });
  },

  // Updated to fetch and return the full Turn object
  fetchCurrentTurn: async (roundId: string) => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from("turns")
        .select("*")
        .eq("round_id", roundId)
        .order("turn_number", { ascending: true })
        .limit(1);

      if (error) {
        console.error("Error fetching current turn:", error);
        return { success: false, error: error.message };
      }

      if (data && data.length > 0) {
        const turn = data[0] as Turn;
        set({ currentTurn: turn });
        return { success: true, turn };
      }

      return { success: true, turn: null };
    } catch (error) {
      console.error("Exception in fetchCurrentTurn:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
  subscribeToRounds: (roomId) => {
    const supabase = createClient();
    console.log(`Subscribing to rounds in room: ${roomId}`);

    // Immediately fetch current round data
    const fetchCurrentRoundData = async () => {
      try {
        const { data: room } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", roomId)
          .single();

        if (room) {
          // Get the current round number
          const currentRoundNumber = room.current_round;
          if (currentRoundNumber) {
            const { data: rounds } = await supabase
              .from("rounds")
              .select("*")
              .eq("room_id", roomId)
              .eq("round_number", currentRoundNumber)
              .limit(1);

            if (rounds && rounds.length > 0) {
              const currentRound = rounds[0] as Round;
              set({ currentRound });

              // Now fetch the current turn
              if (room.current_turn) {
                const { data: turns } = await supabase
                  .from("turns")
                  .select("*")
                  .eq("round_id", currentRound.id)
                  .eq("turn_number", room.current_turn)
                  .limit(1);

                if (turns && turns.length > 0) {
                  const currentTurn = turns[0] as Turn;
                  set({ currentTurn });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching current round data:", error);
      }
    };

    // Execute immediate fetch
    fetchCurrentRoundData();

    // Set up round subscription (existing code)
    const roundSubscription = supabase
      .channel(`rounds:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log("Round change detected:", payload.eventType);
          console.log("Round payload data:", payload);

          switch (payload.eventType) {
            case "INSERT":
              set({ currentRound: payload.new as Round });
              break;
            case "UPDATE":
              const updatedRound = payload.new as Round;
              set({ currentRound: updatedRound });

              // If the round current_turn changed, fetch the new turn data
              if (
                updatedRound.current_turn !== get().currentRound?.current_turn
              ) {
                get().fetchCurrentTurn(updatedRound.id);
              }
              break;
          }
        }
      )
      .subscribe((status, error) => {
        if (error) {
          console.error("Error subscribing to rounds:", error);
        } else {
          console.log("Subscribed to rounds successfully:", status);
        }
      });

    // Fix for the turns subscription - using separate queries instead of IN clause
    const turnSubscription = supabase
      .channel(`turns:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "turns",
        },
        async (payload) => {
          console.log("Turn change detected:", payload.eventType);
          console.log("Turn payload data:", payload);

          // Verify this turn belongs to a round in our room before processing
          const turnData = payload.new as Turn;
          if (!turnData || !turnData.round_id) return;

          try {
            // Check if this turn belongs to our room
            const { data: round } = await supabase
              .from("rounds")
              .select("room_id")
              .eq("id", turnData.round_id)
              .single();

            if (round && round.room_id === roomId) {
              // This turn belongs to our room, proceed with updates
              if (get().currentRound?.id) {
                const roundId = get().currentRound
                  ? get().currentRound!.id
                  : null;

                // Fetch the updated round data
                const { data, error } = await supabase
                  .from("rounds")
                  .select("*")
                  .eq("id", roundId)
                  .single();

                if (data && !error) {
                  const round = data as Round;
                  set({ currentRound: round });

                  // If there's a turn update, also refresh the turn data
                  if (
                    payload.eventType === "UPDATE" ||
                    payload.eventType === "INSERT"
                  ) {
                    set({ currentTurn: turnData });
                  }
                }
              }
            }
          } catch (error) {
            console.error("Error processing turn update:", error);
          }
        }
      )
      .subscribe((status, error) => {
        if (error) {
          console.error("Error subscribing to turns:", error);
        } else {
          console.log("Subscribed to turns successfully:", status);
        }
      });

    return () => {
      console.log(`Unsubscribing from rounds and turns in room: ${roomId}`);
      supabase.removeChannel(roundSubscription);
      supabase.removeChannel(turnSubscription);
    };
  },

  // Room methods
  createAndJoinRoom: async ({ nickname, totalRounds, timeLimit }) => {
    const result = await createAndJoinRoom({
      nickname,
      totalRounds,
      timeLimit,
    });

    if (result.success) {
      set({
        currentRoom: result.room || null,
        currentUser: result.player || null,
        roomPlayers: result.player ? [result.player] : [],
      });
    }

    return {
      success: result.success,
      room: result.room,
      player: result.player,
      error: result.error,
    };
  },

  joinRoom: async ({ roomCode, nickname }) => {
    const result = await joinRoom({ roomCode, nickname });

    if (result.success) {
      set({
        currentRoom: result.room || null,
        currentUser: result.player || null,
      });
      if (result.room) await get().fetchPlayersInRoom(result.room.id);
    }

    try {
      return {
        success: result.success,
        room: result.room,
        player: result.player,
        error: result.error,
      };
    } catch (error) {
      console.error("Error in joinRoom:", error);
      return {
        success: false,
        error: "An unexpected error occurred while joining the room.",
      };
    }
  },
  fetchRoomById: async (roomId) => {
    try {
      // Fetch room data
      const result = await fetchRoomById(roomId);

      if (result.success) {
        set({ currentRoom: result.room || null });

        // Also fetch the latest players in the room to sync state
        // This is important when players leave
        try {
          const playersResult = await get().fetchPlayersInRoom(roomId);

          // Check if there's only one player left and the game isn't completed yet
          if (
            playersResult.success &&
            playersResult.players &&
            playersResult.players.length === 1 &&
            result.room?.game_status !== "completed"
          ) {
            // Force update room status to completed if only one player remains
            const supabase = createClient();
            await supabase
              .from("rooms")
              .update({
                game_status: "completed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", roomId);

            // Update our local state
            set((state) => ({
              currentRoom: state.currentRoom
                ? { ...state.currentRoom, game_status: "completed" }
                : null,
            }));

            console.log("Room marked as completed - only one player remains");
          }
        } catch (playerError) {
          console.error(
            "Error fetching players during room refresh:",
            playerError
          );
        }
      }

      return result;
    } catch (error) {
      console.error("Error in fetchRoomById:", error);
      return {
        success: false,
        error: "An unexpected error occurred while fetching the room by ID.",
      };
    }
  },

  fetchRoomByCode: async (roomCode) => {
    const result = await getRoomByCode(roomCode);
    if (result.success) set({ currentRoom: result.room || null });
    return result;
  },

  updateRoomStatus: async ({ roomId, status }) => {
    const result = await updateRoomStatus({ roomId, status });
    if (result.success) {
      set((state) => ({
        currentRoom: state.currentRoom
          ? { ...state.currentRoom, game_status: status }
          : null,
      }));
    }
    return result;
  },

  fetchPlayerById: async (playerId) => {
    return await getPlayerById(playerId);
  },

  fetchPlayersInRoom: async (roomId) => {
    const result = await getPlayersInRoom(roomId);
    if (result.success) set({ roomPlayers: result.players || [] });
    return result;
  },

  deletePlayer: async (playerId) => {
    const result = await deletePlayer(playerId);
    if (result.success) {
      console.log("player deleted", playerId);
      set((state) => ({
        roomPlayers: state.roomPlayers.filter((p) => p.id !== playerId),
      }));
      console.log("room players after delete", get().roomPlayers);
    }
    return result;
  },

  resetState: () => {
    set({
      currentUser: null,
      currentRoom: null,
      roomPlayers: [],
      currentRound: null,
      lastRoomCheck: 0,
      currentTurn: null,
      isRoundVotingPhase: false,
    });
  },
}));

export type { UserRoomState };
