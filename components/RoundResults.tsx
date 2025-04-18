// import { useState, useEffect } from "react";
// import { Player, Answer, Vote } from "@/types/types";
// import { useGameStore } from "@/store/game-store";

// interface RoundResultsProps {
//   roundId: string;
//   players: Player[];
// }

// export const RoundResults = ({ roundId, players }: RoundResultsProps) => {
//   const { answers, votes } = useGameStore();
//   const [roundAnswers, setRoundAnswers] = useState<Answer[]>([]);
//   const [roundVotes, setRoundVotes] = useState<Vote[]>([]);
//   const [isLoading, setIsLoading] = useState(true);

//   // Process answers and votes
//   useEffect(() => {
//     // Filter answers for this round
//     const filteredAnswers = answers.filter(
//       (answer) => answer.round_id === roundId
//     );
//     const answerIds = filteredAnswers.map((answer) => answer.id);

//     // Filter votes that belong to these answers
//     const filteredVotes = votes.filter((vote) =>
//       answerIds.includes(vote.answer_id)
//     );

//     setRoundAnswers(filteredAnswers);
//     setRoundVotes(filteredVotes);
//     setIsLoading(false);
//   }, [roundId, answers, votes]);

//   // Calculate vote totals for each player
//   const getVotesForPlayer = (playerId: string) => {
//     const playerAnswers = roundAnswers.filter(
//       (answer) => answer.player_id === playerId
//     );
//     if (playerAnswers.length === 0) return 0;

//     const answerIds = playerAnswers.map((answer) => answer.id);
//     const playerVotes = roundVotes.filter((vote) =>
//       answerIds.includes(vote.answer_id)
//     );

//     return playerVotes.length;
//   };

//   // Calculate results
//   const results = players
//     .map((player) => ({
//       player,
//       votes: getVotesForPlayer(player.id),
//       answers: roundAnswers.filter((answer) => answer.player_id === player.id),
//     }))
//     .sort((a, b) => b.votes - a.votes);

//   if (isLoading) {
//     return (
//       <div className="flex items-center justify-center p-8">
//         Loading results...
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
//       <h2 className="text-2xl font-bold text-center mb-6">Round Results</h2>

//       {/* Show player rankings */}
//       <div className="mb-8">
//         <h3 className="text-xl font-semibold mb-4">Player Rankings</h3>
//         <div className="space-y-4">
//           {results.map((result, index) => (
//             <div
//               key={result.player.id}
//               className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
//             >
//               <div className="flex items-center">
//                 <span className="text-lg font-bold mr-4">{index + 1}.</span>
//                 <div>
//                   <p className="font-medium">{result.player.nickname}</p>
//                   <p className="text-sm text-gray-600">
//                     {result.answers.length} answers submitted
//                   </p>
//                 </div>
//               </div>
//               <div className="text-center">
//                 <p className="text-xl font-bold">{result.votes}</p>
//                 <p className="text-sm text-gray-600">votes</p>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Display all answers with their votes */}
//       <div>
//         <h3 className="text-xl font-semibold mb-4">All Answers</h3>
//         <div className="space-y-6">
//           {roundAnswers.map((answer) => {
//             const player = players.find((p) => p.id === answer.player_id);
//             const answerVotes = roundVotes.filter(
//               (v) => v.answer_id === answer.id
//             ).length;

//             return (
//               <div key={answer.id} className="border rounded-lg p-4">
//                 <div className="flex justify-between items-center mb-2">
//                   <p className="font-medium">
//                     {player?.nickname || "Unknown Player"}
//                   </p>
//                   <div className="flex items-center">
//                     <span className="text-green-600 font-bold mr-1">
//                       +{answerVotes}
//                     </span>
//                     <span className="text-gray-600">votes</span>
//                   </div>
//                 </div>
//                 <p className="text-gray-800">{answer.answer_text}</p>
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       {/* Button to proceed to next round or view final results */}
//       <div className="mt-8 text-center">
//         <p className="text-gray-600 mb-4">
//           Round complete! The next round will begin automatically...
//         </p>
//       </div>
//     </div>
//   );
// };
