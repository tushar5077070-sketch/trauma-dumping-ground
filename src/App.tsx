/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Volume2,
  VolumeX,
  Flower2,
  Compass,
  LogIn,
  ShieldCheck,
  BookHeart,
  Sprout,
} from 'lucide-react';
import {
  DEFAULT_GARDEN_CUSTOMISATION,
  DiaryEntry,
  GardenCustomisationSettings,
  INITIAL_GARDEN_STORIES,
  InnerJournalEntry,
  InnerPrivacyPrefs,
  InnerReflectionMemory,
  SavedMemory,
  SecretGardenMembership,
  SeedType,
  Story,
  SupportiveMessage,
  VoiceJournal,
} from './types/garden';
import {
  getInitialShuffledStories,
  subscribeToApprovedStories,
} from './services/gardenService';
import {
  ensureUserAccountSynced,
  isVerifiedAdminUser,
  subscribeToAuthState,
} from './services/authAccountService';
import {
  cancelOrExpireMembership,
  hasEffectiveSecretGardenAccess,
  isTrialExpired,
  loadLocalGardenCustomisation,
  saveCommunityStoryMemory,
  saveGardenCustomisationForUser,
  saveLocalGardenCustomisation,
  saveSupportiveReplyMemory,
  subscribeToPersonalDiary,
  subscribeToSavedMemories,
  subscribeToSecretGardenMembership,
  subscribeToVoiceJournals,
} from './services/secretGardenService';
import {
  subscribeToInnerJournalEntries,
  subscribeToInnerPrivacyPrefs,
  subscribeToInnerReflections,
} from './services/innerGardenService';
import { soundscape } from './utils/soundscape';
import { LivingGardenCanvas } from './components/LivingGardenCanvas';
import { WriteStoryModal } from './components/WriteStoryModal';
import { StoryReaderModal } from './components/StoryReaderModal';
import { InfoModals } from './components/InfoModals';
import { AccountModal } from './components/AccountModal';
import { AdminBackendModal } from './components/AdminBackendModal';
import { MySpaceModal } from './components/MySpaceModal';
import { SecretGardenUpgradeModal } from './components/SecretGardenUpgradeModal';
import { InnerGardenModal } from './components/InnerGardenModal';

export default function App() {
  const [stories, setStories] = useState<Story[]>(() =>
    getInitialShuffledStories()
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

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isMySpaceOpen, setIsMySpaceOpen] = useState(false);
  const [isInnerGardenOpen, setIsInnerGardenOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeFocusFeature, setUpgradeFocusFeature] = useState<string | null>(
    null
  );

  const [secretMembership, setSecretMembership] =
    useState<SecretGardenMembership | null>(null);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [voiceJournals, setVoiceJournals] = useState<VoiceJournal[]>([]);
  const [memories, setMemories] = useState<SavedMemory[]>([]);
  const [innerEntries, setInnerEntries] = useState<InnerJournalEntry[]>([]);
  const [innerReflections, setInnerReflections] = useState<
    InnerReflectionMemory[]
  >([]);
  const [innerPrivacyPrefs, setInnerPrivacyPrefs] =
    useState<InnerPrivacyPrefs | null>(null);
  const [localCustomisation, setLocalCustomisation] =
    useState<GardenCustomisationSettings>(() => loadLocalGardenCustomisation());

  const visitedStoryIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = subscribeToApprovedStories((loadedStories) => {
      setStories(loadedStories);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthState((user) => {
      setCurrentUser(user);
      if (user) {
        ensureUserAccountSynced(user).catch(() => {});
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const isAdmin = isVerifiedAdminUser(currentUser);
  const hasPremiumAccess = hasEffectiveSecretGardenAccess(
    secretMembership,
    isAdmin
  );

  useEffect(() => {
    if (!currentUser) {
      setSecretMembership(null);
      setDiaryEntries([]);
      setVoiceJournals([]);
      setMemories([]);
      setInnerEntries([]);
      setInnerReflections([]);
      setInnerPrivacyPrefs(null);
      return;
    }

    const unsubMembership = subscribeToSecretGardenMembership(
      currentUser.uid,
      (m) => {
        setSecretMembership(m);
        if (m && isTrialExpired(m)) {
          cancelOrExpireMembership(currentUser.uid, 'expired').catch(() => {});
        }
      },
      () => {}
    );

    const unsubDiary = subscribeToPersonalDiary(
      currentUser.uid,
      setDiaryEntries,
      () => {}
    );
    const unsubVoice = subscribeToVoiceJournals(
      currentUser.uid,
      setVoiceJournals,
      () => {}
    );
    const unsubMemories = subscribeToSavedMemories(
      currentUser.uid,
      setMemories,
      () => {}
    );
    const unsubInnerEntries = subscribeToInnerJournalEntries(
      currentUser.uid,
      setInnerEntries,
      () => {}
    );
    const unsubInnerReflections = subscribeToInnerReflections(
      currentUser.uid,
      setInnerReflections,
      () => {}
    );
    const unsubInnerPrefs = subscribeToInnerPrivacyPrefs(
      currentUser.uid,
      setInnerPrivacyPrefs,
      () => {}
    );

    return () => {
      unsubMembership();
      unsubDiary();
      unsubVoice();
      unsubMemories();
      unsubInnerEntries();
      unsubInnerReflections();
      unsubInnerPrefs();
    };
  }, [currentUser]);

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

  const activeGardenCustomisation: GardenCustomisationSettings = useMemo(() => {
    if (!hasPremiumAccess) {
      return DEFAULT_GARDEN_CUSTOMISATION;
    }
    if (currentUser && secretMembership) {
      return {
        gardenTheme: secretMembership.gardenTheme || 'meadow',
        gardenBackground: secretMembership.gardenBackground || 'classic_sky',
        gardenEffect: secretMembership.gardenEffect || 'breeze',
        exclusiveFloraPreset: secretMembership.exclusiveFloraPreset || 'classic',
      };
    }
    return localCustomisation;
  }, [hasPremiumAccess, currentUser, secretMembership, localCustomisation]);

  const savedMemorySourceIds = useMemo(
    () => new Set(memories.map((m) => m.sourceId)),
    [memories]
  );

  const handleUpdateCustomisation = async (
    next: GardenCustomisationSettings
  ) => {
    saveLocalGardenCustomisation(next);
    setLocalCustomisation(next);
    if (currentUser) {
      await saveGardenCustomisationForUser(
        currentUser.uid,
        next,
        hasPremiumAccess,
        secretMembership
      );
    }
  };

  const handleOpenUpgrade = (featureName?: string) => {
    setUpgradeFocusFeature(featureName || null);
    setIsUpgradeModalOpen(true);
  };

  const handleSaveStoryToMemory = async (story: Story) => {
    if (!currentUser) {
      setIsAccountModalOpen(true);
      return;
    }
    if (!hasPremiumAccess) {
      handleOpenUpgrade('My Memories');
      return;
    }
    await saveCommunityStoryMemory(currentUser.uid, story, 'Quiet Comfort');
  };

  const handleSaveMessageToMemory = async (
    msg: SupportiveMessage,
    story: Story
  ) => {
    if (!currentUser) {
      setIsAccountModalOpen(true);
      return;
    }
    if (!hasPremiumAccess) {
      handleOpenUpgrade('My Memories');
      return;
    }
    await saveSupportiveReplyMemory(
      currentUser.uid,
      msg,
      story.flowerVariant,
      'Kind Words'
    );
  };

  const firstName =
    currentUser?.displayName?.trim().split(/\s+/)[0] ||
    currentUser?.email?.split('@')[0] ||
    'Account';

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden select-none">
      {/* 1. Living 3D-like Flower Meadow & Sky Environment */}
      <LivingGardenCanvas
        stories={stories}
        onSelectStory={handleSelectStory}
        highlightedStoryId={highlightedStoryId}
        gardenCustomisation={activeGardenCustomisation}
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
                className="inline-flex items-center gap-1.5 sm:gap-2 font-editorial text-xl sm:text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight text-white drop-shadow-sm whitespace-nowrap shrink-0"
              >
                <Flower2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 lg:w-5 lg:h-5 text-pink-100 shrink-0" />
                <span>Unsaid</span>
              </a>

              {/* Mobile-only Plant CTA on Row 1 right */}
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(true)}
                className="sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-white/25 text-xs font-medium text-white shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
              >
                <span>Plant a Seed 🌱</span>
              </button>
            </div>

            {/* Row 2 on mobile / Right side on Tablet & Laptop: Navigation, Sound, Auth & Tablet/Desktop CTA */}
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 md:gap-4 lg:gap-5 shrink-0">
              <nav
                aria-label="Primary navigation"
                className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end w-full sm:w-auto gap-1.5 min-[400px]:gap-2 sm:gap-2.5 md:gap-4 lg:gap-5 text-xs md:text-sm font-medium text-white/95"
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
                  onClick={() => setIsInnerGardenOpen(true)}
                  className="inline-flex items-center gap-1.5 py-1 px-2 sm:px-2.5 rounded-full bg-emerald-100/22 hover:bg-emerald-100/35 border border-emerald-100/45 text-white transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs"
                  title="Open your private My Inner Garden"
                >
                  <Sprout className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                  <span>My Inner Garden</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMySpaceOpen(true)}
                  className="inline-flex items-center gap-1.5 py-1 px-2 sm:px-2.5 rounded-full bg-rose-100/20 hover:bg-rose-100/35 border border-rose-100/40 text-white transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs"
                  title="Open your private My Space"
                >
                  <BookHeart className="w-3.5 h-3.5 text-rose-100 shrink-0" />
                  <span>My Space</span>
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
                      <span className="hidden min-[400px]:inline sm:hidden lg:inline text-xs">
                        Sound On
                      </span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 opacity-90 shrink-0" />
                      <span className="hidden min-[400px]:inline sm:hidden lg:inline text-xs">
                        Sound Off
                      </span>
                    </>
                  )}
                </button>

                {/* Sign In / Account Button */}
                {currentUser ? (
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(true)}
                    className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full bg-white/25 hover:bg-white/35 border border-white/40 text-xs font-medium text-white transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs"
                    title="View account and subscription plan"
                  >
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={firstName}
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 rounded-full object-cover border border-white/70 shrink-0"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-slate-900/80 text-[10px] font-semibold flex items-center justify-center shrink-0">
                        {firstName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="max-w-[72px] truncate">{firstName}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/22 hover:bg-white/35 border border-white/40 text-xs font-medium text-white transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5 shrink-0" />
                    <span>Sign In</span>
                  </button>
                )}

                {/* Admin Backend Console Trigger */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsAdminModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/90 hover:bg-amber-300 text-slate-950 border border-amber-200 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Backend</span>
                  </button>
                )}
              </nav>

              {/* Tablet & Desktop Plant CTA */}
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-white/25 text-xs md:text-sm font-medium text-white shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
              >
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
              Some feelings deserve a place.
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
        canSaveMemories={Boolean(currentUser && hasPremiumAccess)}
        savedSourceIds={savedMemorySourceIds}
        onSaveStoryToMemory={handleSaveStoryToMemory}
        onSaveMessageToMemory={handleSaveMessageToMemory}
        onRequestUnlockMemories={() => {
          if (!currentUser) {
            setIsAccountModalOpen(true);
          } else {
            handleOpenUpgrade('My Memories');
          }
        }}
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

      {/* 7. Google Sign-In & Member Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        currentUser={currentUser}
        secretGardenMembership={secretMembership}
        onClose={() => setIsAccountModalOpen(false)}
        onOpenAdminConsole={() => setIsAdminModalOpen(true)}
        onOpenMySpace={() => setIsMySpaceOpen(true)}
      />

      {/* 8. Admin Backend Logins & Subscriptions Console */}
      <AdminBackendModal
        isOpen={isAdminModalOpen}
        currentUser={currentUser}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {/* 9. My Space Personal Sanctuary Dashboard & Five Premium Features */}
      <MySpaceModal
        isOpen={isMySpaceOpen}
        currentUser={currentUser}
        membership={secretMembership}
        hasPremiumAccess={hasPremiumAccess}
        isAdmin={isAdmin}
        diaryEntries={diaryEntries}
        voiceJournals={voiceJournals}
        memories={memories}
        gardenCustomisation={activeGardenCustomisation}
        onUpdateCustomisation={handleUpdateCustomisation}
        onOpenUpgrade={handleOpenUpgrade}
        onClose={() => setIsMySpaceOpen(false)}
      />

      {/* 10. The Secret Garden Freemium & Trial Upgrade Modal */}
      <SecretGardenUpgradeModal
        isOpen={isUpgradeModalOpen}
        currentUser={currentUser}
        membership={secretMembership}
        initialFocusFeature={upgradeFocusFeature}
        onClose={() => {
          setIsUpgradeModalOpen(false);
          setUpgradeFocusFeature(null);
        }}
      />

      {/* 11. My Inner Garden — AI Voice Journaling, Memory & Emotional Patterns */}
      <InnerGardenModal
        isOpen={isInnerGardenOpen}
        currentUser={currentUser}
        entries={innerEntries}
        reflections={innerReflections}
        prefs={innerPrivacyPrefs}
        onClose={() => setIsInnerGardenOpen(false)}
      />
    </div>
  );
}
