/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Flower2, Sparkles, Compass } from 'lucide-react';
import { INITIAL_GARDEN_STORIES, SeedType, Story } from './types/garden';
import { subscribeToApprovedStories } from './services/gardenService';
import { soundscape } from './utils/soundscape';
import { LivingGardenCanvas } from './components/LivingGardenCanvas';
import { WriteStoryModal } from './components/WriteStoryModal';
import { StoryReaderModal } from './components/StoryReaderModal';
import { InfoModals } from './components/InfoModals';

export default function App() {
  const [stories, setStories] = useState<Story[]>(() =>
    INITIAL_GARDEN_STORIES.map((s, idx) => ({
      ...s,
      createdAt: new Date(Date.now() - (idx + 1) * 3600 * 1000 * 4),
      updatedAt: new Date(Date.now() - (idx + 1) * 3600 * 1000 * 4),
    }))
  );
  const [selectedSeed, setSelectedSeed] = useState<SeedType>('daisy');
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [activeInfoModal, setActiveInfoModal] = useState<
    'about' | 'how-it-works' | null
  >(null);
  const [highlightedStoryId, setHighlightedStoryId] = useState<string | null>(
    null
  );
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);

  const visitedStoryIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = subscribeToApprovedStories((loadedStories) => {
      setStories(loadedStories);
    });
    return () => unsubscribe();
  }, []);

  const handleSelectStory = useCallback((story: Story) => {
    visitedStoryIdsRef.current.add(story.storyId);
    setActiveStory(story);
  }, []);

  const handleReadRandomStory = useCallback(() => {
    if (stories.length === 0) return;
    const currentId = activeStory?.storyId;
    let pool = stories.filter(
      (s) => !visitedStoryIdsRef.current.has(s.storyId) && s.storyId !== currentId
    );
    if (pool.length === 0) {
      visitedStoryIdsRef.current.clear();
      pool = stories.filter((s) => s.storyId !== currentId);
      if (pool.length === 0) pool = stories;
    }
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    visitedStoryIdsRef.current.add(chosen.storyId);
    setActiveStory(chosen);
  }, [stories, activeStory]);

  const handleStoryPlanted = useCallback((newStory: Story) => {
    setStories((prev) => {
      if (prev.some((s) => s.storyId === newStory.storyId)) return prev;
      return [newStory, ...prev];
    });
    setHighlightedStoryId(newStory.storyId);
    setTimeout(() => {
      setHighlightedStoryId((curr) =>
        curr === newStory.storyId ? null : curr
      );
    }, 14000);
  }, []);

  const handleLocalStoryWarmthIncrement = useCallback((storyId: string) => {
    setStories((prev) =>
      prev.map((s) =>
        s.storyId === storyId ? { ...s, warmthCount: s.warmthCount + 1 } : s
      )
    );
  }, []);

  const handleToggleSound = () => {
    const nextState = soundscape.toggle();
    setIsSoundEnabled(nextState);
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden select-none">
      {/* 1. Living 3D-like Flower Meadow & Sky Environment */}
      <LivingGardenCanvas
        stories={stories}
        onSelectStory={handleSelectStory}
        highlightedStoryId={highlightedStoryId}
      />

      {/* 2. Top Navigation & Sky Sanctuary Overlay — Uncompressed & Fully Visible Across All Devices */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex flex-col">
        <header className="pointer-events-auto w-full flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3.5 sm:px-6 md:px-8 py-2.5 sm:py-4 bg-gradient-to-b from-slate-950/28 via-slate-900/12 to-transparent">
          {/* Zone 1: Full Brand Title (Never truncated on any device) */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveStory(null);
              setIsWriteModalOpen(false);
              setActiveInfoModal(null);
            }}
            className="inline-flex items-center gap-2 font-editorial text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-white drop-shadow-sm shrink-0"
          >
            <Flower2 className="w-4 h-4 sm:w-5 sm:h-5 text-pink-100 shrink-0" />
            <span>Trauma Dumping Ground</span>
          </a>

          {/* Zone 2 & 3: All Navigation Links, Sound Toggle & Plant CTA Visible in Full */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-x-3 sm:gap-x-5 gap-y-1.5 w-full sm:w-auto">
            <nav
              aria-label="Primary navigation"
              className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm font-medium text-white/95"
            >
              <button
                type="button"
                onClick={() => setActiveInfoModal('about')}
                className="py-1 hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => setActiveInfoModal('how-it-works')}
                className="py-1 hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={handleToggleSound}
                aria-label={
                  isSoundEnabled
                    ? 'Mute meadow soundscape'
                    : 'Enable meadow soundscape'
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 border border-white/35 transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs"
              >
                {isSoundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs">Sound On</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 opacity-90 shrink-0" />
                    <span className="text-xs">Sound Off</span>
                  </>
                )}
              </button>
            </nav>

            <button
              type="button"
              onClick={() => setIsWriteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-white/25 text-xs sm:text-sm font-medium text-white shadow-sm transition-all whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
              <span>Plant a Seed 🌱</span>
            </button>
          </div>
        </header>

        {/* 3. Center of the Sky Typography Sanctuary — Adapts Cleanly to Portrait, Landscape & Desktop */}
        <main className="pointer-events-none w-full flex flex-col items-center text-center px-4 pt-1 sm:pt-4 md:pt-7">
          <div className="max-w-xl mx-auto space-y-1.5 sm:space-y-3">
            <h1
              className="font-editorial text-3xl sm:text-5xl md:text-6xl font-semibold text-white tracking-tight leading-[1.08]"
              style={{
                textWrap: 'balance',
                textShadow: '0 4px 24px rgba(32, 92, 138, 0.35)',
              }}
            >
              Every flower holds a story.
            </h1>

            <p
              className="text-xs sm:text-sm md:text-base text-white/95 max-w-md mx-auto leading-snug sm:leading-relaxed font-normal"
              style={{
                textWrap: 'balance',
                textShadow: '0 2px 12px rgba(28, 84, 128, 0.32)',
              }}
            >
              Some things are too heavy to carry alone. Leave your story here, and let it grow into something beautiful.
            </p>

            <div className="pt-1 sm:pt-2 pointer-events-auto flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  soundscape.playBloomChord();
                  handleReadRandomStory();
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/25 hover:bg-white/38 backdrop-blur-md border border-white/45 text-xs sm:text-sm font-medium text-white shadow-xs transition-all cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-white shrink-0" />
                <span>Tap on a flower to discover someone's story.</span>
              </button>

              <button
                type="button"
                onClick={() => setIsWriteModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/92 hover:bg-white text-slate-900 text-xs sm:text-sm font-medium shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Plant a Seed 🌱</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* 4. Story Reading Sanctuary Modal */}
      <StoryReaderModal
        story={activeStory}
        onClose={() => setActiveStory(null)}
        onReadAnother={handleReadRandomStory}
        onLocalStoryWarmthIncrement={handleLocalStoryWarmthIncrement}
      />

      {/* 5. Write Your Story & Planting Animation Modal */}
      <WriteStoryModal
        isOpen={isWriteModalOpen}
        selectedSeed={selectedSeed}
        onSelectSeed={setSelectedSeed}
        existingStories={stories}
        onClose={() => setIsWriteModalOpen(false)}
        onStoryPlanted={handleStoryPlanted}
      />

      {/* 6. About & How It Works Modals */}
      <InfoModals
        activeModal={activeInfoModal}
        onClose={() => setActiveInfoModal(null)}
        onStartPlanting={() => setIsWriteModalOpen(true)}
        totalFlowersCount={stories.length}
      />
    </div>
  );
}
