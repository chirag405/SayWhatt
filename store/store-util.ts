// store-utils.ts

import { useGameStore } from "./game-store";
import { useUserRoomStore } from "./user-room-store";

export const resetAllStores = () => {
  // Reset game store
  useGameStore.getState().resetState();

  // Reset user room store
  useUserRoomStore.getState().resetState();

  // Clean up any active subscriptions if necessary
  const roomId = useUserRoomStore.getState().currentRoom?.id;
  const turnId = useGameStore.getState().currentTurn?.id;

  if (roomId) {
    // This assumes you're properly cleaning up subscriptions in the resetState methods
    // If not, you may need to manually clean up subscriptions here
  }

  console.log("All stores reset successfully");
};
