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
};

// Sound category types for settings
export type SoundCategory = "lobby" | "category" | "voting" | "results";

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

  return updated;
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

  // Check if the sound category is enabled
  if (!settings.categories[category]) return;

  // Find the sound instance or create one if needed
  const key = Object.entries(SOUND_PATHS).find(([_, p]) => p === path)?.[0];
  if (!key) {
    console.error(`Sound path not found: ${path}`);
    return;
  }

  if (!soundInstances[key]) {
    soundInstances[key] = new Howl({
      src: [path],
      volume: settings.masterVolume,
      loop: loop,
    });

    if (loop) {
      loopingSounds.add(key);
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

  // If sound is already playing, don't restart it if it's a looping sound
  if (soundInstances[key].playing() && loopingSounds.has(key)) {
    return;
  }

  // If not looping and already playing, stop it before playing again
  if (soundInstances[key].playing() && !loopingSounds.has(key)) {
    soundInstances[key].stop();
  }

  // Play the sound
  soundInstances[key].play();
}

// Stop a specific sound
export function stopSound(path: string): void {
  const key = Object.entries(SOUND_PATHS).find(([_, p]) => p === path)?.[0];
  if (key && soundInstances[key]) {
    soundInstances[key].stop();

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

  // Clear looping sounds tracking
  loopingSounds.clear();
}

// Update all sound volumes based on master volume
export function updateAllVolumes(masterVolume: number): void {
  Object.values(soundInstances).forEach((sound) => {
    sound.volume(masterVolume);
  });
}
