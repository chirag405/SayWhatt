// store-utils.ts

import { useGameStore } from "./game-store";
import { useUserRoomStore } from "./user-room-store";

export const resetAllStores = () => {
  try {
    // First get important IDs before resetting
    const roomId = useUserRoomStore.getState().currentRoom?.id;
    const turnId = useGameStore.getState().currentTurn?.id;
    const userId = useUserRoomStore.getState().currentUser?.id;

    // Reset game store - this will cancel timers, etc.
    useGameStore.getState().resetState();

    // Reset user room store - this closes subscriptions
    useUserRoomStore.getState().resetState();

    // Clean up any residual items from localStorage
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentRoom");

    // Also cleanup any session storage items that might be causing issues
    sessionStorage.removeItem(`game-${roomId}`);
    sessionStorage.removeItem(`turn-${turnId}`);

    console.log("All stores and local storage reset successfully");
  } catch (error) {
    console.error("Error during store reset:", error);
  }
};
