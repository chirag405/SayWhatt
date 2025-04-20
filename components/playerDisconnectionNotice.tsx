// import { useState, useEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { Player } from "@/types/types";

// type PlayerDisconnectNotificationProps = {
//   player: Player;
//   wasDecider: boolean;
//   newDecider: Player | null;
// };

// export function PlayerDisconnectNotification({
//   player,
//   wasDecider,
//   newDecider,
// }: PlayerDisconnectNotificationProps) {
//   const [visible, setVisible] = useState(true);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setVisible(false);
//     }, 5000); // Show for 5 seconds

//     return () => clearTimeout(timer);
//   }, []);

//   return (
//     <AnimatePresence>
//       {visible && (
//         <motion.div
//           initial={{ opacity: 0, y: -20 }}
//           animate={{ opacity: 1, y: 0 }}
//           exit={{ opacity: 0, y: -20 }}
//           className="fixed top-4 right-4 z-50 bg-red-900/80 border border-red-500/30 p-4 rounded-lg shadow-lg backdrop-blur-sm max-w-md"
//         >
//           <div className="flex items-start">
//             <div className="flex-shrink-0 bg-red-500/20 rounded-full p-2">
//               <svg
//                 className="w-6 h-6 text-red-400"
//                 fill="none"
//                 viewBox="0 0 24 24"
//                 stroke="currentColor"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
//                 />
//               </svg>
//             </div>
//             <div className="ml-3">
//               <h3 className="text-lg font-medium text-red-100">
//                 {player.nickname} has left the game
//               </h3>
//               {wasDecider && (
//                 <div className="mt-2 text-sm text-red-200">
//                   {player.nickname} was the decider.
//                   {newDecider ? (
//                     <span>
//                       {" "}
//                       <strong>{newDecider.nickname}</strong> is now the new
//                       decider.
//                     </span>
//                   ) : (
//                     <span> Waiting for a new decider to be assigned.</span>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>
//           <button
//             onClick={() => setVisible(false)}
//             className="absolute top-2 right-2 text-red-300 hover:text-red-100"
//           >
//             <svg
//               className="w-4 h-4"
//               fill="none"
//               viewBox="0 0 24 24"
//               stroke="currentColor"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M6 18L18 6M6 6l12 12"
//               />
//             </svg>
//           </button>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   );
// }
