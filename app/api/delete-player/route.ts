// app/api/delete-player/route.ts
import { NextResponse } from "next/server";
import { deletePlayer } from "@/actions/user";

export async function POST(req: Request) {
  try {
    const text = await req.text(); // 👈 Use text() instead of json()

    // Check if the text is empty or not valid JSON
    if (!text || text.trim() === "") {
      console.error("Delete player API received empty request body");
      return NextResponse.json(
        { error: "Empty request body" },
        { status: 400 }
      );
    }

    try {
      const { playerId } = JSON.parse(text);

      if (!playerId) {
        console.error("Delete player API missing playerId");
        return NextResponse.json(
          { error: "Missing playerId" },
          { status: 400 }
        );
      }

      console.log(`Deleting player: ${playerId}`);
      const result = await deletePlayer(playerId);
      return NextResponse.json(result);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError, "Raw text:", text);
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in player deletion API:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
