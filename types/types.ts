import { Database, Tables } from "@/types/database";

// Extract the row types for each table using the Tables utility
export type Player = Tables<"players">;

export type Room = Tables<"rooms">;
export type Round = Tables<"rounds">;
export type Scenario = Tables<"scenarios">;
export type Answer = Tables<"answers">;
export type Vote = Tables<"votes">;
export type decider_history = Tables<"decider_history">;
export type Turn = Tables<"turns">;
// Round status type

export type ConnectionStatus = "connected" | "disconnected" | "away";

export type RoomStatus = "waiting" | "in_progress" | "completed";
export type VoteType = "up" | "down";
export type GameStatus = "waiting" | "in_progress" | "completed";
export interface GameState {
  room: Room;
  rounds: Round[];
  players: Player[];
  turns: Turn[];
}
export type TurnStatus =
  | "selecting_category"
  | "selecting_scenario"
  | "answering"
  | "voting"
  | "completed";
