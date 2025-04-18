"use server";

import { Player, Room } from "@/types/types";
import { generateRoomCode } from "@/utils/helpers";
import { createClient } from "@/utils/supabase/server";
export async function createRoom({
  totalRounds,
  timeLimit,
}: {
  totalRounds: number;
  timeLimit: number;
}): Promise<{ success: boolean; room?: Room; error?: string }> {
  const supabase = await createClient();

  try {
    let roomCode = generateRoomCode();
    let isUnique = false;

    while (!isUnique) {
      const { data: existingRoom } = await supabase
        .from("rooms")
        .select("room_code")
        .eq("room_code", roomCode)
        .single();

      if (!existingRoom) {
        isUnique = true;
      } else {
        roomCode = generateRoomCode();
      }
    }

    const { data, error } = await supabase
      .from("rooms")
      .insert({
        room_code: roomCode,
        total_rounds: totalRounds,
        time_limit: timeLimit,
        game_status: "waiting",
        host_id: null, // Initially null, will be updated later
      })
      .select()
      .single();

    if (error) {
      console.log("Error inserting room:", error);
      throw new Error(`Error creating room: ${error.message}`);
    }

    return { success: true, room: data };
  } catch (error) {
    console.error("Error in createRoom:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Modify createUser to return player ID
export async function createUser({
  nickname,
  roomId,
  isHost,
}: {
  nickname: string;
  roomId: string;
  isHost: boolean;
}): Promise<{ success: boolean; player?: Player; error?: string }> {
  const supabase = createClient();

  try {
    const { data, error } = await (
      await supabase
    )
      .from("players")
      .insert({
        room_id: roomId,
        nickname: nickname,
        is_host: isHost,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }

    return { success: true, player: data };
  } catch (error) {
    console.error("Error in createUser:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
