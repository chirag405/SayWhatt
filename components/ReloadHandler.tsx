"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { handlePageReload } from "@/store/store-util";

/**
 * Component that handles page reloads by redirecting to the home page
 * This prevents the app from hanging on reload in game or lobby screens
 */
export function ReloadHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check for reload on initial render
      const wasReloaded = handlePageReload(pathname, router);

      // If we didn't redirect (not a reload), store the current path
      if (!wasReloaded) {
        sessionStorage.setItem("lastPathname", pathname);
      }

      // Set up a listener for page visibility changes which can also detect reloads
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          const pageReloaded =
            performance.navigation && performance.navigation.type === 1;

          if (pageReloaded) {
            console.log("Visibility change detected a reload");
            handlePageReload(pathname, router);
          }
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }
  }, [pathname, router]);

  return null; // This component doesn't render anything
}
