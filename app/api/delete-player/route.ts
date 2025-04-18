import { deletePlayer } from "@/actions/user";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { playerId } = await req.json();
    const result = await deletePlayer(playerId);
    return NextResponse.json(result);
  } catch (error) {
    return { error: (error as any).message };
  }
}
