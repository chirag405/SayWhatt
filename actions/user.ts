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
export const deletePlayer = async (playerId: string) => {
  const supabase = await createClient();

  // 1. First get the player's room_id before deleting
  const { data: player } = await supabase
    .from("players")
    .select("room_id")
    .eq("id", playerId)
    .single();

  if (!player) return { success: false, error: "Player not found" };

  // 2. Perform the actual deletion
  const { error } = await supabase.from("players").delete().eq("id", playerId);

  if (error) return { success: false, error: error.message };
  // const { room } = await getRoomById(player.room_id);
  // const roomHost = room.host_id;

  // 3. Broadcast a custom event to all clients in the room
  await supabase.channel(`room:${player.room_id}`).send({
    type: "broadcast",
    event: "PLAYER_DELETED",
    payload: { playerId },
  });

  return { success: true };
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
    }

    // Check if the room is full or game already started
    if (room.game_status !== "waiting") {
      throw new Error("Game has already started or is completed");
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
