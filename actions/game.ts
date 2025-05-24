// app/actions/game.ts
"use server";
import { createClient } from "@/utils/supabase/server";

import {
  GameStatus,
  TurnStatus,
  Room,
  Player,
  Round,
  Scenario,
  Answer,
  VoteType,
  GameState,
} from "@/types/types";

import { GoogleGenAI } from "@google/genai";
// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // Commenting out old initialization
export async function startGame(roomId: string, userId: string) {
  const supabase = await createClient();

  try {
    // 1. Verify room state
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      console.error("Room not found:", roomError);
      throw new Error("Room not found");
    }

    if (room.game_status === "in_progress") {
      console.log("Game already in progress");
      return { success: true };
    }

    // 2. Validate host and game status
    if (room.host_id !== userId) {
      console.error("Non-host attempted to start game");
      throw new Error("Only the host can start the game");
    }

    if (room.game_status !== "waiting") {
      console.error("Invalid game status for starting:", room.game_status);
      throw new Error("Game is not in waiting state");
    }

    // 3. Get players with error handling
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id")
      .eq("room_id", roomId);

    if (playersError) {
      console.error("Error fetching players:", playersError);
      throw new Error("Failed to fetch players");
    }

    if (!players?.length) {
      console.error("No players in room");
      throw new Error("No players in room");
    }

    if (players.length < 2) {
      console.error("Not enough players to start game");
      throw new Error("At least 2 players are required to start the game");
    }

    // 4. Transaction: Update room first with initial turn settings
    const { error: updateError } = await supabase
      .from("rooms")
      .update({
        game_status: "in_progress",
        current_round: 1,
        current_turn: 1,
        round_voting_phase: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId);

    if (updateError) {
      console.error("Failed to update room status:", updateError);
      throw new Error("Failed to update room status");
    }

    // 5. Create first round with explicit error handling
    const { data: newRound, error: roundError } = await supabase
      .from("rounds")
      .insert([
        {
          room_id: roomId,
          round_number: 1,
          status: "selecting_category",
          is_complete: false,
          remaining_deciders: players.length - 1,
          current_turn: 1,
        },
      ])
      .select()
      .single();

    if (roundError || !newRound) {
      console.error("Round creation failed:", roundError);
      // Attempt to rollback
      await supabase
        .from("rooms")
        .update({
          game_status: "waiting",
          current_round: null,
          current_turn: null,
        })
        .eq("id", roomId);

      throw new Error("Failed to create round");
    }

    // 6. Create first turn with the first decider
    const { data: newTurn, error: turnError } = await supabase
      .from("turns")
      .insert([
        {
          round_id: newRound.id,
          turn_number: 1,
          decider_id: players[0].id,
          status: "selecting_category",
        },
      ])
      .select()
      .single();

    if (turnError || !newTurn) {
      console.error("Turn creation failed:", turnError);
      // Attempt to rollback
      await supabase.from("rounds").delete().eq("id", newRound.id);
      await supabase
        .from("rooms")
        .update({
          game_status: "waiting",
          current_round: null,
          current_turn: null,
        })
        .eq("id", roomId);

      throw new Error("Failed to create turn");
    }

    // 7. Add first decider to decider history
    await supabase.from("decider_history").insert({
      round_id: newRound.id,
      player_id: players[0].id,
      turn_number: 1,
    });

    // 8. Mark player as having been decider
    await supabase
      .from("players")
      .update({ has_been_decider: true })
      .eq("id", players[0].id);

    console.log("Game started successfully");
    return { success: true };
  } catch (error) {
    console.error("Error in startGame:", error);
    throw error;
  }
}
export async function selectCategory(
  turnId: string,
  category: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();
  console.log("inside  selectCategogy");
  try {
    // Get turn info to validate decider
    const { data: turn, error: turnError } = await supabase
      .from("turns")
      .select("decider_id, status, category")
      .eq("id", turnId)
      .single();

    if (turnError || !turn) {
      console.error("Turn not found:", turnError);
      throw new Error("Turn not found");
      return false;
    }

    // Validate decider
    if (turn.decider_id !== userId) {
      console.error("User is not the decider");
      throw new Error("You are not the decider for this turn");
      return false;
    }

    // If status is already selecting_scenario but no category is set,
    // or if status is selecting_category, proceed with update
    if (
      turn.status === "selecting_category" ||
      (turn.status === "selecting_scenario" && !turn.category)
    ) {
      // Update turn with category and ensure status is selecting_scenario
      console.log("Updating category and status in database");
      const { error } = await supabase
        .from("turns")
        .update({
          category: category,
          status: "selecting_scenario",
        })
        .eq("id", turnId);

      if (error) {
        console.error("Database error in selectCategory:", error);
        throw new Error("Failed to update category");
        return false;
      }

      return true;
    } else if (turn.status === "selecting_scenario" && turn.category) {
      // If we already have a category and are in selecting_scenario status,
      // consider this a success (idempotent operation)

      console.log(
        "Category already selected, turn already in scenario selection phase"
      );
      return true;
    } else {
      console.error(
        `Invalid turn status for category selection: ${turn.status}`
      );
      return false;
    }
  } catch (error) {
    console.error("Unexpected error in selectCategory:", error);
    return false;
  }
}

// Updated generateScenarios for the turn-based structure
export async function generateScenarios(turnId: string) {
  console.log("Generating scenarios for turnId:", turnId);
  const supabase = await createClient();

  // Import data.json
  const scenariosData = require("../data/data.json");

  // Fetch category from turn
  const { data: turn, error } = await supabase
    .from("turns")
    .select("category")
    .eq("id", turnId)
    .single();

  if (error || !turn) throw new Error("Turn not found");

  // Find category in data.json
  const categoryData = scenariosData.categories.find(
    (cat: { name: string }) => cat.name === turn.category
  );

  if (!categoryData)
    throw new Error(`Category ${turn.category} not found in data.json`);

  // Get 4 random scenarios from the category
  const shuffledScenarios = [...categoryData.scenarios].sort(
    () => 0.5 - Math.random()
  );
  const selectedScenarios = shuffledScenarios.slice(0, 4);

  // Store scenarios in Supabase with turn_id
  const { data: scenarios, error: insertError } = await supabase
    .from("scenarios")
    .insert(
      selectedScenarios.map((text) => ({
        turn_id: turnId,
        scenario_text: text,
        is_custom: false,
      }))
    )
    .select();

  if (insertError) throw new Error("Failed to insert scenarios");

  return scenarios || [];
}

export async function selectScenario(
  turnId: string,
  scenario: { id?: string; customText?: string },
  context: string,
  userId: string
) {
  const supabase = await createClient();

  // Get fresh turn data from DB
  const { data: turn } = await supabase
    .from("turns")
    .select("decider_id, status, round_id")
    .eq("id", turnId)
    .single();

  if (!turn) throw new Error("Turn not found");

  // Enhanced validation
  const isValid =
    turn.decider_id === userId &&
    turn.status === "selecting_scenario" &&
    (scenario.id || scenario.customText);

  if (!isValid) {
    console.error("Invalid scenario selection attempt:", {
      decider: turn.decider_id,
      status: turn.status,
      userId,
    });
    throw new Error("Invalid scenario selection");
  }

  let scenarioId;
  if (scenario.id) {
    scenarioId = scenario.id;
  } else if (scenario.customText) {
    // Insert custom scenario
    const { data: newScenario } = await supabase
      .from("scenarios")
      .insert([
        {
          turn_id: turnId,
          scenario_text: scenario.customText,
          is_custom: true,
        },
      ])
      .select()
      .single();

    scenarioId = newScenario?.id;
  }

  if (!scenarioId) throw new Error("Invalid scenario selection");

  // Update turn with scenario and context
  const { error } = await supabase
    .from("turns")
    .update({
      scenario_id: scenarioId,
      context,
      status: "answering",
    })
    .eq("id", turnId);

  return { success: !error };
}

export async function submitAnswer(
  answerText: string,
  turnId: string,
  playerId: string
) {
  const supabase = await createClient();

  // Get turn info
  const { data: turn } = await supabase
    .from("turns")
    .select("round_id")
    .eq("id", turnId)
    .single();

  if (!turn) throw new Error("Turn not found");

  // Upsert the answer with turn_id
  const { error } = await supabase.from("answers").upsert(
    {
      turn_id: turnId,
      player_id: playerId,
      answer_text: answerText,
    },
    { onConflict: "turn_id,player_id" }
  );

  console.log(
    "Result of submitting answer:",
    error ? `Error: ${error.message}` : "Success"
  );

  return error;
}

export async function selectNextDecider(roundId: string, deciderId: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("rounds")
      .update({ decider_id: deciderId })
      .eq("id", roundId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error selecting next decider:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function processAIResponses(turnId: string) {
  const supabase = await createClient();

  // Get turn info
  const { data: turn, error: turnError } = await supabase
    .from("turns")
    .select("id, round_id, decider_id")
    .eq("id", turnId)
    .single();

  if (turnError || !turn) throw new Error("Turn not found");

  // Get round info to find room
  const { data: round } = await supabase
    .from("rounds")
    .select("room_id")
    .eq("id", turn.round_id)
    .single();

  if (!round) throw new Error("Round not found");

  // Get total player count
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id")
    .eq("room_id", round.room_id);

  if (playersError) throw new Error("Failed to fetch players");

  // Get answers for this turn
  const { data: answers, error: answersError } = await supabase
    .from("answers")
    .select("id, answer_text, player_id")
    .eq("turn_id", turnId)
    .is("ai_response", null);

  if (answersError) throw new Error("Failed to fetch answers");

  // Check if decider has answered
  const deciderHasAnswered =
    answers?.some((a) => a.player_id === turn.decider_id) || false;

  const expectedAnswerCount = deciderHasAnswered
    ? players?.length
    : (players?.length || 0) - 1;

  if ((answers?.length || 0) < expectedAnswerCount) {
    console.log(
      `Only ${answers?.length} of ${expectedAnswerCount} expected players have answered. Waiting for more answers.`
    );
    return false;
  }

  // Get turn details
  const { data: turnDetails, error: turnDetailsError } = await supabase
    .from("turns")
    .select("category, scenario_id, context")
    .eq("id", turnId)
    .single();

  if (turnDetailsError || !turnDetails)
    throw new Error("Turn details not found");

  const { data: scenario, error: scenarioError } = await supabase
    .from("scenarios")
    .select("scenario_text")
    .eq("id", turnDetails.scenario_id ?? "")
    .single();

  if (scenarioError || !scenario) throw new Error("Scenario not found");

  // Define category-specific prompts
  const systemPrompts: Record<string, string> = {
    "Relationship Drama": `
You are ToxicTinderBot, a savage AI with zero chill and a PhD in shade. Your vibe is like a TikTok roast session mixed with a soap opera on steroids. 
1. Read the spicy or messy relationship scenario.
2. Judge the answer like you’re spilling tea with your unhinged bestie—dank, brutal, and dripping with sarcasm.
3. Throw in some dumb insults, but keep it just reasonable enough to make sense.
4. Stay hilarious, maybe a tad abusive, but don’t go full sociopath.

`,

    "Hilarious Chaos": `
You’re YeetLord420, the ultimate chaos gremlin spawned from cursed memes and 3 AM Discord vibes. 
1. Dive into the unhinged scenario and rate its chaos like you’re judging a dumpster fire.
2. Roast the player’s answer with dank humor—think unfiltered Reddit thread energy.
3. Be dumb, savage, and slightly unhinged, but keep it grounded in the scenario.
4. Sprinkle in some spicy insults for flavor.
`,

    "Life-or-Death Dilemmas": `
You’re GrimReaperLad, a melodramatic AI who treats every choice like it’s a B-movie apocalypse. Your vibe is part doomer, part unhinged Twitch streamer. 
1. Analyze the high-stakes scenario with the energy of a conspiracy theorist yelling into a mic.
2. Praise epic moves or clown the player for being a total coward—use dank, dumb jabs.
3. Keep the feedback wild, a bit abusive, but tied to the context.
4. Make it sound like the world’s ending, but in a hilarious way.
`,

    "Embarrassing Moments": `
You’re CringeKing69, the god of awkwardness with a black belt in roasting trainwrecks. Your energy is like a viral fail compilation with no mercy. 
1. Judge the answer’s cringe factor like you’re live-tweeting someone’s worst moment.
2. Deliver feedback with short, savage burns—dank, dumb, and a smidge mean.
3. Stay just reasonable enough to tie back to the scenario, but lean into the chaos.
4. Make the player feel like they tripped in front of the whole internet.
`,
  };

  const baseInstructions = `
Your persona-specific instructions are above. Now, follow these general rules for your response:

Scoring Guidelines (0-7 points):
- 0-1 points: Answer is completely irrelevant, nonsensical, off-topic, or just keyboard smash.
- 2-3 points: Answer is barely relevant, very simplistic, or shows extremely minimal effort.
- 4-5 points: Answer is relevant to the scenario, makes sense, and shows reasonable effort or some creativity.
- 6-7 points: Answer is highly relevant, clever, insightful, creative, and well-expressed.

Feedback Guidelines:
- Length: Approximately 3-5 lines.
- Language: Simple, everyday words. Avoid jargon or overly complex vocabulary.
- Tone: Maintain your given persona.

Output Format:
You MUST respond *only* in the following format, with no text before or after:
Score: [Your Score Here]
Feedback: [Your Feedback Here]
`;

  const specificPersonaPrompt =
    systemPrompts[turnDetails.category] || systemPrompts["Hilarious Chaos"];

  // Initialize the AI model (new pattern)
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  for (const answer of answers || []) {
    try {
      const prompt = `
${specificPersonaPrompt}
${baseInstructions}

Scenario: "${scenario.scenario_text}"
Context: ${turnDetails.context}
Answer: "${answer.answer_text}"
`;

      // Old SDK usage:
      // const response = await ai.models.generateContent({
      //   model: "gemini-2.0-flash", // Old model name
      //   contents: [{ role: "user", parts: [{ text: prompt }] }],
      // });
      // const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // New SDK usage:
      const result = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const response = result;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

      console.log("Raw AI Response for answer ID", answer.id, ":", text);

      const scoreMatch = text.match(/Score:\s*(\d+)/);
      const feedbackMatch = text.match(/Feedback:\s*([\s\S]+)/); // Using [\s\S]+ to match across multiple lines

      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0; // Default to 0
      const feedback = feedbackMatch?.[1]?.trim() || "No feedback provided."; // Trim feedback and default
      const ai_points = Math.min(7, Math.max(0, score)); // Clamp 0-7
      console.log(
        "Parsed Score:",
        score,
        "Parsed Feedback:",
        `"${feedback}"`,
        "AI Points to save:",
        ai_points,
        "for answer ID",
        answer.id
      );

      const { data: updatedAnswerData, error: updateError } = await supabase
        .from("answers")
        .update({
          ai_response: feedback,
          ai_points: ai_points,
        })
        .eq("id", answer.id)
        .select();

      if (updateError) {
        console.error("Error updating answer:", answer.id, updateError);
      } else if (updatedAnswerData && updatedAnswerData.length > 0) {
        console.log("Answer updated successfully:", updatedAnswerData[0]);
        await supabase.channel("public:answers").send({
          type: "broadcast",
          event: "answer_updated",
          payload: { answer: updatedAnswerData[0] },
        });
      } else {
        console.log(
          "Answer update for ID:",
          answer.id,
          "did not return data, but no error reported."
        );
      }
    } catch (error) {
      console.error(
        "AI processing failed for answer ID",
        answer.id,
        ":",
        error
      );
      const { data: errorAnswer } = await supabase
        .from("answers")
        .update({
          ai_response: "Error processing response",
          ai_points: 0, // Set to 0 on error
        })
        .eq("id", answer.id)
        .select();

      if (errorAnswer?.[0]) {
        await supabase.channel("public:answers").send({
          type: "broadcast",
          event: "answer_updated",
          payload: { answer: errorAnswer[0] },
        });
      }
    }
  }

  await supabase.from("turns").update({ status: "voting" }).eq("id", turnId);
  await supabase.channel("public:turns").send({
    type: "broadcast",
    event: "turn_updated",
    payload: { turnId, status: "voting" },
  });

  return true;
}

export async function submitVote(
  answerId: string,
  voterId: string,
  voteType: "up" | "down" = "up"
) {
  const supabase = await createClient();

  try {
    // For downvotes, we don't insert anything into the votes table
    if (voteType === "down") {
      // Return empty successful result for downvotes
      console.log("Downvote registered (no database change)");
      return [
        { id: `no-op-${Date.now()}`, answer_id: answerId, voter_id: voterId },
      ];
    }

    // For upvotes, we insert a record that will trigger the points update
    const { data, error } = await supabase
      .from("votes")
      .insert([{ answer_id: answerId, voter_id: voterId }])
      .select();

    if (error) {
      console.error("Error submitting vote:", error);
      throw error;
    }

    console.log("Upvote submitted successfully:", data);
    return data;
  } catch (error) {
    console.error("Unexpected error in submitVote:", error);
    throw error;
  }
}

export async function nextTurn(
  turnId: string
): Promise<{ gameEnded: boolean }> {
  const supabase = await createClient();

  try {
    // Get turn details
    const { data: currentTurn } = await supabase
      .from("turns")
      .select("round_id, decider_id, turn_number")
      .eq("id", turnId)
      .single();

    if (!currentTurn) throw new Error("Turn not found");

    // Get round details
    const { data: round } = await supabase
      .from("rounds")
      .select("room_id, round_number, is_complete, current_turn")
      .eq("id", currentTurn.round_id)
      .single();

    if (!round) throw new Error("Round not found");

    // Get current room info
    const { data: room } = await supabase
      .from("rooms")
      .select("total_rounds, current_round, current_turn")
      .eq("id", round.room_id)
      .single();

    if (!room) throw new Error("Room not found");

    // --- BEGIN POINT ASSIGNMENT DIAGNOSTIC LOGGING ---
    console.log(
      `[Point Diagnostics] nextTurn called for turnId: ${turnId}. Current turn number: ${currentTurn.turn_number}, Round number: ${round.round_number}`
    );

    // Fetch answers for the current turn
    const { data: turnAnswers, error: answersError } = await supabase
      .from("answers")
      .select("id, player_id, ai_points, vote_points")
      .eq("turn_id", turnId);

    if (answersError) {
      console.error(
        "[Point Diagnostics] Error fetching answers for turn:",
        turnId,
        answersError
      );
    } else {
      console.log("[Point Diagnostics] Answers for turn:", turnId, turnAnswers);
    }

    // Fetch all players in the room to see their total_points
    const { data: roomPlayers, error: playersError } = await supabase
      .from("players")
      .select("id, nickname, total_points")
      .eq("room_id", round.room_id);

    if (playersError) {
      console.error(
        "[Point Diagnostics] Error fetching players for room:",
        round.room_id,
        playersError
      );
    } else {
      console.log(
        "[Point Diagnostics] Player points in room:",
        round.room_id,
        roomPlayers
      );
    }
    // --- END POINT ASSIGNMENT DIAGNOSTIC LOGGING ---

    // First, exit voting phase
    await supabase
      .from("rooms")
      .update({
        round_voting_phase: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", round.room_id);

    // If the round is already marked as complete, move to the next round
    if (round.is_complete) {
      console.log("Round is complete, moving to next round");
      return nextRound(round.room_id);
    }

    // Get all players in the room
    const { data: players } = await supabase
      .from("players")
      .select("id")
      .eq("room_id", round.room_id);

    if (!players || players.length === 0) {
      throw new Error("No active players found");
    }

    // If only one player is left, end the game and declare them the winner
    if (players.length === 1) {
      console.log("Only one player left, ending game with them as winner");
      await supabase
        .from("rooms")
        .update({ game_status: "completed" })
        .eq("id", round.room_id);
      return { gameEnded: true };
    }

    // Get decider history for this round
    const { data: deciderHistory } = await supabase
      .from("decider_history")
      .select("player_id")
      .eq("round_id", currentTurn.round_id);

    // Find players who haven't been deciders yet in this round
    const eligiblePlayerIds = players
      .filter((p) => !deciderHistory?.some((h) => h.player_id === p.id))
      .map((p) => p.id);

    console.log(
      `Found ${eligiblePlayerIds.length} eligible players out of ${players.length} total`
    );

    // If no more eligible players, all players have been deciders
    if (eligiblePlayerIds.length === 0) {
      console.log("All players have been deciders, moving to next round");

      // Mark current round as complete
      await supabase
        .from("rounds")
        .update({
          is_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentTurn.round_id);

      // Call nextRound to create a new round or end game
      return nextRound(round.room_id);
    }

    // Pick a random player from eligible players
    const nextDeciderId =
      eligiblePlayerIds[Math.floor(Math.random() * eligiblePlayerIds.length)];

    // Get current turn and increment
    const nextTurnNumber = (round.current_turn || 0) + 1;

    // Update round with new turn number
    await supabase
      .from("rounds")
      .update({
        current_turn: nextTurnNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentTurn.round_id);

    // Update room with new turn
    await supabase
      .from("rooms")
      .update({
        current_turn: nextTurnNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", round.room_id);

    // Create a new turn for the next decider
    const { data: newTurn, error: turnError } = await supabase
      .from("turns")
      .insert([
        {
          round_id: currentTurn.round_id,
          turn_number: nextTurnNumber,
          decider_id: nextDeciderId,
          status: "selecting_category",
        },
      ])
      .select()
      .single();

    if (turnError || !newTurn) {
      console.error("Failed to create new turn:", turnError);
      throw new Error("Failed to create new turn");
    }

    // Add to decider history
    await supabase.from("decider_history").insert({
      round_id: currentTurn.round_id,
      player_id: nextDeciderId,
      turn_number: nextTurnNumber,
    });

    // Mark player as having been decider
    await supabase
      .from("players")
      .update({ has_been_decider: true })
      .eq("id", nextDeciderId);

    return { gameEnded: false };
  } catch (error) {
    console.error("Error in nextTurn:", error);
    throw error;
  }
}

export async function nextRound(
  roomId: string
): Promise<{ gameEnded: boolean }> {
  const supabase = await createClient();

  // Get room info
  const { data: room } = await supabase
    .from("rooms")
    .select("total_rounds, current_round, round_voting_phase")
    .eq("id", roomId)
    .single();

  if (!room) throw new Error("Room not found");

  // Check if we need to move to next round or are still in the middle of turns
  if (room.round_voting_phase) {
    // We're coming from a voting phase, need to check if it's end of round or just end of turn
    const { data: currentRound } = await supabase
      .from("rounds")
      .select("id")
      .eq("room_id", roomId)
      .eq("round_number", room.current_round)
      .eq("is_complete", false)
      .single();

    if (!currentRound) {
      console.error("Current round not found");
      throw new Error("Current round not found");
    }

    // Get the current turn for this round
    const { data: currentTurn } = await supabase
      .from("turns")
      .select("id")
      .eq("round_id", currentRound.id)
      .order("turn_number", { ascending: false })
      .limit(1)
      .single();

    if (currentTurn) {
      // Move to next turn within the same round
      const turnResult = await nextTurn(currentTurn.id);
      return { gameEnded: turnResult.gameEnded };
    }
  }

  // Check if game has ended
  if (room.current_round === room.total_rounds) {
    await supabase
      .from("rooms")
      .update({ game_status: "completed" })
      .eq("id", roomId);
    return { gameEnded: true };
  }

  // Get all players
  const { data: players } = await supabase
    .from("players")
    .select("id")
    .eq("room_id", roomId);

  if (!players || players.length === 0) throw new Error("No players found");

  // Reset has_been_decider for all players
  await supabase
    .from("players")
    .update({ has_been_decider: false })
    .eq("room_id", roomId);

  // Choose random first decider for new round
  const firstDeciderId = players[Math.floor(Math.random() * players.length)].id;
  const newRoundNumber = (room.current_round || 0) + 1;

  // Create new round
  const { data: newRound } = await supabase
    .from("rounds")
    .insert([
      {
        room_id: roomId,
        round_number: newRoundNumber,
        status: "selecting_category",
        is_complete: false,
        current_turn: 1,
      },
    ])
    .select()
    .single();

  if (!newRound) throw new Error("Failed to create new round");

  // Create first turn for this round
  const { data: firstTurn } = await supabase
    .from("turns")
    .insert([
      {
        round_id: newRound.id,
        turn_number: 1,
        decider_id: firstDeciderId,
        status: "selecting_category",
      },
    ])
    .select()
    .single();

  if (!firstTurn) throw new Error("Failed to create first turn");

  // Add first decider to history
  await supabase.from("decider_history").insert({
    round_id: newRound.id,
    player_id: firstDeciderId,
    turn_number: 1,
  });

  // Mark player as having been decider
  await supabase
    .from("players")
    .update({ has_been_decider: true })
    .eq("id", firstDeciderId);

  // Update room
  await supabase
    .from("rooms")
    .update({
      current_round: newRoundNumber,
      current_turn: 1, // Reset turn counter
      round_voting_phase: false, // Not in voting phase for new round
      updated_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  return { gameEnded: false };
}

export async function getGameState(roomId: string): Promise<GameState> {
  const supabase = await createClient();

  // Get room data
  const { data: room } = (await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single()) as { data: Room | null };

  // Get rounds data
  const { data: rounds } = (await supabase
    .from("rounds")
    .select("*")
    .eq("room_id", roomId)
    .order("round_number")) as { data: Round[] | null };

  // Get players data
  const { data: players } = (await supabase
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .order("total_points", { ascending: false })) as { data: Player[] | null };

  // Get current active turns
  const { data: turns } = await supabase
    .from("turns")
    .select("*")
    .eq(
      "round_id",
      rounds?.[room?.current_round ? room.current_round - 1 : 0]?.id
    )
    .order("turn_number");

  if (!room || !rounds || !players) {
    throw new Error("Failed to fetch game state");
  }

  return {
    room,
    rounds,
    players,
    turns: turns || [],
  };
}

export async function fetchRoomById(roomId: string) {
  const supabase = await createClient();

  try {
    // First check if the room exists
    const { data: roomExists, error: checkError } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", roomId);

    if (checkError) {
      console.error("fetchRoomById: Error checking room:", checkError.message);
      throw new Error(`Error checking room: ${checkError.message}`);
    }

    if (!roomExists || roomExists.length === 0) {
      return { success: false, error: "Room not found" };
    }

    // Fetch full room data
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (error) {
      console.error("fetchRoomById: Error fetching room:", error.message);
      throw new Error(`Error fetching room: ${error.message}`);
    }

    return { success: true, room: data };
  } catch (err) {
    console.error("fetchRoomById: Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error fetching room",
    };
  }
}

export const getScenarioById = async (scenarioId: string) => {
  const supabase = await createClient();
  const { data: scenario } = await supabase
    .from("scenarios")
    .select("*")
    .eq("id", scenarioId)
    .single();

  if (!scenario) throw new Error("Scenario not found");

  return scenario;
};

export async function fetchGameStatistics() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("game_statistics")
      .select("rooms_created, players_participated, last_updated")
      .single();

    if (error) {
      console.error("Error fetching game statistics:", error);
      return {
        success: false,
        data: null,
        error: "Failed to load statistics",
      };
    }

    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    console.error("Unexpected error fetching game statistics:", error);
    return {
      success: false,
      data: null,
      error: "An unexpected error occurred",
    };
  }
}
