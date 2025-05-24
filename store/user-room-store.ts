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
  // currentRound: Round | null; // Removed: Managed by game-store
  lastRoomCheck: number; 

  // currentTurn: Turn | null; // Removed: Managed by game-store
  // isRoundVotingPhase: boolean; // Removed: Managed by game-store
  // setCurrentTurn: (turn: Turn | null) => void; // Removed
  setCurrentRoom: (room: Room | null) => void;
  // Realtime subscriptions
  subscribeToRoom: (roomId: string) => () => void;
  subscribeToPlayers: (roomId: string) => () => void;
  // subscribeToRounds: (roomId: string) => () => void; // Removed: Managed by game-store

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
  // currentRound: null, // Removed
  lastRoomCheck: 0,
  // currentTurn: null, // Removed
  // isRoundVotingPhase: false, // Removed
  // Realtime subscription for room changes
  subscribeToRoom: (roomId) => {
    console.log("[user-room-store] Subscribing to room changes for:", roomId);
    const supabase = createClient();

    // Initial fetch of the room data
    const fetchInitialRoomData = async () => {
      console.log("[user-room-store] Fetching initial room data for:", roomId);
      try {
        const { data: room, error } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", roomId)
          .single();

        if (error) {
          console.error("[user-room-store] Error fetching initial room data for room "+roomId+":", error.message);
          set({ currentRoom: null, lastRoomCheck: Date.now() }); 
          useGameStore.getState().syncWithUserRoomStore(null, get().roomPlayers);
          return;
        }
        if (room) {
          console.log("[user-room-store] Initial room data loaded for room "+roomId+":", room.id, "status:", room.game_status);
          set({ currentRoom: room, lastRoomCheck: Date.now() });
          useGameStore.getState().syncWithUserRoomStore(room, get().roomPlayers);
        } else {
          console.warn("[user-room-store] No initial room data found for room "+roomId+".");
          set({ currentRoom: null, lastRoomCheck: Date.now() });
          useGameStore.getState().syncWithUserRoomStore(null, get().roomPlayers);
        }
      } catch (err: any) {
        console.error("[user-room-store] Exception in fetchInitialRoomData for room "+roomId+":", err.message);
        set({ currentRoom: null, lastRoomCheck: Date.now() });
        useGameStore.getState().syncWithUserRoomStore(null, get().roomPlayers);
      }
    };

    fetchInitialRoomData();

    // Unique channel name to avoid conflicts if multiple room subscriptions exist.
    const roomChangesChannel = supabase 
      .channel(`user-room-store-room-${roomId}`) 
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          const newRoom = payload.new as Room;
          console.log(`[user-room-store] Room change for ${roomId}: ${eventType}`, newRoom ? {id: newRoom.id, status: newRoom.game_status} : payload.old?.id);

          if (eventType === "UPDATE" || eventType === "INSERT") {
            set({ currentRoom: newRoom, lastRoomCheck: Date.now() });
            useGameStore.getState().syncWithUserRoomStore(newRoom, get().roomPlayers);
          } else if (eventType === "DELETE") {
            console.warn(`[user-room-store] Room ${roomId} was deleted.`);
            set({ currentRoom: null, lastRoomCheck: Date.now() });
            useGameStore.getState().syncWithUserRoomStore(null, []); 
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error(`[user-room-store] Room subscription error for ${roomId}:`, err.message);
        } else {
          console.log(`[user-room-store] Room subscription status for ${roomId}: ${status}`);
        }
      });

    return () => {
      console.log("[user-room-store] Unsubscribing from room:", roomId);
      supabase.removeChannel(roomChangesChannel);
      // gameCompletedChannel is removed
    };
  },
  setCurrentRoom: (room) => {
    console.log("[user-room-store] setCurrentRoom called for room:", room?.id);
    set({ currentRoom: room });
    useGameStore.getState().syncWithUserRoomStore(room, get().roomPlayers);
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

  refreshRoomStatus: async (roomId) => {
    console.log("[user-room-store] Refreshing room status by calling fetchRoomById for room:", roomId);
    // This method will now primarily rely on fetchRoomById to handle the update and syncing.
    await get().fetchRoomById(roomId);
  },

  setRoomPlayers: (players) => {
    console.log("[user-room-store] Setting room players directly for room:", get().currentRoom?.id, "Players count:", players.length);
    set({ roomPlayers: players });
    useGameStore.getState().syncWithUserRoomStore(get().currentRoom, players);
  },

  subscribeToPlayers: (roomId) => {
    const supabase = createClient();
    console.log(`[user-room-store] Subscribing to players in room: ${roomId}`);

    const fetchInitialPlayers = async () => {
      console.log(`[user-room-store] Fetching initial players for room: ${roomId}`);
      try {
        const { data, error } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", roomId);

        if (error) {
          console.error(`[user-room-store] Error fetching initial players for room ${roomId}:`, error.message);
          set({ roomPlayers: [] }); 
          useGameStore.getState().syncWithUserRoomStore(get().currentRoom, []);
          return;
        }
        const initialPlayers = data || [];
        console.log(`[user-room-store] Initial players loaded for room ${roomId}:`, initialPlayers.length);
        set({ roomPlayers: initialPlayers });
        useGameStore.getState().syncWithUserRoomStore(get().currentRoom, initialPlayers);
      } catch (err: any) {
        console.error(`[user-room-store] Exception in fetchInitialPlayers for room ${roomId}:`, err.message);
        set({ roomPlayers: [] });
        useGameStore.getState().syncWithUserRoomStore(get().currentRoom, []);
      }
    };

    fetchInitialPlayers();

    // Unique channel name
    const playerChangesChannel = supabase
      .channel(`user-room-store-players-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log(`[user-room-store] Player change for room ${roomId}:`, payload.eventType);
          let newPlayerList: Player[] = [...get().roomPlayers]; 

          switch (payload.eventType) {
            case "INSERT":
              const newPlayer = payload.new as Player;
              if (!newPlayerList.some(p => p.id === newPlayer.id)) {
                newPlayerList.push(newPlayer);
                console.log(`[user-room-store] Player ${newPlayer.id} (${newPlayer.nickname}) inserted into room ${roomId}.`);
              }
              break;
            case "UPDATE":
              const updatedPlayer = payload.new as Player;
              newPlayerList = newPlayerList.map((p) =>
                p.id === updatedPlayer.id ? updatedPlayer : p
              );
              console.log(`[user-room-store] Player ${updatedPlayer.id} (${updatedPlayer.nickname}) updated in room ${roomId}.`);
              break;
            case "DELETE":
              const deletedPlayerOld = payload.old as { id: string }; 
              console.log(`[user-room-store] Player ${deletedPlayerOld.id} deleted from room ${roomId}.`);
              newPlayerList = newPlayerList.filter((p) => p.id !== deletedPlayerOld.id);
              break;
            default:
              console.log(`[user-room-store] Unhandled player event type: ${payload.eventType} for room ${roomId}`);
              useGameStore.getState().syncWithUserRoomStore(get().currentRoom, get().roomPlayers);
              return; 
          }
          set({ roomPlayers: newPlayerList });
          useGameStore.getState().syncWithUserRoomStore(get().currentRoom, newPlayerList);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error(`[user-room-store] Players subscription error for ${roomId}:`, err.message);
        } else {
          console.log(`[user-room-store] Players subscription status for ${roomId}: ${status}`);
        }
      });

    return () => {
      console.log(`[user-room-store] Unsubscribing from players in room: ${roomId}`);
      supabase.removeChannel(playerChangesChannel);
    };
  },
  // setCurrentTurn is removed as currentTurn is removed from state

  // fetchCurrentTurn is removed as currentTurn and currentRound are removed from state
  // subscribeToRounds is removed as currentRound and related logic are removed from this store.
  // Game-related subscriptions (rounds, turns) will be handled by game-store.

  // Room methods
  createAndJoinRoom: async ({ nickname, totalRounds, timeLimit }) => {
    console.log("[user-room-store] Creating and joining room with nickname:", nickname);
    const result = await createAndJoinRoom({ nickname, totalRounds, timeLimit });

    if (result.success && result.room && result.player) {
      console.log("[user-room-store] Successfully created and joined room:", result.room.id, "Player:", result.player.id);
      const initialPlayers = [result.player];
      set({
        currentRoom: result.room,
        currentUser: result.player,
        roomPlayers: initialPlayers,
      });
      useGameStore.getState().syncWithUserRoomStore(result.room, initialPlayers);
    } else {
      console.error("[user-room-store] Failed to create and join room:", result.error);
      useGameStore.getState().syncWithUserRoomStore(null, []);
    }
    return result;
  },

  joinRoom: async ({ roomCode, nickname }) => {
    console.log("[user-room-store] Joining room with code:", roomCode, "Nickname:", nickname);
    const result = await joinRoom({ roomCode, nickname });

    if (result.success && result.room && result.player) {
      console.log("[user-room-store] Successfully joined room:", result.room.id, "Player:", result.player.id);
      set({
        currentRoom: result.room,
        currentUser: result.player,
      });
      // fetchPlayersInRoom will set roomPlayers and then call syncWithUserRoomStore
      await get().fetchPlayersInRoom(result.room.id);
    } else {
      console.error("[user-room-store] Failed to join room "+roomCode+":", result.error);
      useGameStore.getState().syncWithUserRoomStore(null, []);
    }
    return result;
  },
  fetchRoomById: async (roomId) => {
    console.log("[user-room-store] Fetching room by ID (store method):", roomId);
    try {
      // The imported fetchRoomById is the action
      const actionResult = await fetchRoomById(roomId); 

      if (actionResult.success && actionResult.room) {
        console.log("[user-room-store] Successfully fetched room by ID (action):", actionResult.room.id, "Status:", actionResult.room.game_status);
        set({ currentRoom: actionResult.room });
        useGameStore.getState().syncWithUserRoomStore(actionResult.room, get().roomPlayers);
      } else {
        console.error("[user-room-store] Failed to fetch room by ID (action) "+roomId+":", actionResult.error);
        // Optionally set currentRoom to null or maintain current state
        // set({ currentRoom: null });
        // useGameStore.getState().syncWithUserRoomStore(null, get().roomPlayers);
      }
      return actionResult;
    } catch (error: any) {
      console.error("[user-room-store] Exception in fetchRoomById (store method) for room "+roomId+":", error.message);
      return {
        success: false,
        error: "An unexpected error occurred while fetching the room by ID.",
      };
    }
  },

  fetchRoomByCode: async (roomCode) => {
    console.log("[user-room-store] Fetching room by code:", roomCode);
    const result = await getRoomByCode(roomCode); 
    if (result.success && result.room) {
      console.log("[user-room-store] Successfully fetched room by code:", result.room.id, "Status:", result.room.game_status);
      set({ currentRoom: result.room });
      useGameStore.getState().syncWithUserRoomStore(result.room, get().roomPlayers);
    } else {
      console.error("[user-room-store] Failed to fetch room by code "+roomCode+":", result.error);
      // useGameStore.getState().syncWithUserRoomStore(null, get().roomPlayers); // Or sync with current state
    }
    return result;
  },

  updateRoomStatus: async ({ roomId, status }) => {
    console.log(`[user-room-store] Updating room ${roomId} status to: ${status}`);
    const result = await updateRoomStatus({ roomId, status }); 
    if (result.success && result.room) {
      console.log(`[user-room-store] Successfully updated room ${roomId} status to: ${result.room.game_status}`);
      set({ currentRoom: result.room });
      useGameStore.getState().syncWithUserRoomStore(result.room, get().roomPlayers);
    } else {
      console.error(`[user-room-store] Failed to update room ${roomId} status:`, result.error);
      // useGameStore.getState().syncWithUserRoomStore(get().currentRoom, get().roomPlayers);
    }
    return result;
  },

  fetchPlayerById: async (playerId) => {
    return await getPlayerById(playerId);
  },

  fetchPlayersInRoom: async (roomId) => {
    const result = await getPlayersInRoom(roomId); 
    if (result.success && result.players) {
      console.log(`[user-room-store] Successfully fetched ${result.players.length} players for room ${roomId}`);
      set({ roomPlayers: result.players });
      useGameStore.getState().syncWithUserRoomStore(get().currentRoom, result.players);
    } else {
      console.error(`[user-room-store] Failed to fetch players for room ${roomId}:`, result.error);
      set({ roomPlayers: [] }); 
      useGameStore.getState().syncWithUserRoomStore(get().currentRoom, []);
    }
    return result;
  },

  deletePlayer: async (playerId) => {
    console.log("[user-room-store] Deleting player:", playerId);
    const result = await deletePlayer(playerId); 
    if (result.success) {
      console.log("[user-room-store] Successfully deleted player:", playerId);
      // Player list will be updated by the realtime subscription, which calls sync.
    } else {
      console.error(`[user-room-store] Failed to delete player ${playerId}:`, result.error);
    }
    return result;
  },

  resetState: () => {
    console.log("[user-room-store] Resetting state.");
    set({
      currentUser: null,
      currentRoom: null,
      roomPlayers: [],
      // currentRound: null, // Removed
      lastRoomCheck: 0,
      // currentTurn: null, // Removed
      // isRoundVotingPhase: false, // Removed
    });
    // Notify game-store that user-room-store has reset, assuming syncWithUserRoomStore handles null/empty.
    useGameStore.getState().syncWithUserRoomStore(null, []);
  },
}));

export type { UserRoomState };
