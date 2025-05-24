import { Howl } from "howler";

// Define sound file paths with correct public folder path for Next.js
export const SOUND_PATHS = {
  lobby: "/sounds/lobby.mp3",
  playerJoin: "/sounds/player-join.mp3",
  categorySelect: "/sounds/category-select.mp3",
  timerTick: "/sounds/timer-tick.mp3",
  voteUp: "/sounds/vote-up.mp3",
  voteDown: "/sounds/vote-down.mp3",
  resultsReveal: "/sounds/results-reveal.mp3",
  transition: "/sounds/transition.mp3",
  rickRoll: "/sounds/rick-roll.mp3",
  typingKeypress: "/sounds/typing-keypress.mp3", // Add this line
};

// Sound category types for settings
export type SoundCategory =
  | "lobby"
  | "category"
  | "voting"
  | "results"
  | "copy"
  | "start"
  | "typing"; // Add this line

// Sound instances
const soundInstances: Record<string, Howl> = {};

// Tracks which sounds should be looping
const loopingSounds: Set<string> = new Set();

// Sound settings stored in localStorage
export interface SoundSettings {
  masterVolume: number;
  categories: {
    lobby: boolean;
    category: boolean;
    voting: boolean;
    results: boolean;
    copy?: boolean;
    start?: boolean;
    typing?: boolean; // Add this line
  };
}

// Default sound settings
export const defaultSoundSettings: SoundSettings = {
  masterVolume: 0.7, // 70% volume by default
  categories: {
    lobby: true,
    category: true,
    voting: true,
    results: true,
    copy: true,
    start: true,
    typing: true, // Add this line
  },
};

// Get sound settings from localStorage, or use defaults if not found
export function getSoundSettings(): SoundSettings {
  if (typeof window === "undefined") {
    return {
      ...defaultSoundSettings,
      categories: { ...defaultSoundSettings.categories },
    };
  }

  const stored = localStorage.getItem("saywhat_sound_settings");
  if (!stored) {
    return {
      ...defaultSoundSettings,
      categories: { ...defaultSoundSettings.categories },
    };
  }

  try {
    const settings = JSON.parse(stored) as SoundSettings;
    // Ensure all default categories are present by merging with defaults
    settings.categories = {
      ...defaultSoundSettings.categories,
      ...settings.categories,
    };
    return settings;
  } catch (e) {
    console.error("Error parsing sound settings:", e);
    // When error occurs, return a fresh copy of defaultSoundSettings
    // also ensuring all its categories are present (which they are by definition)
    return {
      ...defaultSoundSettings,
      categories: { ...defaultSoundSettings.categories },
    };
  }
}

// Save sound settings to localStorage
export function saveSoundSettings(settings: SoundSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("saywhat_sound_settings", JSON.stringify(settings));
}

// Update sound settings
export function updateSoundSettings(
  update: Partial<SoundSettings> | ((prev: SoundSettings) => SoundSettings)
): SoundSettings {
  const current = getSoundSettings();
  let updated: SoundSettings;

  if (typeof update === "function") {
    updated = update(current);
  } else {
    updated = {
      ...current,
      ...update,
      categories: {
        ...current.categories,
        ...(update.categories || {}),
      },
    };
  }

  saveSoundSettings(updated);

  // Update volumes for all existing sound instances
  updateAllVolumes(updated.masterVolume);

  // Apply category changes to currently playing sounds
  applyCategorySettings(updated);

  return updated;
}

// Apply category settings to currently playing sounds
function applyCategorySettings(settings: SoundSettings): void {
  const lobbyKey = "lobby"; // Assuming 'lobby' is the key for lobby music in SOUND_PATHS

  if (soundInstances[lobbyKey]) {
    soundInstances[lobbyKey].volume(settings.masterVolume); // Always update volume

    if (settings.categories.lobby) {
      if (!soundInstances[lobbyKey].playing()) {
        console.log("[applyCategorySettings] Lobby category enabled, playing lobby music.");
        soundInstances[lobbyKey].play();
      } else {
        console.log("[applyCategorySettings] Lobby music already playing and category enabled.");
      }
    } else {
      if (soundInstances[lobbyKey].playing()) {
        console.log("[applyCategorySettings] Lobby category disabled, pausing lobby music.");
        soundInstances[lobbyKey].pause();
      } else {
        console.log("[applyCategorySettings] Lobby music already paused and category disabled.");
      }
    }
  } else {
    console.warn("[applyCategorySettings] Lobby music instance not found. Was preloadSounds called?");
  }

  // Loop through all sound instances and manage them based on categories (excluding lobby)
  Object.entries(SOUND_PATHS).forEach(([key, path]) => {
    if (!soundInstances[key] || key === "lobby") return; // Skip lobby as we handled it separately

    // Determine category based on sound key
    let category: SoundCategory | undefined;
    if (key === "categorySelect" || key === "timerTick") {
      category = "category";
    } else if (key === "voteUp" || key === "voteDown") {
      category = "voting";
    } else if (key === "resultsReveal" || key === "transition") {
      category = "results";
    }

    // If category is disabled and sound is playing, stop it
    if (
      category &&
      !settings.categories[category] &&
      soundInstances[key].playing()
    ) {
      console.log(
        `Stopping ${key} sound because ${category} category is disabled`
      );
      soundInstances[key].stop();
    }
  });
}

// Preload all sounds to avoid delays
export function preloadSounds(): void {
  console.log("[preloadSounds] Preloading all sounds.");
  Object.entries(SOUND_PATHS).forEach(([key, path]) => {
    const settings = getSoundSettings();
    const isLobbySound = path === SOUND_PATHS.lobby;

    let initialVolume = settings.masterVolume;
    if (key === "resultsReveal") { // Assuming 'resultsReveal' is the key
      initialVolume = settings.masterVolume * 0.5; // Specific adjustment for resultsReveal
    }

    if (soundInstances[key]) {
      console.warn(`[preloadSounds] Sound instance for ${key} already exists. Skipping creation.`);
      return;
    }

    soundInstances[key] = new Howl({
      src: [path],
      preload: true,
      volume: initialVolume,
      loop: isLobbySound, // Only lobby music loops by default
      html5: isLobbySound, // Use HTML5 audio for lobby music to potentially improve background play
    });

    if (isLobbySound) {
      console.log(`[preloadSounds] Lobby music instance created: ${key}`);
      loopingSounds.add(key); // Keep track of lobby music for looping logic if needed elsewhere
    }
  });
}

// Play a sound if the category is enabled
export function playSound(
  path: string,
  category: SoundCategory,
  loop: boolean = false
): void {
  if (typeof window === "undefined") return;

  const settings = getSoundSettings();

  // For backward compatibility with existing storage, treat 'copy' and 'start' as 'category'
  const effectiveCategory =
    category === "copy" || category === "start" ? "category" : category;

  console.log(
    `Attempting to play sound in category ${category}, enabled: ${settings.categories[effectiveCategory]}`
  );

  // Check if the sound category is enabled
  if (!settings.categories[effectiveCategory]) {
    console.log(`Sound category ${category} is disabled. Not playing sound.`);
    return;
  }

  // Find the sound instance or create one if needed
  const key = Object.entries(SOUND_PATHS).find(([_, p]) => p === path)?.[0];
  if (!key) {
    console.error(`Sound path not found: ${path}`);
    return;
  }
  // Use existing sound instance or create a new one
  if (!soundInstances[key]) {
    try {
      let initialVolume = settings.masterVolume;
      // Specifically reduce volume for the results reveal sound
      if (path === SOUND_PATHS.resultsReveal) {
        initialVolume = settings.masterVolume * 0.3;
      }

      soundInstances[key] = new Howl({
        src: [path],
        volume: initialVolume,
        loop: loop,
        html5: true, // Add this to help with mobile playback and concurrent sounds
        preload: true,
      });

      if (loop) {
        loopingSounds.add(key);
      }
    } catch (err) {
      console.error(`Error creating sound: ${path}`, err);
      return;
    }
  } else {
    // Update the loop setting
    soundInstances[key].loop(loop);

    if (loop && !loopingSounds.has(key)) {
      loopingSounds.add(key);
    } else if (!loop && loopingSounds.has(key)) {
      loopingSounds.delete(key);
    }
  }
  // Update volume based on current settings
  let volumeToUse = settings.masterVolume;
  // Specifically reduce volume for the results reveal sound
  if (path === SOUND_PATHS.resultsReveal) {
    // Reduce to 30% of the master volume (lowered from 50%)
    volumeToUse = settings.masterVolume * 0.3;
    console.log(`Reducing volume for results reveal sound to ${volumeToUse}`);
  }

  soundInstances[key].volume(volumeToUse);

  // If sound is already playing and it's a looping sound, don't restart it
  if (soundInstances[key].playing() && loop) {
    console.log(
      `Sound ${key} is already playing and should loop. Not restarting.`
    );
    return;
  }

  // For non-looping sounds that are already playing, stop before playing again
  if (soundInstances[key].playing() && !loop) {
    soundInstances[key].stop();
  }

  // Play the sound
  try {
    soundInstances[key].play();
    console.log(`Playing sound: ${key}, loop: ${loop}`);
  } catch (err) {
    console.error(`Error playing sound: ${key}`, err);
  }
}

// Stop a specific sound
export function stopSound(path: string, keepLobbyMusic: boolean = true): void {
  // Don't stop lobby music if keepLobbyMusic is true
  if (path === SOUND_PATHS.lobby && keepLobbyMusic) {
    console.log("Keeping lobby music playing (stopSound called but ignored)");
    return;
  }

  const key = Object.entries(SOUND_PATHS).find(([_, p]) => p === path)?.[0];
  if (key && soundInstances[key]) {
    soundInstances[key].stop();

    // Remove from looping sounds if it was looping
    if (loopingSounds.has(key)) {
      loopingSounds.delete(key);
    }
  }
}

// Stop all playing sounds except lobby music if keepLobbyMusic is true
export function stopAllSounds(keepLobbyMusic: boolean = true): void {
  Object.entries(soundInstances).forEach(([key, sound]) => {
    // Skip lobby music if keepLobbyMusic is true
    const isLobbyMusic =
      SOUND_PATHS[key as keyof typeof SOUND_PATHS] === SOUND_PATHS.lobby;

    if (isLobbyMusic && keepLobbyMusic) {
      // Don't stop lobby music
      console.log("Keeping lobby music playing");
      return;
    }

    if (sound.playing()) {
      sound.stop();
      console.log(`Stopped sound: ${key}`);
    }
  });

  // Keep looping sounds for lobby if keeping lobby music
  if (keepLobbyMusic) {
    const lobbyKey = Object.keys(SOUND_PATHS).find(
      (key) =>
        SOUND_PATHS[key as keyof typeof SOUND_PATHS] === SOUND_PATHS.lobby
    );

    // Clear all looping sounds except lobby
    const newLoopingSounds = new Set<string>();
    if (lobbyKey && loopingSounds.has(lobbyKey)) {
      newLoopingSounds.add(lobbyKey);
    }
    loopingSounds.clear();

    // Add back the lobby if it was looping
    newLoopingSounds.forEach((key) => loopingSounds.add(key));
  } else {
    // Clear all looping sounds
    loopingSounds.clear();
  }
}

// Update all sound volumes based on master volume
export function updateAllVolumes(masterVolume: number): void {
  Object.entries(soundInstances).forEach(([key, sound]) => {
    // Find the path for this sound instance
    const path = SOUND_PATHS[key as keyof typeof SOUND_PATHS];
    // Apply volume adjustment for specific sounds
    let volumeToUse = masterVolume;
    if (path === SOUND_PATHS.resultsReveal) {
      volumeToUse = masterVolume * 0.3;
    }

    sound.volume(volumeToUse);
  });
}

// Check and start lobby music if it should be playing
export function checkAndStartLobbyMusic(): void {
  if (typeof window === "undefined") return;
  const settings = getSoundSettings();
  const lobbyKey = "lobby"; // Assuming 'lobby' is the key for lobby music in SOUND_PATHS

  console.log(`[checkAndStartLobbyMusic] Attempting to start lobby music. Category enabled: ${settings.categories.lobby}`);

  if (!soundInstances[lobbyKey]) {
    console.error("[checkAndStartLobbyMusic] Lobby music instance not found. Ensure preloadSounds() is called first.");
    // Optionally, attempt to preload it here as a fallback, though ideally it should be preloaded.
    // preloadSounds(); // This might be too aggressive or cause issues if called out of sequence.
    return;
  }

  soundInstances[lobbyKey].volume(settings.masterVolume); // Ensure volume is up-to-date

  if (settings.categories.lobby) {
    if (!soundInstances[lobbyKey].playing()) {
      console.log("[checkAndStartLobbyMusic] Lobby category enabled. Playing lobby music.");
      soundInstances[lobbyKey].play();
    } else {
      console.log("[checkAndStartLobbyMusic] Lobby music already playing and category enabled.");
    }
  } else {
    if (soundInstances[lobbyKey].playing()) {
      console.log("[checkAndStartLobbyMusic] Lobby category disabled. Pausing lobby music.");
      soundInstances[lobbyKey].pause();
    } else {
      console.log("[checkAndStartLobbyMusic] Lobby music already paused and category disabled.");
    }
  }
}

// Play a click sound for interactive elements
export function playClickSound(): void {
  // Use the categorySelect sound as it's short and appropriate for clicks
  playSound(SOUND_PATHS.categorySelect, "category", false);
}
