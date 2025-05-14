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
};

// Sound category types for settings
export type SoundCategory = "lobby" | "category" | "voting" | "results";

// Sound instances
const soundInstances: Record<string, Howl> = {};

// Tracks which sounds should be looping
const loopingSounds: Set<string> = new Set();

// Flag to track if lobby music is playing - add this to prevent multiple instances
let lobbyMusicInitialized = false;

// Sound settings stored in localStorage
export interface SoundSettings {
  masterVolume: number;
  categories: {
    lobby: boolean;
    category: boolean;
    voting: boolean;
    results: boolean;
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
  },
};

// Get sound settings from localStorage, or use defaults if not found
export function getSoundSettings(): SoundSettings {
  if (typeof window === "undefined") return defaultSoundSettings;

  const stored = localStorage.getItem("saywhat_sound_settings");
  if (!stored) return defaultSoundSettings;

  try {
    return JSON.parse(stored) as SoundSettings;
  } catch (e) {
    console.error("Error parsing sound settings:", e);
    return defaultSoundSettings;
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
  // Handle lobby music - special case as it should keep playing in background
  const lobbyKey = Object.keys(SOUND_PATHS).find(
    (key) => SOUND_PATHS[key as keyof typeof SOUND_PATHS] === SOUND_PATHS.lobby
  );

  if (lobbyKey && soundInstances[lobbyKey]) {
    // If lobby category enabled but not playing, start it
    if (settings.categories.lobby && !soundInstances[lobbyKey].playing()) {
      console.log("Starting lobby music because category was enabled");
      soundInstances[lobbyKey].volume(settings.masterVolume);
      soundInstances[lobbyKey].loop(true); // Ensure looping is set

      // Mark as looping sound
      if (!loopingSounds.has(lobbyKey)) {
        loopingSounds.add(lobbyKey);
      }

      // Play after a slight delay to avoid audio context issues
      setTimeout(() => {
        soundInstances[lobbyKey].play();
      }, 50);
    }
    // If lobby disabled and playing, stop it
    else if (!settings.categories.lobby && soundInstances[lobbyKey].playing()) {
      console.log("Stopping lobby music because lobby category is disabled");
      // Important: Only pause the music, don't destroy the instance
      // This ensures we can resume the same instance later
      soundInstances[lobbyKey].pause();
    }
  }

  // Loop through all sound instances and manage them based on categories
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
  Object.entries(SOUND_PATHS).forEach(([key, path]) => {
    const settings = getSoundSettings();
    // Determine if this sound should loop (only lobby music loops)
    const shouldLoop = key === "lobby";

    soundInstances[key] = new Howl({
      src: [path],
      preload: true,
      volume: settings.masterVolume,
      loop: shouldLoop,
    });

    // Keep track of looping sounds
    if (shouldLoop) {
      loopingSounds.add(key);
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
  console.log(
    `Attempting to play sound in category ${category}, enabled: ${settings.categories[category]}`
  );

  // Check if the sound category is enabled
  if (!settings.categories[category]) {
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
      soundInstances[key] = new Howl({
        src: [path],
        volume: settings.masterVolume,
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
  soundInstances[key].volume(settings.masterVolume);

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
export function stopSound(path: string): void {
  const key = Object.entries(SOUND_PATHS).find(([_, p]) => p === path)?.[0];
  if (key && soundInstances[key]) {
    soundInstances[key].stop();

    // Reset lobby initialized flag when stopping lobby music
    if (path === SOUND_PATHS.lobby) {
      lobbyMusicInitialized = false;
      console.log("Reset lobby music initialized flag");
    }

    // Remove from looping sounds if it was looping
    if (loopingSounds.has(key)) {
      loopingSounds.delete(key);
    }
  }
}

// Stop all playing sounds
export function stopAllSounds(): void {
  Object.values(soundInstances).forEach((sound) => {
    if (sound.playing()) {
      sound.stop();
    }
  });

  // Reset lobby music initialized flag
  lobbyMusicInitialized = false;
  console.log("Reset lobby music initialized flag (all sounds stopped)");

  // Clear looping sounds tracking
  loopingSounds.clear();
}

// Update all sound volumes based on master volume
export function updateAllVolumes(masterVolume: number): void {
  Object.values(soundInstances).forEach((sound) => {
    sound.volume(masterVolume);
  });
}

// Check and start lobby music if it should be playing
export function checkAndStartLobbyMusic(): void {
  if (typeof window === "undefined") return;
  const settings = getSoundSettings();

  // Only play if lobby sounds are enabled
  if (!settings.categories.lobby) {
    console.log("Lobby sounds are disabled, not starting lobby music");
    return;
  }

  const lobbyKey = Object.keys(SOUND_PATHS).find(
    (key) => SOUND_PATHS[key as keyof typeof SOUND_PATHS] === SOUND_PATHS.lobby
  );

  if (!lobbyKey) {
    console.error("Lobby sound key not found");
    return;
  }

  // First, check if the sound instance exists
  if (soundInstances[lobbyKey]) {
    // If it exists but is not playing and we have lobby enabled, play it
    if (!soundInstances[lobbyKey].playing() && settings.categories.lobby) {
      console.log("Reusing existing lobby sound instance");
      soundInstances[lobbyKey].volume(settings.masterVolume);
      soundInstances[lobbyKey].loop(true);

      // Set the flag before playing to avoid race conditions
      lobbyMusicInitialized = true;

      // Play the sound
      soundInstances[lobbyKey].play();
      return;
    }
    // If it's already playing, just make sure it's properly initialized
    else if (soundInstances[lobbyKey].playing()) {
      lobbyMusicInitialized = true;
      console.log("Lobby sound already playing, marked as initialized");
      return;
    }
  }

  // If we reach here, we need to create a new instance
  console.log("Creating new lobby sound instance");
  soundInstances[lobbyKey] = new Howl({
    src: [SOUND_PATHS.lobby],
    volume: settings.masterVolume,
    loop: true,
    html5: true,
    preload: true,
  });

  // Mark as looping sound
  loopingSounds.add(lobbyKey);

  // Set the flag before playing to avoid race conditions
  lobbyMusicInitialized = true;

  // Play after a slight delay to avoid audio context issues
  setTimeout(() => {
    try {
      soundInstances[lobbyKey].play();
    } catch (err) {
      console.error("Error playing lobby music:", err);
      lobbyMusicInitialized = false; // Reset the flag on error
    }
  }, 100);
}

// Play a click sound for interactive elements
export function playClickSound(): void {
  // Use the categorySelect sound as it's short and appropriate for clicks
  playSound(SOUND_PATHS.categorySelect, "category", false);
}
