"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Volume2, VolumeX } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  getSoundSettings,
  SoundSettings as SoundSettingsType,
  updateSoundSettings,
  defaultSoundSettings,
  playSound,
  SOUND_PATHS,
  checkAndStartLobbyMusic,
} from "@/utils/soundUtils";

export function SoundSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] =
    useState<SoundSettingsType>(defaultSoundSettings);
  const [isMuted, setIsMuted] = useState(false);

  // Play click sound directly from imported function
  const playClickSound = () => {
    playSound(SOUND_PATHS.categorySelect, "category", false);
  };

  // Load settings on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSettings = getSoundSettings();
      setSettings(savedSettings);
      setIsMuted(savedSettings.masterVolume === 0);
    }
  }, []);

  // Save settings when they change
  const handleSettingsChange = (newSettings: SoundSettingsType) => {
    setSettings(newSettings);
    updateSoundSettings(newSettings);
  };

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setIsMuted(newVolume === 0);

    handleSettingsChange({
      ...settings,
      masterVolume: newVolume,
    });
  };

  // Handle category toggle
  const handleCategoryToggle = (
    category: keyof SoundSettingsType["categories"]
  ) => {
    const newValue = !settings.categories[category];

    // Only play click sound if the category is enabled or if we're toggling a different category than "category"
    if (settings.categories.category || category !== "category") {
      playClickSound();
    }

    // Update settings immediately
    handleSettingsChange({
      ...settings,
      categories: {
        ...settings.categories,
        [category]: newValue,
      },
    });

    // We don't need to call checkAndStartLobbyMusic here
    // The applyCategorySettings function in soundUtils.ts will handle toggling
    // lobby music properly without creating a new instance
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    playClickSound();
    const newIsMuted = !isMuted;
    setIsMuted(newIsMuted);

    handleSettingsChange({
      ...settings,
      masterVolume: newIsMuted ? 0 : 0.7, // Set to 0 when muted, restore to default when unmuted
    });
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          playClickSound();
          setIsOpen(true);
        }}
        className="p-2.5 rounded-full border border-purple-500/20 text-purple-300 hover:bg-slate-700/70 transition-colors"
        aria-label="Sound Settings"
      >
        <Settings className="w-5 h-5" />
      </motion.button>

      {/* Settings Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-900/95 backdrop-blur-lg border border-purple-500/30 text-white max-w-md w-[95%] p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-purple-300 mb-2">
              Sound Settings
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Master Volume Control */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={handleMuteToggle}
                    className="mr-2 text-gray-300 hover:text-white p-2 rounded-full hover:bg-slate-800/70"
                  >
                    {isMuted ? (
                      <VolumeX className="w-6 h-6" />
                    ) : (
                      <Volume2 className="w-6 h-6" />
                    )}
                  </button>
                  <span className="font-medium text-lg text-gray-200">
                    Master Volume
                  </span>
                </div>
                <span className="text-sm bg-slate-800 px-2 py-1 rounded-md text-gray-300">
                  {Math.round(settings.masterVolume * 100)}%
                </span>
              </div>
              <Slider
                defaultValue={[settings.masterVolume]}
                value={[settings.masterVolume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="mt-3"
              />
            </div>

            {/* Sound Category Toggles */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-300">
                Sound Categories
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {/* Lobby Sounds */}
                <div className="flex items-center justify-between bg-slate-800/60 p-4 rounded-lg hover:bg-slate-800/90 transition-colors">
                  <span className="text-md text-white">Lobby Music</span>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCategoryToggle("lobby")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleCategoryToggle("lobby");
                      }
                    }}
                    className={`w-14 h-7 rounded-full transition-all ${
                      settings.categories.lobby
                        ? "bg-purple-600"
                        : "bg-gray-600"
                    } relative cursor-pointer`}
                  >
                    <motion.div
                      animate={{
                        x: settings.categories.lobby ? 28 : 4,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className="absolute w-5 h-5 rounded-full bg-white top-1"
                    />
                  </div>
                </div>

                {/* Typing Sounds */}
                <div className="flex items-center justify-between bg-slate-800/60 p-4 rounded-lg hover:bg-slate-800/90 transition-colors">
                  <span className="text-md text-white">Typing Sounds</span>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCategoryToggle("typing")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleCategoryToggle("typing");
                      }
                    }}
                    className={`w-14 h-7 rounded-full transition-all ${
                      settings.categories.typing // Use the 'typing' category here
                        ? "bg-purple-600"
                        : "bg-gray-600"
                    } relative cursor-pointer`}
                  >
                    <motion.div
                      animate={{
                        x: settings.categories.typing ? 28 : 4, // Use the 'typing' category here
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className="absolute w-5 h-5 rounded-full bg-white top-1"
                    />
                  </div>
                </div>

                {/* Category Sounds */}
                <div className="flex items-center justify-between bg-slate-800/60 p-4 rounded-lg hover:bg-slate-800/90 transition-colors">
                  <span className="text-md text-white">
                    Category/Scenario Sounds
                  </span>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCategoryToggle("category")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleCategoryToggle("category");
                      }
                    }}
                    className={`w-14 h-7 rounded-full transition-all ${
                      settings.categories.category
                        ? "bg-purple-600"
                        : "bg-gray-600"
                    } relative cursor-pointer`}
                  >
                    <motion.div
                      animate={{
                        x: settings.categories.category ? 28 : 4,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className="absolute w-5 h-5 rounded-full bg-white top-1"
                    />
                  </div>
                </div>

                {/* Voting Sounds */}
                <div className="flex items-center justify-between bg-slate-800/60 p-4 rounded-lg hover:bg-slate-800/90 transition-colors">
                  <span className="text-md text-white">Voting Sounds</span>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCategoryToggle("voting")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleCategoryToggle("voting");
                      }
                    }}
                    className={`w-14 h-7 rounded-full transition-all ${
                      settings.categories.voting
                        ? "bg-purple-600"
                        : "bg-gray-600"
                    } relative cursor-pointer`}
                  >
                    <motion.div
                      animate={{
                        x: settings.categories.voting ? 28 : 4,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className="absolute w-5 h-5 rounded-full bg-white top-1"
                    />
                  </div>
                </div>

                {/* Results Sounds */}
                <div className="flex items-center justify-between bg-slate-800/60 p-4 rounded-lg hover:bg-slate-800/90 transition-colors">
                  <span className="text-md text-white">
                    Results & Transitions
                  </span>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCategoryToggle("results")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleCategoryToggle("results");
                      }
                    }}
                    className={`w-14 h-7 rounded-full transition-all ${
                      settings.categories.results
                        ? "bg-purple-600"
                        : "bg-gray-600"
                    } relative cursor-pointer`}
                  >
                    <motion.div
                      animate={{
                        x: settings.categories.results ? 28 : 4,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className="absolute w-5 h-5 rounded-full bg-white top-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                playClickSound();
                setIsOpen(false);
              }}
              className="px-6 py-2.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors text-base"
            >
              Done
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
