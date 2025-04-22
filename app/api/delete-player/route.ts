// app/api/delete-player/route.ts
import { NextResponse } from "next/server";
import { deletePlayer } from "@/actions/user";

export async function POST(req: Request) {
  try {
    const text = await req.text(); // 👈 Use text() instead of json()
    const { playerId } = JSON.parse(text); // Still parse it to get JSON object

    const result = await deletePlayer(playerId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in player deletion API:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
