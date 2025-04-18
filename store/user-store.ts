import { create } from "zustand";
import { createClient } from "@/utils/supabase/client";
import {
  createUser,
  updateConnectionStatus,
  transferHostRole,
  getPlayerById,
  updatePlayerPoints,
  deletePlayer,
} from "@/actions/user";
import { RealtimeChannel } from "@supabase/supabase-js";
import { persist } from "zustand/middleware";
import { Player } from "@/types/types";
import { getPlayersInRoom } from "@/actions/room";
type UserState = {
  // Current player
  currentPlayer: Player | null;
  isLoading: boolean;
  error: string | null;

  // Other players in room
  players: Player[];

  // Realtime
  realtimeChannel: RealtimeChannel | null;

  // Actions
  initialize: () => Promise<void>;
  createAndJoinRoom: (
    roomId: string,
    roomCode: string,
    nickname: string,
    isHost: boolean,
    totalRounds: number,
    timeLimit: number
  ) => Promise<false | { success: boolean; roomId: string }>;
  joinExistingRoom: (
    roomId: string,
    nickname: string
  ) => Promise<boolean | { success: boolean; roomId: string }>;
  reconnectPlayer: (playerId: string, roomId: string) => Promise<boolean>;
  disconnectFromRoom: () => Promise<void>;
  transferHost: (newHostId: string) => Promise<boolean>;
  subscribeToRoomPlayers: (roomId: string) => Promise<void>;
  subscribeToUserUpdates: (roomId: string) => Promise<void>; // Add this line
  unsubscribeFromRealtime: () => void;
  updatePlayersList: (roomId: string) => Promise<void>;
  handlePlayerDisconnect: (playerId: string) => void;
  checkIfPlayerExists: (roomId: string, nickname: string) => Promise<boolean>;
  clearUserState: () => void;
  checkRoomCodeExists: (roomCode: string) => Promise<string | null>;
};

// Create the store
export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // State
      currentPlayer: null,
      isLoading: false,
      error: null,
      players: [],
      realtimeChannel: null,

      // Initialize store on app start
      initialize: async () => {
        set({ isLoading: true });

        try {
          // Check if this is after a reload
          const isReloading = localStorage.getItem("is_reloading") === "true";
          const reloadTimestamp = localStorage.getItem("reload_timestamp");
          const storedPlayerId = localStorage.getItem("player_id");
          const storedRoomId = localStorage.getItem("room_id");

          if (
            isReloading &&
            reloadTimestamp &&
            storedPlayerId &&
            storedRoomId
          ) {
            // It's been less than 10 seconds since the reload flag was set
            const timeSinceReload = Date.now() - parseInt(reloadTimestamp);

            if (timeSinceReload < 10000) {
              // This is a reload, so reconnect the player
              await get().reconnectPlayer(storedPlayerId, storedRoomId);
            }
          }

          // Clear the reload flags
          localStorage.removeItem("is_reloading");
          localStorage.removeItem("reload_timestamp");

          // Handle the player_cleanup_needed case from room store
          // const playerToCleanup = localStorage.getItem("player_cleanup_needed");
          // if (playerToCleanup) {
          // await deletePlayer(playerToCleanup);
          // localStorage.removeItem("player_cleanup_needed");
          // }
        } catch (error) {
          console.error("Error initializing user store:", error);
          set({
            error: error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          set({ isLoading: false });
        }
      },
      // Create a new user and join room
      // Update createAndJoinRoom function
      createAndJoinRoom: async (
        roomId: string,
        roomCode: string,
        nickname: string,
        isHost: boolean,
        totalRounds: number,
        timeLimit: number
      ) => {
        set({ isLoading: true, error: null });
        try {
          // First create the room
          const supabase = createClient();
          const { error: roomError } = await supabase.from("rooms").insert({
            id: roomId,
            room_code: roomCode,
            total_rounds: totalRounds,
            time_limit: timeLimit,
            game_status: "waiting",
            current_round: 0,
          });

          if (roomError) {
            set({ error: "Failed to create room" });
            return false;
          }

          // Then create the user
          const result = await createUser({ roomId, nickname, isHost });

          if (!result.success || !result.player) {
            set({ error: result.error || "Failed to create user" });
            return false;
          }

          set({ currentPlayer: result.player });
          await get().subscribeToRoomPlayers(roomId);
          await get().updatePlayersList(roomId);
          return { success: true, roomId };
        } catch (error) {
          console.error("Error creating and joining room:", error);
          set({
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },
      checkRoomCodeExists: async (roomCode: string) => {
        const supabase = createClient();
        try {
          const { data, error } = await supabase
            .from("rooms")
            .select("id")
            .eq("room_code", roomCode)
            .single();

          if (error) return null;
          return data?.id || null;
        } catch (error) {
          console.error("Error checking room code:", error);
          return null;
        }
      },
      // Join an existing room
      // Update joinExistingRoom function
      joinExistingRoom: async (
        roomCode: string,
        nickname: string
      ): Promise<boolean | { success: boolean; roomId: string }> => {
        set({ isLoading: true, error: null });
        try {
          // First, find the room ID using the room code
          const roomId = await get().checkRoomCodeExists(roomCode);

          if (!roomId) {
            set({ error: "Room not found. Please check your room code." });
            return false;
          }

          // Check if nickname is already taken in this room
          const exists = await get().checkIfPlayerExists(roomId, nickname);
          if (exists) {
            set({ error: "Nickname already exists in this room" });
            return false;
          }

          const result = await createUser({ roomId, nickname, isHost: false });

          if (!result.success || !result.player) {
            set({ error: result.error || "Failed to join room" });
            return false;
          }

          set({ currentPlayer: result.player });
          await get().subscribeToRoomPlayers(roomId);
          await get().updatePlayersList(roomId);
          return { success: true, roomId };
        } catch (error) {
          console.error("Error joining existing room:", error);
          set({
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      reconnectPlayer: async (playerId, roomId) => {
        set({ isLoading: true, error: null });
        try {
          const supabase = createClient();

          // Get player data
          const { data: playerData, error: playerError } = await supabase
            .from("players")
            .select("*")
            .eq("id", playerId)
            .single();
          console.log(playerData);
          if (playerError || !playerData) {
            console.error("Player not found", playerError);
            return false;
          }

          // Update connection status
          const { error: updateError } = await supabase
            .from("players")
            .update({ connection_status: "connected" })
            .eq("id", playerId);

          if (updateError) {
            console.error("Failed to update player status", updateError);
            return false;
          }

          // Store in local state
          set({ currentPlayer: playerData });

          // Store IDs in localStorage for future reconnections
          localStorage.setItem("player_id", playerId);
          localStorage.setItem("room_id", roomId);

          // Also update the players list so the UI reflects the reconnected player
          await get().updatePlayersList(roomId);

          // Subscribe to user updates
          await get().subscribeToUserUpdates(roomId);

          return true;
        } catch (error) {
          console.error("Error reconnecting player:", error);
          return false;
        } finally {
          set({ isLoading: false });
        }
      },
      // Add or update this method
      subscribeToUserUpdates: async (roomId: string) => {
        const supabase = createClient();

        // Clean up existing subscription if any
        if (get().realtimeChannel) {
          get().realtimeChannel?.unsubscribe();
        }

        // Create new subscription for player changes
        const channel = supabase
          .channel(`players-${roomId}`)
          .on(
            "postgres_changes",
            {
              event: "*", // Listen for all events
              schema: "public",
              table: "players",
              filter: `room_id=eq.${roomId}`,
            },
            async (payload) => {
              // When any player changes, fetch all players
              try {
                const result = await getPlayersInRoom(roomId);
                if (result.success && result.players) {
                  set({ players: result.players });
                }
              } catch (error) {
                console.error("Error updating players:", error);
              }
            }
          )
          .subscribe();

        set({ realtimeChannel: channel });

        // Make sure to return a Promise
        return Promise.resolve();
      },
      // Disconnect from room
      // Add this to the disconnectFromRoom function in useUserStore.ts
      disconnectFromRoom: async () => {
        const { currentPlayer, unsubscribeFromRealtime } = get();

        if (currentPlayer) {
          try {
            // Only delete the player if we're actually leaving
            if (!localStorage.getItem("is_reloading")) {
              await deletePlayer(currentPlayer.id);
            } else {
              // We're reloading, so update the player's status to disconnected
              await updateConnectionStatus({
                playerId: currentPlayer.id,
                status: "disconnected",
              });
            }

            // Clear localStorage selectively
            if (!localStorage.getItem("is_reloading")) {
              localStorage.removeItem("user-storage");
              localStorage.removeItem("player_id");
              localStorage.removeItem("room_id");
            }
          } catch (error) {
            console.error("Error disconnecting from room:", error);
          }
        }

        // Cleanup realtime subscriptions
        unsubscribeFromRealtime();
      },
      // Transfer host role to another player
      transferHost: async (newHostId: string) => {
        const { currentPlayer } = get();
        set({ isLoading: true, error: null });

        if (!currentPlayer || !currentPlayer.is_host) {
          set({
            error: "Only the host can transfer host role",
            isLoading: false,
          });
          return false;
        }

        try {
          const result = await transferHostRole({
            currentHostId: currentPlayer.id,
            newHostId,
          });

          if (!result.success) {
            set({ error: result.error || "Failed to transfer host role" });
            return false;
          }

          // Update local state
          set((state) => ({
            currentPlayer: state.currentPlayer
              ? {
                  ...state.currentPlayer,
                  is_host: false,
                }
              : null,
            players: state.players.map((player) =>
              player.id === newHostId
                ? { ...player, is_host: true }
                : player.id === currentPlayer.id
                  ? { ...player, is_host: false }
                  : player
            ),
          }));
          localStorage.removeItem("player_id");
          localStorage.removeItem("room_id");
          return true;
        } catch (error) {
          console.error("Error transferring host:", error);
          set({
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // Subscribe to realtime player updates
      subscribeToRoomPlayers: async (roomId: string) => {
        const supabase = createClient();
        const { realtimeChannel } = get();

        // Clean up existing subscription if any
        if (realtimeChannel) {
          realtimeChannel.unsubscribe();
        }

        // Create new subscription
        const channel = supabase
          .channel(`room-${roomId}-players`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "players",
              filter: `room_id=eq.${roomId}`,
            },
            async (payload) => {
              // Handle different database events
              switch (payload.eventType) {
                case "INSERT":
                  // New player joined
                  if (payload.new) {
                    const newPlayer = payload.new as Player;
                    set((state) => ({
                      players: [
                        ...state.players.filter((p) => p.id !== newPlayer.id),
                        newPlayer,
                      ],
                    }));
                  }
                  break;

                case "UPDATE":
                  // Player updated (connection status, host status, etc)
                  if (payload.new) {
                    const updatedPlayer = payload.new as Player;

                    // Update current player if it's us
                    if (get().currentPlayer?.id === updatedPlayer.id) {
                      set({ currentPlayer: updatedPlayer });
                    }

                    // Update in players list
                    set((state) => ({
                      players: state.players.map((player) =>
                        player.id === updatedPlayer.id ? updatedPlayer : player
                      ),
                    }));

                    // Handle disconnection if needed
                    if (updatedPlayer.connection_status === "disconnected") {
                      get().handlePlayerDisconnect(updatedPlayer.id);
                    }
                  }
                  break;

                case "DELETE":
                  // Player left/removed
                  if (payload.old) {
                    const removedPlayerId = (payload.old as Player).id;
                    set((state) => ({
                      players: state.players.filter(
                        (player) => player.id !== removedPlayerId
                      ),
                    }));
                  }
                  break;
              }
            }
          )
          .subscribe();

        set({ realtimeChannel: channel });
      },

      // Unsubscribe from realtime
      unsubscribeFromRealtime: () => {
        const { realtimeChannel } = get();
        if (realtimeChannel) {
          realtimeChannel.unsubscribe();
          set({ realtimeChannel: null });
        }
      },

      // Fetch all players in room
      updatePlayersList: async (roomId: string) => {
        const supabase = createClient();
        try {
          const { data, error } = await supabase
            .from("players")
            .select("*")
            .eq("room_id", roomId);

          if (error) throw new Error(error.message);

          if (data) {
            set({ players: data as Player[] });
          }
        } catch (error) {
          console.error("Error fetching players list:", error);
        }
      },

      // Handle player disconnect logic
      handlePlayerDisconnect: (playerId: string) => {
        const { players, currentPlayer } = get();
        const disconnectedPlayer = players.find((p) => p.id === playerId);

        if (!disconnectedPlayer) return;

        // If disconnected player was host, find new host
        if (disconnectedPlayer.is_host && currentPlayer) {
          // Find first connected player that isn't the disconnected one
          const newHost = players.find(
            (p) => p.id !== playerId && p.connection_status === "connected"
          );

          if (newHost) {
            // Transfer host role
            get().transferHost(newHost.id);
          }
        }
      },

      // Check if player with nickname exists in room
      checkIfPlayerExists: async (roomId: string, nickname: string) => {
        const supabase = createClient();
        try {
          const { data, error } = await supabase
            .from("players")
            .select("id")
            .eq("room_id", roomId)
            .eq("nickname", nickname)
            .single();

          return !error && !!data;
        } catch (error) {
          console.error("Error checking player existence:", error);
          return false;
        }
      },

      // Clear user state
      clearUserState: () => {
        const { unsubscribeFromRealtime } = get();
        unsubscribeFromRealtime();
        set({
          currentPlayer: null,
          players: [],
          error: null,
        });
      },
    }),
    {
      name: "user-storage",
      partialize: (state) => ({
        currentPlayer: state.currentPlayer,
      }),
    }
  )
);
