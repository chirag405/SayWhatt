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
} from "@/utils/soundUtils";

export function SoundSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] =
    useState<SoundSettingsType>(defaultSoundSettings);
  const [isMuted, setIsMuted] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const savedSettings = getSoundSettings();
    setSettings(savedSettings);
    setIsMuted(savedSettings.masterVolume === 0);
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
    handleSettingsChange({
      ...settings,
      categories: {
        ...settings.categories,
        [category]: !settings.categories[category],
      },
    });
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    const newIsMuted = !isMuted;
    setIsMuted(newIsMuted);

    handleSettingsChange({
      ...settings,
      masterVolume: newIsMuted ? 0 : 0.7, // Set to 0 when muted, restore to default when unmuted
    });
  };

  return (
    <>
      {/* Settings Button */}
      <div className="fixed top-4 right-4 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="bg-slate-800/70 backdrop-blur-sm p-2.5 rounded-full border border-purple-500/20 text-purple-300 hover:bg-slate-700/70 transition-colors"
          aria-label="Sound Settings"
        >
          <Settings className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-900/95 backdrop-blur-lg border border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-purple-300">
              Sound Settings
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {/* Master Volume Control */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <button
                    onClick={handleMuteToggle}
                    className="mr-2 text-gray-300 hover:text-white"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <span className="font-medium text-gray-200">
                    Master Volume
                  </span>
                </div>
                <span className="text-sm text-gray-400">
                  {Math.round(settings.masterVolume * 100)}%
                </span>
              </div>
              <Slider
                defaultValue={[settings.masterVolume]}
                value={[settings.masterVolume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="mt-2"
              />
            </div>

            {/* Sound Category Toggles */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300">
                Sound Categories
              </h3>

              <div className="grid grid-cols-1 gap-2">
                {/* Lobby Sounds */}
                <div className="flex items-center justify-between bg-slate-800/60 p-3 rounded-md">
                  <span className="text-sm text-white">Lobby Music</span>
                  <button
                    onClick={() => handleCategoryToggle("lobby")}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      settings.categories.lobby
                        ? "bg-purple-600"
                        : "bg-gray-600"
                    } relative`}
                  >
                    <span
                      className={`absolute w-4 h-4 rounded-full bg-white transition-transform transform ${
                        settings.categories.lobby
                          ? "translate-x-5"
                          : "translate-x-1"
                      } top-0.5`}
                    />
                  </button>
                </div>

                {/* Category Sounds */}
                <div className="flex items-center justify-between bg-slate-800/60 p-3 rounded-md">
                  <span className="text-sm text-white">
                    Category/Scenario Sounds
                  </span>
                  <button
                    onClick={() => handleCategoryToggle("category")}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      settings.categories.category
                        ? "bg-purple-600"
                        : "bg-gray-600"
                    } relative`}
                  >
                    <span
                      className={`absolute w-4 h-4 rounded-full bg-white transition-transform transform ${
                        settings.categories.category
                          ? "translate-x-5"
                          : "translate-x-1"
                      } top-0.5`}
                    />
                  </button>
                </div>

                {/* Voting Sounds */}
                <div className="flex items-center justify-between bg-slate-800/60 p-3 rounded-md">
                  <span className="text-sm text-white">Voting Sounds</span>
                  <button
                    onClick={() => handleCategoryToggle("voting")}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      settings.categories.voting
                        ? "bg-purple-600"
                        : "bg-gray-600"
                    } relative`}
                  >
                    <span
                      className={`absolute w-4 h-4 rounded-full bg-white transition-transform transform ${
                        settings.categories.voting
                          ? "translate-x-5"
                          : "translate-x-1"
                      } top-0.5`}
                    />
                  </button>
                </div>

                {/* Results Sounds */}
                <div className="flex items-center justify-between bg-slate-800/60 p-3 rounded-md">
                  <span className="text-sm text-white">
                    Results & Transitions
                  </span>
                  <button
                    onClick={() => handleCategoryToggle("results")}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      settings.categories.results
                        ? "bg-purple-600"
                        : "bg-gray-600"
                    } relative`}
                  >
                    <span
                      className={`absolute w-4 h-4 rounded-full bg-white transition-transform transform ${
                        settings.categories.results
                          ? "translate-x-5"
                          : "translate-x-1"
                      } top-0.5`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors"
            >
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
