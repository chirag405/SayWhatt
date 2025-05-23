"use server";

import { Player, Room, RoomStatus } from "@/types/types";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createRoom, createUser } from "./helper";

export async function createAndJoinRoom({
  nickname,
  totalRounds,
  timeLimit,
}: {
  nickname: string;
  totalRounds: number;
  timeLimit: number;
}): Promise<{
  success: boolean;
  room?: Room;
  player?: Player;
  error?: string;
}> {
  try {
    // Step 1: Create the room (initially without host_id)
    const roomResult = await createRoom({ totalRounds, timeLimit });

    if (!roomResult.success || !roomResult.room) {
      return { success: false, error: roomResult.error };
    }

    const roomId = roomResult.room.id; // Capture the room ID

    // Step 2: Create the user (host of the room)
    const playerResult = await createUser({
      nickname,
      roomId,
      isHost: true,
    });

    if (!playerResult.success || !playerResult.player) {
      return { success: false, error: playerResult.error };
    }

    const hostId = playerResult.player.id; // Capture the host's player ID

    // Step 3: Update the room with the correct host_id
    const updateResult = await updateRoomHost(roomId, hostId);

    if (!updateResult.success) {
      return { success: false, error: updateResult.error };
    }

    return {
      success: true,
      room: { ...roomResult.room, host_id: hostId },
      player: playerResult.player,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to update the room with host_id
export async function updateRoomHost(
  roomId: string,
  hostId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("rooms")
      .update({ host_id: hostId })
      .eq("id", roomId);

    if (error) {
      throw new Error(`Error updating room host: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateRoomHost:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getPlayerById(
  playerId: string
): Promise<
  { success: true; player: Player } | { success: false; error: string }
> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .single();

    if (error) {
      throw new Error(`Error fetching player: ${error.message}`);
    }

    return { success: true, player: data };
  } catch (error) {
    console.error("Error in getPlayerById:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
// In your deletePlayer action (or wherever you handle player deletion)
/**
 * Deletes a player from the game and broadcasts their departure information
 * @param playerId The ID of the player to delete
 * @returns Object indicating success or failure with optional error message
 */
export const deletePlayer = async (playerId: string) => {
  const supabase = await createClient();

  try {
    // Get player details before deletion
    const { data: player } = await supabase
      .from("players")
      .select("id, room_id, nickname, is_host")
      .eq("id", playerId)
      .single();

    if (!player) return { success: false, error: "Player not found" };

    // Check if this player is a current decider
    let isDecider = false;
    const { data: currentRound } = await supabase
      .from("rounds")
      .select("id")
      .eq("room_id", player.room_id)
      .eq("is_complete", false)
      .limit(1);

    if (currentRound && currentRound.length > 0) {
      const { data: currentTurn } = await supabase
        .from("turns")
        .select("decider_id")
        .eq("round_id", currentRound[0].id)
        .order("turn_number", { ascending: false })
        .limit(1);

      // Fix the type error by checking if currentTurn exists and has elements
      if (currentTurn && currentTurn.length > 0) {
        isDecider = currentTurn[0].decider_id === playerId;
      }
    }

    // Count remaining players BEFORE deletion
    const { data: remainingPlayers } = await supabase
      .from("players")
      .select("id")
      .eq("room_id", player.room_id);

    const playerCount = remainingPlayers?.length || 0;

    // Perform the deletion
    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", playerId);

    if (error) return { success: false, error: error.message }; // If this deletion will leave only one player, explicitly update the game status to completed
    if (playerCount <= 2) {
      // 2 because we're counting before deletion (playerCount - 1 == 1 after deletion)
      console.log("Only one player will remain, setting game to completed");

      // Update the room status to 'completed'
      const { error: roomUpdateError } = await supabase
        .from("rooms")
        .update({
          game_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", player.room_id);

      if (roomUpdateError) {
        console.error("Error updating room status:", roomUpdateError);
      }

      // Also complete any active rounds
      if (currentRound && currentRound.length > 0) {
        const { error: roundUpdateError } = await supabase
          .from("rounds")
          .update({
            status: "completed",
            is_complete: true,
          })
          .eq("id", currentRound[0].id);

        if (roundUpdateError) {
          console.error("Error updating round status:", roundUpdateError);
        }
      }
    }

    // Broadcast player departure information
    await supabase.channel(`players-departure:${player.room_id}`).send({
      type: "broadcast",
      event: "PLAYER_DELETED",
      payload: {
        playerId,
        playerName: player.nickname,
        wasHost: player.is_host,
        wasDecider: isDecider,
        gameCompleted: playerCount <= 2,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error in deletePlayer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export async function joinRoom({
  roomCode,
  nickname,
}: {
  roomCode: string;
  nickname: string;
}) {
  const supabase = await createClient();

  try {
    // Find the room by code
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", roomCode)
      .single();

    if (roomError) {
      throw new Error(`Room not found: ${roomError.message}`);
    }

    // Check if the nickname is already taken in this room
    const { data: existingPlayer, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", room.id)
      .eq("nickname", nickname)
      .single();

    if (existingPlayer) {
      throw new Error("Nickname already taken in this room");
    } // Check if the room is full or game already started
    if (room.game_status !== "waiting") {
      throw new Error("Game has already started");
    }

    // Create the player
    const { data: player, error: createError } = await supabase
      .from("players")
      .insert({
        room_id: room.id,
        nickname: nickname,
        is_host: false,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Error joining room: ${createError.message}`);
    }

    return { success: true, room, player };
  } catch (error) {
    console.error("Error in joinRoom:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateRoomStatus({
  roomId,
  status,
}: {
  roomId: string;
  status: RoomStatus;
}) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("rooms")
      .update({
        game_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating room status: ${error.message}`);
    }

    return { success: true, room: data };
  } catch (error) {
    console.error("Error in updateRoomStatus:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const getPlayersInRoom = async (roomId: string) => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return { success: true, players: data as Player[] };
  } catch (error) {
    console.error("Error fetching players:", error);
    return { success: false, error: "Failed to fetch players" };
  }
};

export async function startGame(roomId: string) {
  const cookieStore = cookies();
  const supabase = await createClient();

  try {
    // First, get all players
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId);

    if (playersError) {
      throw new Error(`Error fetching players: ${playersError.message}`);
    }

    if (!players || players.length < 2) {
      throw new Error("Not enough players to start the game");
    }

    // Choose a random decider for the first round
    const randomIndex = Math.floor(Math.random() * players.length);
    const firstDecider = players[randomIndex];

    // Update room status
    const { error: updateError } = await supabase
      .from("rooms")
      .update({
        game_status: "in_progress",
        current_round: 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId);

    if (updateError) {
      throw new Error(`Error updating room status: ${updateError.message}`);
    }

    // Create the first round
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        room_id: roomId,
        round_number: 1,
        decider_id: firstDecider.id,
        status: "category_selection",
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (roundError) {
      throw new Error(`Error creating first round: ${roundError.message}`);
    }

    return { success: true, round };
  } catch (error) {
    console.error("Error in startGame:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getRoomByCode(roomCode: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", roomCode)
      .single();

    if (error) {
      throw new Error(`Error fetching room: ${error.message}`);
    }

    return { success: true, room: data };
  } catch (error) {
    console.error("Error in getRoomByCode:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
