import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define minimal types or use 'any' for simplicity in this subtask
interface Room {
  id: string;
  game_status: string;
  host_id: string;
  current_round?: number | null;
  current_turn?: number | null;
  // Add other relevant room properties if needed
}

interface Player {
  id: string;
  // Add other relevant player properties if needed
}

interface Round {
  id: string;
  room_id: string;
  round_number: number;
  status: string;
  is_complete: boolean;
  remaining_deciders: number;
  current_turn: number;
  // Add other relevant round properties if needed
}

interface Turn {
  id: string;
  round_id: string;
  turn_number: number;
  decider_id: string;
  status: string;
  // Add other relevant turn properties if needed
}


console.log("Initialize game function started");

serve(async (req: Request) => {
  try {
    const { roomId, userId } = await req.json();

    if (!roomId || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing roomId or userId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Supabase client setup
    // Ensure environment variables are set in your Supabase project settings
    // For Edge Functions, it's common to use the service role key for direct DB operations
    // if RLS is not strictly designed for this, or if you need to bypass RLS for admin tasks.
    // However, using the anon key with proper RLS is generally safer.
    // The request's Authorization header can be used to act on behalf of the user.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // Using service role key for atomicity and direct DB control
      // If you want to use user's auth:
      // { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Core logic from actions.startGame (steps 1-8)
    // 1. Verify room state
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      console.error("Edge Function: Room not found:", roomError);
      return new Response(
        JSON.stringify({ success: false, error: "Room not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (room.game_status === "in_progress") {
      console.log("Edge Function: Game already in progress");
      // This might not be an error, but rather a state check.
      // Depending on desired behavior, you could return success or a specific message.
      return new Response(
        JSON.stringify({ success: true, message: "Game already in progress", room }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Validate host and game status
    if (room.host_id !== userId) {
      console.error("Edge Function: Non-host attempted to start game");
      return new Response(
        JSON.stringify({ success: false, error: "Only the host can start the game" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    if (room.game_status !== "waiting") {
      console.error("Edge Function: Invalid game status for starting:", room.game_status);
      return new Response(
        JSON.stringify({ success: false, error: "Game is not in waiting state" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Get players
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id")
      .eq("room_id", roomId);

    if (playersError) {
      console.error("Edge Function: Error fetching players:", playersError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch players" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!players || players.length < 2) {
      console.error("Edge Function: Not enough players to start game. Found:", players?.length);
      return new Response(
        JSON.stringify({ success: false, error: "At least 2 players are required to start the game" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Database operations (these should be atomic if using a transaction,
    // though Supabase Edge Functions don't offer explicit transaction blocks like pg_transaction.
    // However, if any of these fail, subsequent ones won't run, and an error is returned.
    // True atomicity (rollback) is guaranteed if these calls are made within a PL/pgSQL function
    // called via rpc(), or if the underlying database errors cause a rollback.
    // For this subtask, we assume that a failure in one of these steps means we return an error,
    // and the client-side logic should handle the inconsistent state if necessary.
    // The prompt states "The Edge Function runs within an implicit transaction",
    // which means if any `await supabase...` call fails and throws, the function execution stops,
    // and Deno runtime returns an error. If these are individual calls, they are not automatically rolled back by Supabase JS library.
    // For true atomicity, one would typically wrap these in a custom PostgreSQL function (RPC).
    // Given the constraints, we'll proceed with sequential operations and rely on Supabase's behavior.

    // 4. Update room
    const updatedRoomData = {
      game_status: "in_progress" as const,
      current_round: 1,
      current_turn: 1,
      round_voting_phase: false,
      updated_at: new Date().toISOString(),
    };
    const { data: updatedRoom, error: updateRoomError } = await supabase
      .from("rooms")
      .update(updatedRoomData)
      .eq("id", roomId)
      .select()
      .single();

    if (updateRoomError || !updatedRoom) {
      console.error("Edge Function: Failed to update room status:", updateRoomError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update room status: " + updateRoomError?.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Create first round
    const roundInsertData = {
      room_id: roomId,
      round_number: 1,
      status: "selecting_category" as const,
      is_complete: false,
      remaining_deciders: players.length -1, // Assuming this field exists or is needed
      current_turn: 1,
    };
    const { data: newRound, error: roundError } = await supabase
      .from("rounds")
      .insert(roundInsertData)
      .select()
      .single();

    if (roundError || !newRound) {
      console.error("Edge Function: Round creation failed:", roundError);
      // Attempt to rollback room status - this is a manual rollback attempt
      // For true atomicity, an RPC call to a pg function is better.
      await supabase
        .from("rooms")
        .update({ game_status: "waiting", current_round: null, current_turn: null })
        .eq("id", roomId);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create round: " + roundError?.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Create first turn with the first decider
    const firstDecider = players[0]; // Assuming players array is not empty (checked above)
    const turnInsertData = {
      round_id: newRound.id,
      turn_number: 1,
      decider_id: firstDecider.id,
      status: "selecting_category" as const,
    };
    const { data: newTurn, error: turnError } = await supabase
      .from("turns")
      .insert(turnInsertData)
      .select()
      .single();

    if (turnError || !newTurn) {
      console.error("Edge Function: Turn creation failed:", turnError);
      // Manual rollback attempts
      await supabase.from("rounds").delete().eq("id", newRound.id);
      await supabase
        .from("rooms")
        .update({ game_status: "waiting", current_round: null, current_turn: null })
        .eq("id", roomId);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create turn: " + turnError?.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 7. Add first decider to decider history
    const { error: deciderHistoryError } = await supabase
      .from("decider_history")
      .insert({
        round_id: newRound.id,
        player_id: firstDecider.id,
        turn_number: 1,
      });

    if (deciderHistoryError) {
      console.error("Edge Function: Failed to add decider history:", deciderHistoryError);
      // Manual rollback attempts
      await supabase.from("turns").delete().eq("id", newTurn.id);
      await supabase.from("rounds").delete().eq("id", newRound.id);
      await supabase
        .from("rooms")
        .update({ game_status: "waiting", current_round: null, current_turn: null })
        .eq("id", roomId);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to add decider history: " + deciderHistoryError?.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 8. Mark player as having been decider
    const { error: playerUpdateError } = await supabase
      .from("players")
      .update({ has_been_decider: true })
      .eq("id", firstDecider.id);

    if (playerUpdateError) {
      console.error("Edge Function: Failed to update player as decider:", playerUpdateError);
      // Manual rollback attempts
      // Potentially remove decider history entry, turn, round, and reset room
      await supabase.from("decider_history").delete().match({ round_id: newRound.id, player_id: firstDecider.id });
      await supabase.from("turns").delete().eq("id", newTurn.id);
      await supabase.from("rounds").delete().eq("id", newRound.id);
      await supabase
        .from("rooms")
        .update({ game_status: "waiting", current_round: null, current_turn: null })
        .eq("id", roomId);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update player as decider: " + playerUpdateError?.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Edge Function: Game initialized successfully");
    return new Response(
      JSON.stringify({ success: true, room: updatedRoom, round: newRound, turn: newTurn }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in initialize-game function:", error);
    // This catch block handles unexpected errors (e.g., JSON parsing, network issues before DB ops)
    return new Response(
      JSON.stringify({ success: false, error: error.message || "An unexpected error occurred." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
