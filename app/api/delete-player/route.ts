import { deletePlayer } from "@/actions/user";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { playerId } = await req.json();
    const result = await deletePlayer(playerId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in player deletion API:", error);
    return NextResponse.json(
      { error: (error as any).message },
      { status: 500 }
    );
  }
}
