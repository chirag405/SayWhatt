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
    sessionStorage.removeItem("lastPathname");
    sessionStorage.removeItem("pageUnloadTime");

    console.log("All stores and local storage reset successfully");
  } catch (error) {
    console.error("Error during store reset:", error);
  }
};

/**
 * Handles page reload detection and redirection
 * @param currentPath The current page path
 * @param router The Next.js router instance
 * @returns A boolean indicating if a redirect was performed
 */
export const handlePageReload = (currentPath: string, router: any): boolean => {
  // Check if this is a reload by looking at the unload timestamp
  const unloadTime = sessionStorage.getItem("pageUnloadTime");
  const lastPathname = sessionStorage.getItem("lastPathname");

  // Performance navigation can also be used to detect reloads
  const performanceNavigation =
    typeof performance !== "undefined" &&
    performance.navigation &&
    performance.navigation.type === 1;

  if (unloadTime || performanceNavigation) {
    // This is a page reload - log it for debugging
    console.log("Page reload detected on path:", currentPath);

    // Reset all stores
    resetAllStores();

    // Clear the unload time and last pathname
    sessionStorage.removeItem("pageUnloadTime");
    sessionStorage.removeItem("lastPathname");

    // Only redirect if not already on home page and either in game or lobby
    if (
      currentPath !== "/" &&
      (currentPath.includes("/game/") || currentPath.includes("/lobby/"))
    ) {
      console.log("Redirecting to home from:", currentPath);
      router.push("/");
      return true;
    }
  }

  return false;
};
