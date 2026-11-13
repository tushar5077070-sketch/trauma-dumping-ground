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

      {/* 2. Top Navigation & Sky Sanctuary Overlay — Responsive Across Mobile, Tablet (Portrait/Landscape) & Laptop */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[52dvh] min-h-[240px] max-h-[520px] z-40 flex flex-col justify-between pb-2 sm:pb-4">
        <header className="pointer-events-auto w-full px-3.5 sm:px-5 md:px-7 lg:px-10 py-2.5 sm:py-3.5 lg:py-4 bg-gradient-to-b from-slate-950/30 via-slate-900/12 to-transparent">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 md:gap-4">
            {/* Top row on mobile / Left side on Tablet & Laptop: Brand + Mobile CTA */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveStory(null);
                  setIsWriteModalOpen(false);
                  setActiveInfoModal(null);
                }}
                className="inline-flex items-center gap-1.5 sm:gap-2 font-editorial text-lg sm:text-lg md:text-xl lg:text-2xl font-semibold tracking-tight text-white drop-shadow-sm whitespace-nowrap shrink-0"
              >
                <Flower2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 lg:w-5 lg:h-5 text-pink-100 shrink-0" />
                <span>Trauma Dumping Ground</span>
              </a>

              {/* Mobile-only Plant CTA on Row 1 right */}
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(true)}
                className="sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-white/25 text-xs font-medium text-white shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
              >
                <Sparkles className="w-3 h-3 text-amber-200 shrink-0" />
                <span>Plant a Seed 🌱</span>
              </button>
            </div>

            {/* Row 2 on mobile / Right side on Tablet & Laptop: Navigation, Sound & Tablet/Desktop CTA */}
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 md:gap-4 lg:gap-6 shrink-0">
              <nav
                aria-label="Primary navigation"
                className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 sm:gap-3 md:gap-4 lg:gap-6 text-xs md:text-sm font-medium text-white/95"
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

              {/* Tablet & Desktop Plant CTA */}
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 md:px-4 py-1.5 md:py-2 rounded-full bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-white/25 text-xs md:text-sm font-medium text-white shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                <span>Plant a Seed 🌱</span>
              </button>
            </div>
          </div>
        </header>

        {/* 3. Center of the Sky Typography Sanctuary — Balanced on Mobile, Tablet & Laptop */}
        <main className="pointer-events-none w-full my-auto flex flex-col items-center justify-center text-center px-4 sm:px-8">
          <div className="max-w-lg sm:max-w-xl md:max-w-2xl mx-auto space-y-1.5 sm:space-y-2.5 lg:space-y-3">
            <h1
              className="font-editorial text-2xl sm:text-4xl md:text-[44px] lg:text-6xl font-semibold text-white tracking-tight leading-[1.08]"
              style={{
                textWrap: 'balance',
                textShadow: '0 4px 24px rgba(32, 92, 138, 0.35)',
              }}
            >
              Every flower holds a story.
            </h1>

            <p
              className="text-xs sm:text-sm md:text-base text-white/95 max-w-md md:max-w-lg mx-auto leading-snug sm:leading-relaxed font-normal"
              style={{
                textWrap: 'balance',
                textShadow: '0 2px 12px rgba(28, 84, 128, 0.32)',
              }}
            >
              Some things are too heavy to carry alone. Leave your story here, and let it grow into something beautiful.
            </p>

            <div className="pt-1 sm:pt-2 pointer-events-auto flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  soundscape.playBloomChord();
                  handleReadRandomStory();
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-full bg-white/25 hover:bg-white/38 backdrop-blur-md border border-white/45 text-xs sm:text-sm font-medium text-white shadow-xs transition-all cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-white shrink-0" />
                <span>Tap on a flower to discover someone's story.</span>
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
