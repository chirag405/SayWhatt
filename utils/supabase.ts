// utils/supabase.ts
import { Database } from "@/types/database";
import { createClient } from "@supabase/supabase-js";
import { useEffect } from "react";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Example realtime subscription in a React component
export function useRoomSubscription(roomId: string, onUpdate: () => void) {
  useEffect(() => {
    // Subscribe to changes in the room
    const roomSubscription = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to changes in participants
    const participantsSubscription = supabase
      .channel(`room_participants:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_participants",
          filter: `room_id=eq.${roomId}`,
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to rounds
    const roundsSubscription = supabase
      .channel(`rounds:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
          filter: `room_id=eq.${roomId}`,
        },
        onUpdate
      )
      .subscribe();

    return () => {
      roomSubscription.unsubscribe();
      participantsSubscription.unsubscribe();
      roundsSubscription.unsubscribe();
    };
  }, [roomId, onUpdate]);
}

// Example of real-time subscription for answers and votes in a specific round
export function useRoundSubscription(roundId: string, onUpdate: () => void) {
  useEffect(() => {
    // Subscribe to changes in answers
    const answersSubscription = supabase
      .channel(`answers:${roundId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "answers",
          filter: `round_id=eq.${roundId}`,
        },
        onUpdate
      )
      .subscribe();

    // We'll subscribe to all votes but filter in the callback
    const votesSubscription = supabase
      .channel(`votes:${roundId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
        },
        (payload: { new: { answer_id?: string } }) => {
          // Get the answer_id from the payload
          const answerId = payload.new?.answer_id;
          if (answerId) {
            // Check if this vote belongs to an answer in our round
            supabase
              .from("answers")
              .select("id")
              .eq("id", answerId)
              .eq("round_id", roundId)
              .single()
              .then(
                ({ data, error }) => {
                  if (data && !error) onUpdate();
                },
                (err: any) => {
                  console.error("Error checking vote relevance:", err);
                }
              );
          }
        }
      )
      .subscribe();

    return () => {
      answersSubscription.unsubscribe();
      votesSubscription.unsubscribe();
    };
  }, [roundId, onUpdate]);
}

// New function to subscribe to answers for a specific user in a round
export function useUserAnswerSubscription(
  roundId: string,
  userId: string,
  onUpdate: () => void
) {
  useEffect(() => {
    const subscription = supabase
      .channel(`user_answer:${roundId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "answers",
          filter: `round_id=eq.${roundId}&user_id=eq.${userId}`,
        },
        onUpdate
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roundId, userId, onUpdate]);
}

// New function to subscribe to all votes for a specific answer
export function useAnswerVotesSubscription(
  answerId: string,
  onUpdate: () => void
) {
  useEffect(() => {
    const subscription = supabase
      .channel(`answer_votes:${answerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `answer_id=eq.${answerId}`,
        },
        onUpdate
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [answerId, onUpdate]);
}
