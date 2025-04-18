import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

import { useGameStore } from "@/store/game-store";
import { useUserRoomStore } from "@/store/user-room-store";

interface VotingPhaseProps {
  turnId: string;
  currentUserId: string;
  isDecider: boolean;
}

export function VotingPhase({
  turnId,
  currentUserId,
  isDecider,
}: VotingPhaseProps) {
  const { answers, votes, submitVote, processAfterVoting } = useGameStore();
  const { currentRoom, currentUser, roomPlayers } = useUserRoomStore();
  const [currentAnswerIndex, setCurrentAnswerIndex] = useState(0);
  const [hasVoted, setHasVoted] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds per slide
  const [turnData, setTurnData] = useState<{
    remaining_deciders: number;
  } | null>(null);
  const isHost = currentUser?.is_host ?? false;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const turnAnswers = answers.filter((a) => a.turn_id === turnId);
  const supabase = createClient();

  // Timer for automatic slideshow
  useEffect(() => {
    if (!isHost) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Clear the timer first
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          if (currentAnswerIndex < turnAnswers.length - 1) {
            handleNext();
            return 10; // Reset to 10 seconds for next slide
          } else {
            // Last slide finished, proceed to next turn
            setTimeout(() => {
              handleFinishVoting();
            }, 500);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentAnswerIndex, turnAnswers.length, isHost]);

  useEffect(() => {
    const channelName = `voting-slides:${turnId}`;

    // Create and subscribe to channel
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "slide-change" }, (payload) => {
        console.log(`Received slide change event:`, payload);
        setCurrentAnswerIndex(payload.payload.slideIndex);
        setTimeLeft(10); // Reset timer when slide changes
      })
      .subscribe((status) => {
        console.log(`Channel ${channelName} subscription status:`, status);
      });

    return () => {
      console.log(`Unsubscribing from channel ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [turnId, supabase]);

  // Track votes
  useEffect(() => {
    const userVotes = votes.filter((v) => v.voter_id === currentUserId);
    const votedAnswers: Record<string, boolean> = {};

    userVotes.forEach((vote) => {
      votedAnswers[vote.answer_id] = true;
    });

    setHasVoted(votedAnswers);
  }, [votes, currentUserId]);

  const handleVote = async (answerId: string) => {
    if (hasVoted[answerId]) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await submitVote(answerId, currentUserId);
      if (result.success) {
        setHasVoted((prev) => ({ ...prev, [answerId]: true }));
      } else {
        setError("Failed to submit vote. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting vote:", err);
      setError("An error occurred while voting.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentAnswerIndex < turnAnswers.length - 1) {
      const newIndex = currentAnswerIndex + 1;
      setCurrentAnswerIndex(newIndex);
      setTimeLeft(10); // Reset timer

      // Broadcast slide change to all clients
      if (isHost) {
        const channelName = `voting-slides:${turnId}`;
        console.log(`Broadcasting slide change to ${channelName}:`, newIndex);
        supabase
          .channel(channelName)
          .send({
            type: "broadcast",
            event: "slide-change",
            payload: { slideIndex: newIndex },
          })
          .then(() => console.log("Broadcast sent successfully"))
          .catch((err) =>
            console.error("Error broadcasting slide change:", err)
          );
      }
    }
  };

  const handlePrevious = () => {
    if (currentAnswerIndex > 0 && isHost) {
      const newIndex = currentAnswerIndex - 1;
      setCurrentAnswerIndex(newIndex);
      setTimeLeft(10); // Reset timer

      // Broadcast slide change to all clients
      supabase.channel(`voting-slides:${turnId}`).send({
        type: "broadcast",
        event: "slide-change",
        payload: { slideIndex: newIndex },
      });
    }
  };

  const handleFinishVoting = async () => {
    if (!isHost) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log(
        "Finishing voting phase for room:",
        currentRoom!.id,
        "current turn:",
        currentRoom?.current_turn
      );

      // Call our function that properly handles determining
      // if we need to go to the next turn or next round
      const result = await processAfterVoting(currentRoom!.id);

      if (!result) {
        setError("Failed to proceed. Please try again.");
      }
    } catch (err) {
      console.error("Error proceeding after voting:", err);
      setError("An error occurred while trying to proceed.");
    } finally {
      setIsLoading(false);
    }
  };

  if (turnAnswers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xl">Loading answers...</p>
      </div>
    );
  }

  const currentAnswer = turnAnswers[currentAnswerIndex];
  const votesForCurrentAnswer = votes.filter(
    (v) => v.answer_id === currentAnswer.id
  ).length;

  // Determine if this is the last turn in the round

  const isLastTurn = currentRoom?.current_turn === roomPlayers.length;

  // Text for the continue button
  const continueButtonText = isLoading
    ? "Processing..."
    : isLastTurn
      ? `Continue to Next Round (${timeLeft}s)`
      : `Continue to Next Turn (${timeLeft}s)`;

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h2 className="text-2xl font-bold mb-6">Voting Phase</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="w-full max-w-3xl">
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Answer {currentAnswerIndex + 1} of {turnAnswers.length}
            </h3>
            <div className="text-sm font-medium text-gray-500">
              Next slide in {timeLeft}s
            </div>
          </div>

          <p className="text-xl mb-4">{currentAnswer.answer_text}</p>

          {/* AI Response display */}
          {currentAnswer.ai_response && (
            <div className="bg-gray-100 p-4 rounded-md mb-4">
              <p className="text-sm text-gray-600 italic">AI Feedback:</p>
              <p className="text-gray-800">{currentAnswer.ai_response}</p>
            </div>
          )}

          {/* Vote count display */}
          <div className="mb-4 text-center">
            <span className="text-gray-600">
              {votesForCurrentAnswer}{" "}
              {votesForCurrentAnswer === 1 ? "vote" : "votes"}
            </span>
          </div>

          <div className="flex justify-center space-x-4 mt-6">
            <button
              onClick={() => handleVote(currentAnswer.id)}
              disabled={hasVoted[currentAnswer.id] || isLoading}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              {hasVoted[currentAnswer.id] ? "Voted" : "Upvote"}
            </button>
          </div>
        </div>

        {/* Navigation controls */}
        <div className="flex justify-between mt-4">
          <button
            onClick={handlePrevious}
            disabled={currentAnswerIndex === 0 || !isHost}
            className={`px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors duration-200 ${
              !isHost || currentAnswerIndex === 0
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            Previous
          </button>

          <div className="text-center">
            {currentAnswerIndex + 1} / {turnAnswers.length}
          </div>

          <button
            onClick={handleNext}
            disabled={currentAnswerIndex === turnAnswers.length - 1 || !isHost}
            className={`px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors duration-200 ${
              !isHost || currentAnswerIndex === turnAnswers.length - 1
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            Next
          </button>
        </div>

        {/* Continue button for host */}
        {currentAnswerIndex === turnAnswers.length - 1 && isHost && (
          <div className="mt-8 text-center">
            <button
              onClick={handleFinishVoting}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              {continueButtonText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
