/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Flower2 } from 'lucide-react';
import { INITIAL_GARDEN_STORIES, SeedType, Story } from './types/garden';
import { subscribeToApprovedStories } from './services/gardenService';
import { soundscape } from './utils/soundscape';
import { LivingGardenCanvas } from './components/LivingGardenCanvas';
import { SeedSelectorDropdown } from './components/SeedSelectorDropdown';
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

  // Select a story and record it in visited history to avoid repeating random stories unnecessarily
  const handleSelectStory = useCallback((story: Story) => {
    visitedStoryIdsRef.current.add(story.storyId);
    setActiveStory(story);
  }, []);

  // Pick a random story that hasn't been read recently
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
    <div className="relative w-full h-screen overflow-hidden select-none">
      {/* 1. Living 3D-like Flower Meadow & Sky Environment */}
      <LivingGardenCanvas
        stories={stories}
        onSelectStory={handleSelectStory}
        highlightedStoryId={highlightedStoryId}
      />

      {/* 2. Minimal Top Navigation Bar (3-Zone Contract) */}
      <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between gap-8 px-5 sm:px-8 py-4">
        {/* Zone 1: Brand Title with Small Flower Icon */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveStory(null);
            setIsWriteModalOpen(false);
            setActiveInfoModal(null);
          }}
          className="inline-flex items-center gap-2 font-editorial text-xl sm:text-2xl font-semibold tracking-tight text-white drop-shadow-sm whitespace-nowrap shrink-0"
        >
          <Flower2 className="w-5 h-5 text-pink-100 shrink-0" />
          <span>Trauma Dumping Ground</span>
        </a>

        {/* Zone 2: Concise Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-6 text-xs sm:text-sm font-medium text-white/95"
        >
          <button
            type="button"
            onClick={() => setActiveInfoModal('about')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer drop-shadow-xs"
          >
            About
          </button>
          <button
            type="button"
            onClick={() => setActiveInfoModal('how-it-works')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer drop-shadow-xs"
          >
            How It Works
          </button>
        </nav>

        {/* Zone 3: Sound Toggle */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={isSoundEnabled ? 'Mute meadow soundscape' : 'Enable meadow soundscape'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/22 hover:bg-white/32 backdrop-blur-md border border-white/35 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isSoundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sound On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 opacity-80" />
                <span className="hidden sm:inline">Sound Off</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 3. Center of the Sky Typography Sanctuary */}
      <main className="pointer-events-none fixed inset-x-0 top-[11%] sm:top-[13%] z-30 flex flex-col items-center text-center px-5">
        <div className="max-w-xl mx-auto space-y-3">
          <h1
            className="font-editorial text-4xl sm:text-5xl md:text-6xl font-semibold text-white tracking-tight leading-[1.08]"
            style={{
              textWrap: 'balance',
              textShadow: '0 4px 24px rgba(32, 92, 138, 0.32)',
            }}
          >
            Every flower holds a story.
          </h1>

          <p
            className="text-sm sm:text-base text-white/95 max-w-md mx-auto leading-relaxed font-normal"
            style={{
              textWrap: 'balance',
              textShadow: '0 2px 12px rgba(28, 84, 128, 0.28)',
            }}
          >
            Some things are too heavy to carry alone. Leave your story here, and let it grow into something beautiful.
          </p>

          <div className="pt-1 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                soundscape.playBloomChord();
                handleReadRandomStory();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/25 hover:bg-white/38 backdrop-blur-md border border-white/45 text-xs sm:text-sm font-medium text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Tap on a flower to discover someone's story.</span>
            </button>
          </div>
        </div>
      </main>

      {/* 4. Right-Side Floating Seed Dropdown */}
      <SeedSelectorDropdown
        selectedSeed={selectedSeed}
        onSelectSeed={setSelectedSeed}
        onOpenWriteModal={() => setIsWriteModalOpen(true)}
      />

      {/* 5. Story Reading Sanctuary Modal */}
      <StoryReaderModal
        story={activeStory}
        onClose={() => setActiveStory(null)}
        onReadAnother={handleReadRandomStory}
        onLocalStoryWarmthIncrement={handleLocalStoryWarmthIncrement}
      />

      {/* 6. Write Your Story & Planting Animation Modal */}
      <WriteStoryModal
        isOpen={isWriteModalOpen}
        selectedSeed={selectedSeed}
        onSelectSeed={setSelectedSeed}
        existingStories={stories}
        onClose={() => setIsWriteModalOpen(false)}
        onStoryPlanted={handleStoryPlanted}
      />

      {/* 7. About & How It Works Modals */}
      <InfoModals
        activeModal={activeInfoModal}
        onClose={() => setActiveInfoModal(null)}
        onStartPlanting={() => setIsWriteModalOpen(true)}
        totalFlowersCount={stories.length}
      />
    </div>
  );
}
