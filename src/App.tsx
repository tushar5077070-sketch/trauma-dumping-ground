/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Bell,
  Flower2,
  Compass,
  LogIn,
  ShieldCheck,
  BookHeart,
  Sprout,
  Heart,
  X,
} from 'lucide-react';
import {
  AMBIENT_MEADOW_FLOWERS,
  AmbientMeadowFlower,
  DEFAULT_GARDEN_CUSTOMISATION,
  DiaryEntry,
  GardenCustomisationSettings,
  InnerJournalEntry,
  InnerPrivacyPrefs,
  InnerReflectionMemory,
  KindMessageNotification,
  NotificationReadState,
  PlantedStoryReceipt,
  SavedMemory,
  SecretGardenMembership,
  SeedType,
  Story,
  SupportiveMessage,
  VoiceJournal,
} from './types/garden';
import {
  subscribeToApprovedStories,
  subscribeToOwnPlantedStories,
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
import {
  isNotificationRead,
  persistNotificationReadState,
  subscribeToNotificationReadState,
  subscribeToOwnStoryKindMessages,
} from './services/notificationService';
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
import { NotificationsModal } from './components/NotificationsModal';
import {
  PrivacyTrustModal,
  PrivacyTrustTab,
} from './components/PrivacyTrustModal';

export default function App() {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedSeed, setSelectedSeed] = useState<SeedType>('daisy');
  const [targetAmbientFlower, setTargetAmbientFlower] =
    useState<AmbientMeadowFlower | null>(null);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [activeInfoModal, setActiveInfoModal] = useState<
    'about' | 'how-it-works' | null
  >(null);
  const [highlightedStoryId, setHighlightedStoryId] = useState<string | null>(
    null
  );

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'users' | 'stories'>(
    'users'
  );
  const [isMySpaceOpen, setIsMySpaceOpen] = useState(false);
  const [isInnerGardenOpen, setIsInnerGardenOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeFocusFeature, setUpgradeFocusFeature] = useState<string | null>(
    null
  );
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [privacyModalTab, setPrivacyModalTab] =
    useState<PrivacyTrustTab>('overview');

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
  const [ownPlantedStories, setOwnPlantedStories] = useState<
    PlantedStoryReceipt[]
  >([]);
  const [kindNotifications, setKindNotifications] = useState<
    KindMessageNotification[]
  >([]);
  const [notificationReadState, setNotificationReadState] =
    useState<NotificationReadState>({
      lastReadAtMs: 0,
      readMessageIds: [],
      existsInCloud: false,
    });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [liveToastNotification, setLiveToastNotification] =
    useState<KindMessageNotification | null>(null);
  const [localCustomisation, setLocalCustomisation] =
    useState<GardenCustomisationSettings>(() => loadLocalGardenCustomisation());

  const visitedStoryIdsRef = useRef<Set<string>>(new Set());
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const notificationsInitializedRef = useRef<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);
  const notificationReadStateRef = useRef<NotificationReadState>(
    notificationReadState
  );

  useEffect(() => {
    notificationReadStateRef.current = notificationReadState;
  }, [notificationReadState]);

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
      setOwnPlantedStories([]);
      setKindNotifications([]);
      setNotificationReadState({
        lastReadAtMs: 0,
        readMessageIds: [],
        existsInCloud: false,
      });
      setLiveToastNotification(null);
      seenNotificationIdsRef.current.clear();
      notificationsInitializedRef.current = false;
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
    const unsubOwnPlanted = subscribeToOwnPlantedStories(
      currentUser.uid,
      setOwnPlantedStories,
      () => {}
    );
    const unsubNotifReadState = subscribeToNotificationReadState(
      currentUser.uid,
      setNotificationReadState
    );

    return () => {
      unsubMembership();
      unsubDiary();
      unsubVoice();
      unsubMemories();
      unsubInnerEntries();
      unsubInnerReflections();
      unsubInnerPrefs();
      unsubOwnPlanted();
      unsubNotifReadState();
    };
  }, [currentUser]);

  // Subscribe in real time to kind messages arriving on any flower planted by the signed-in user
  useEffect(() => {
    if (!currentUser || ownPlantedStories.length === 0) {
      setKindNotifications([]);
      return;
    }

    const unsub = subscribeToOwnStoryKindMessages(
      ownPlantedStories,
      stories,
      (merged, initialLoadComplete) => {
        setKindNotifications(merged);

        if (!notificationsInitializedRef.current) {
          for (const item of merged) {
            seenNotificationIdsRef.current.add(item.messageId);
          }
          if (initialLoadComplete) {
            notificationsInitializedRef.current = true;
          }
          return;
        }

        // Detect brand-new kind message arriving live while the user is in the garden
        const brandNew = merged.find(
          (item) =>
            !seenNotificationIdsRef.current.has(item.messageId) &&
            !isNotificationRead(item, notificationReadStateRef.current)
        );
        for (const item of merged) {
          seenNotificationIdsRef.current.add(item.messageId);
        }

        if (brandNew) {
          soundscape.playBloomChord();
          setLiveToastNotification(brandNew);
          if (toastTimerRef.current) {
            window.clearTimeout(toastTimerRef.current);
          }
          toastTimerRef.current = window.setTimeout(() => {
            setLiveToastNotification((curr) =>
              curr?.messageId === brandNew.messageId ? null : curr
            );
          }, 9000);
        }
      }
    );

    return () => {
      unsub();
    };
  }, [currentUser, ownPlantedStories, stories]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const openPrivacyTrustModal = useCallback(
    (tab: PrivacyTrustTab = 'overview') => {
      setPrivacyModalTab(tab);
      setIsPrivacyModalOpen(true);
    },
    []
  );

  const markMessagesRead = useCallback(
    (messageIds: string[]) => {
      if (!currentUser || messageIds.length === 0) return;
      const prev = notificationReadStateRef.current;
      const missing = messageIds.filter((id) => !prev.readMessageIds.includes(id));
      if (missing.length === 0) return;

      const next: NotificationReadState = {
        ...prev,
        readMessageIds: Array.from(
          new Set([...missing, ...prev.readMessageIds])
        ).slice(0, 180),
      };
      setNotificationReadState(next);
      persistNotificationReadState(currentUser.uid, next).then((saved) => {
        setNotificationReadState(saved);
      });
    },
    [currentUser]
  );

  const handleMarkAllNotificationsRead = useCallback(() => {
    if (!currentUser) return;
    const prev = notificationReadStateRef.current;
    const latestMsgTime = kindNotifications.reduce(
      (max, item) => Math.max(max, item.createdAt.getTime()),
      Date.now()
    );
    const next: NotificationReadState = {
      ...prev,
      lastReadAtMs: Math.max(Date.now(), latestMsgTime),
      readMessageIds: Array.from(
        new Set([
          ...kindNotifications.map((n) => n.messageId),
          ...prev.readMessageIds,
        ])
      ).slice(0, 180),
    };
    setNotificationReadState(next);
    persistNotificationReadState(currentUser.uid, next).then((saved) => {
      setNotificationReadState(saved);
    });
  }, [currentUser, kindNotifications]);

  const handleSelectStory = useCallback(
    (story: Story) => {
      visitedStoryIdsRef.current.add(story.storyId);
      setActiveStory(story);
      // Automatically mark unread kind messages on this flower as read when opened
      const storyUnreadIds = kindNotifications
        .filter(
          (n) =>
            n.storyId === story.storyId &&
            !isNotificationRead(n, notificationReadStateRef.current)
        )
        .map((n) => n.messageId);
      if (storyUnreadIds.length > 0) {
        markMessagesRead(storyUnreadIds);
      }
    },
    [kindNotifications, markMessagesRead]
  );

  const handleOpenNotification = useCallback(
    (notification: KindMessageNotification) => {
      markMessagesRead([notification.messageId]);
      setIsNotificationsOpen(false);
      setLiveToastNotification((curr) =>
        curr?.messageId === notification.messageId ? null : curr
      );
      const liveStory = stories.find((s) => s.storyId === notification.storyId);
      if (liveStory) {
        visitedStoryIdsRef.current.add(liveStory.storyId);
        setActiveStory(liveStory);
      }
    },
    [markMessagesRead, stories]
  );

  const unreadNotificationCount = useMemo(
    () =>
      kindNotifications.filter(
        (n) => !isNotificationRead(n, notificationReadState)
      ).length,
    [kindNotifications, notificationReadState]
  );

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

  const handleStoryPlanted = useCallback(
    (newStory: Story) => {
      setStories((prev) => {
        if (prev.some((s) => s.storyId === newStory.storyId)) return prev;
        return [newStory, ...prev];
      });
      if (currentUser) {
        setOwnPlantedStories((prev) => {
          if (prev.some((r) => r.storyId === newStory.storyId)) return prev;
          return [
            {
              storyId: newStory.storyId,
              userId: currentUser.uid,
              seedType: newStory.seedType,
              flowerVariant: newStory.flowerVariant,
              preview: newStory.content.slice(0, 140),
              createdAt: newStory.createdAt,
            },
            ...prev,
          ];
        });
      }
      setHighlightedStoryId(newStory.storyId);
      setTimeout(() => {
        setHighlightedStoryId((curr) =>
          curr === newStory.storyId ? null : curr
        );
      }, 14000);
    },
    [currentUser]
  );

  const handleLocalStoryWarmthIncrement = useCallback((storyId: string) => {
    setStories((prev) =>
      prev.map((s) =>
        s.storyId === storyId ? { ...s, warmthCount: s.warmthCount + 1 } : s
      )
    );
  }, []);

  const handleStoryDeleted = useCallback((storyId: string) => {
    setStories((prev) => prev.filter((s) => s.storyId !== storyId));
    setOwnPlantedStories((prev) => prev.filter((r) => r.storyId !== storyId));
    setActiveStory((curr) => (curr?.storyId === storyId ? null : curr));
  }, []);

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

  const ownPlantedStoryIds = useMemo(
    () => new Set(ownPlantedStories.map((r) => r.storyId)),
    [ownPlantedStories]
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

  const handleSelectEmptyFlower = useCallback((flower: AmbientMeadowFlower) => {
    setSelectedSeed(flower.seedType);
    setTargetAmbientFlower(flower);
    setIsWriteModalOpen(true);
  }, []);

  const handleOpenGeneralPlanting = useCallback(() => {
    setTargetAmbientFlower(null);
    setIsWriteModalOpen(true);
  }, []);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden select-none">
      {/* 1. Living 3D-like Flower Meadow & Sky Environment */}
      <LivingGardenCanvas
        stories={stories}
        onSelectStory={handleSelectStory}
        onSelectEmptyFlower={handleSelectEmptyFlower}
        highlightedStoryId={highlightedStoryId}
        gardenCustomisation={activeGardenCustomisation}
      />

      {/* 2. Top Navigation & Sky Sanctuary Overlay — Responsive Across Mobile, Tablet (Portrait/Landscape) & Laptop */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[52dvh] min-h-[240px] max-h-[520px] z-40 flex flex-col justify-between pb-2 sm:pb-4">
        <header className="pointer-events-auto w-full px-3 sm:px-5 md:px-7 lg:px-10 py-2.5 sm:py-3.5 lg:py-4 bg-gradient-to-b from-slate-950/30 via-slate-900/12 to-transparent">
          {/* Mobile & Tablet Header (< lg / 1024px): Row 1 has Brand + About, How It Works, Privacy, Gmail/Sign In; Row 2 below has My Inner Garden, My Space & Plant a Seed */}
          <div className="lg:hidden max-w-7xl mx-auto flex flex-col gap-2 sm:gap-2.5">
            {/* Row 1: Brand on left + About, How It Works, Privacy & Gmail/Account on right */}
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveStory(null);
                  setIsWriteModalOpen(false);
                  setActiveInfoModal(null);
                }}
                className="inline-flex items-center gap-1 sm:gap-1.5 font-editorial text-lg min-[400px]:text-xl sm:text-2xl font-semibold tracking-tight text-white drop-shadow-sm whitespace-nowrap shrink-0"
              >
                <Flower2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-pink-100 shrink-0" />
                <span>Unsaid</span>
              </a>

              <nav
                aria-label="Primary mobile and tablet navigation"
                className="flex items-center justify-end gap-2 min-[400px]:gap-2.5 sm:gap-4 text-[11px] min-[400px]:text-xs sm:text-sm font-medium text-white/95 min-w-0"
              >
                <button
                  type="button"
                  onClick={() => setActiveInfoModal('about')}
                  className="py-1 hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs shrink-0"
                >
                  About
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInfoModal('how-it-works')}
                  className="py-1 hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs shrink-0"
                >
                  How It Works
                </button>
                <button
                  type="button"
                  onClick={() => openPrivacyTrustModal('overview')}
                  className="inline-flex items-center gap-1 py-1 hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs shrink-0"
                  title="Inspect Unsaid Privacy & Data Ownership"
                >
                  <ShieldCheck className="hidden sm:inline w-3.5 h-3.5 text-emerald-100 shrink-0" />
                  <span>Privacy</span>
                </button>

                {/* Notifications Bell (Signed-in Users) */}
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(true)}
                    aria-label={
                      unreadNotificationCount > 0
                        ? `Notifications (${unreadNotificationCount} unread)`
                        : 'Notifications'
                    }
                    title="Kind messages on your flowers"
                    className="relative inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/22 hover:bg-white/35 border border-white/40 text-white transition-colors cursor-pointer drop-shadow-xs shrink-0"
                  >
                    <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {unreadNotificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-sky-400/70 shadow-xs tabular-nums">
                        {unreadNotificationCount > 9
                          ? '9+'
                          : unreadNotificationCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Gmail / Account Button */}
                {currentUser ? (
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(true)}
                    className="inline-flex items-center gap-1 sm:gap-1.5 pl-0.5 sm:pl-1 pr-2 sm:pr-2.5 py-0.5 rounded-full bg-white/25 hover:bg-white/35 border border-white/40 text-[11px] sm:text-xs font-medium text-white transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs shrink-0"
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
                    <span className="max-w-[54px] sm:max-w-[96px] truncate">
                      {firstName}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(true)}
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-white/22 hover:bg-white/35 border border-white/40 text-[11px] sm:text-xs font-medium text-white transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs shrink-0"
                  >
                    <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span>Sign In</span>
                  </button>
                )}
              </nav>
            </div>

            {/* Row 2 directly below: My Inner Garden, My Space & Plant a Seed CTA */}
            <div className="flex flex-wrap items-center justify-end gap-1.5 min-[400px]:gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => setIsInnerGardenOpen(true)}
                className="inline-flex items-center gap-1 sm:gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-full bg-emerald-100/22 hover:bg-emerald-100/35 border border-emerald-100/45 text-[11px] min-[400px]:text-xs font-medium text-white transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs shrink-0"
                title="Open your private My Inner Garden"
              >
                <Sprout className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                <span>My Inner Garden</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMySpaceOpen(true)}
                className="inline-flex items-center gap-1 sm:gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-full bg-rose-100/22 hover:bg-rose-100/35 border border-rose-100/45 text-[11px] min-[400px]:text-xs font-medium text-white transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs shrink-0"
                title="Open your private My Space"
              >
                <BookHeart className="w-3.5 h-3.5 text-rose-100 shrink-0" />
                <span>My Space</span>
              </button>

              <button
                type="button"
                onClick={handleOpenGeneralPlanting}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-white/25 text-[11px] min-[400px]:text-xs font-medium text-white shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
              >
                <span>Plant a Seed 🌱</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-400/90 hover:bg-amber-300 text-slate-950 border border-amber-200 text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer shadow-xs shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Backend</span>
                </button>
              )}
            </div>
          </div>

          {/* Desktop Header (lg / 1024px and up): Clean single-row navigation without audio control */}
          <div className="hidden lg:flex max-w-7xl mx-auto items-center justify-between gap-3 xl:gap-5">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setActiveStory(null);
                setIsWriteModalOpen(false);
                setActiveInfoModal(null);
              }}
              className="inline-flex items-center gap-2 font-editorial text-2xl xl:text-3xl font-semibold tracking-tight text-white drop-shadow-sm whitespace-nowrap shrink-0"
            >
              <Flower2 className="w-5 h-5 text-pink-100 shrink-0" />
              <span>Unsaid</span>
            </a>

            <div className="flex items-center justify-end gap-2.5 xl:gap-4 shrink-0">
              <nav
                aria-label="Primary navigation"
                className="flex items-center justify-end gap-2.5 xl:gap-4 text-xs xl:text-sm font-medium text-white/95"
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
                  onClick={() => openPrivacyTrustModal('overview')}
                  className="inline-flex items-center gap-1 py-1 hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs shrink-0"
                  title="Inspect Unsaid Privacy & Data Ownership"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                  <span>Privacy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsInnerGardenOpen(true)}
                  className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-emerald-100/22 hover:bg-emerald-100/35 border border-emerald-100/45 text-white transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs"
                  title="Open your private My Inner Garden"
                >
                  <Sprout className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                  <span>My Inner Garden</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMySpaceOpen(true)}
                  className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-rose-100/20 hover:bg-rose-100/35 border border-rose-100/40 text-white transition-colors whitespace-nowrap cursor-pointer drop-shadow-xs"
                  title="Open your private My Space"
                >
                  <BookHeart className="w-3.5 h-3.5 text-rose-100 shrink-0" />
                  <span>My Space</span>
                </button>

                {/* Desktop Notifications Bell (Signed-in Users) */}
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(true)}
                    aria-label={
                      unreadNotificationCount > 0
                        ? `Notifications (${unreadNotificationCount} unread)`
                        : 'Notifications'
                    }
                    title="Kind messages on your flowers"
                    className="relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/22 hover:bg-white/35 border border-white/40 text-white transition-colors cursor-pointer drop-shadow-xs shrink-0"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-sky-400/70 shadow-xs tabular-nums">
                        {unreadNotificationCount > 9
                          ? '9+'
                          : unreadNotificationCount}
                      </span>
                    )}
                  </button>
                )}

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
                onClick={handleOpenGeneralPlanting}
                className="inline-flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-white/25 text-xs md:text-sm font-medium text-white shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
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
                  if (stories.length > 0) {
                    handleReadRandomStory();
                  } else {
                    handleOpenGeneralPlanting();
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-full bg-white/25 hover:bg-white/38 backdrop-blur-md border border-white/45 text-xs sm:text-sm font-medium text-white shadow-xs transition-all cursor-pointer"
              >
                {stories.length > 0 ? (
                  <>
                    <Compass className="w-3.5 h-3.5 text-white shrink-0" />
                    <span>Tap a glowing flower to read a story, or pick any bloom to plant yours.</span>
                  </>
                ) : (
                  <>
                    <Sprout className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                    <span>Tap any flower below to plant the first story in this meadow.</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* 4. Story Reading Sanctuary Modal */}
      <StoryReaderModal
        story={activeStory}
        isAdmin={isAdmin}
        isAuthor={Boolean(activeStory && ownPlantedStoryIds.has(activeStory.storyId))}
        onClose={() => setActiveStory(null)}
        onReadAnother={handleReadRandomStory}
        onLocalStoryWarmthIncrement={handleLocalStoryWarmthIncrement}
        onStoryDeleted={handleStoryDeleted}
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
        currentUser={currentUser}
        selectedSeed={selectedSeed}
        onSelectSeed={setSelectedSeed}
        existingStories={stories}
        targetFlower={targetAmbientFlower}
        onClose={() => {
          setIsWriteModalOpen(false);
          setTargetAmbientFlower(null);
        }}
        onStoryPlanted={handleStoryPlanted}
      />

      {/* 6. About & How It Works Modals */}
      <InfoModals
        activeModal={activeInfoModal}
        onClose={() => setActiveInfoModal(null)}
        onStartPlanting={handleOpenGeneralPlanting}
        totalFlowersCount={Math.max(AMBIENT_MEADOW_FLOWERS.length, stories.length)}
        plantedStoriesCount={stories.length}
      />

      {/* 7. Google Sign-In & Member Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        currentUser={currentUser}
        secretGardenMembership={secretMembership}
        ownPlantedStories={ownPlantedStories}
        stories={stories}
        onSelectStory={handleSelectStory}
        onStoryDeleted={handleStoryDeleted}
        onSyncOwnPlantedStories={setOwnPlantedStories}
        onClose={() => setIsAccountModalOpen(false)}
        onOpenAdminConsole={(tab = 'users') => {
          setAdminInitialTab(tab);
          setIsAdminModalOpen(true);
        }}
        onOpenMySpace={() => setIsMySpaceOpen(true)}
      />

      {/* 8. Admin Backend Logins & Subscriptions Console */}
      <AdminBackendModal
        isOpen={isAdminModalOpen}
        currentUser={currentUser}
        stories={stories}
        initialTab={adminInitialTab}
        onStoryDeleted={handleStoryDeleted}
        onClose={() => {
          setIsAdminModalOpen(false);
          setAdminInitialTab('users');
        }}
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
        onOpenPrivacyTrust={openPrivacyTrustModal}
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
        onOpenPrivacyTrust={openPrivacyTrustModal}
        onClose={() => setIsInnerGardenOpen(false)}
      />

      {/* 12. Privacy & Trust Verification Shield + Export/Wipe */}
      <PrivacyTrustModal
        isOpen={isPrivacyModalOpen}
        initialTab={privacyModalTab}
        currentUser={currentUser}
        diaryEntries={diaryEntries}
        innerEntries={innerEntries}
        innerReflections={innerReflections}
        voiceJournals={voiceJournals}
        memories={memories}
        innerPrivacyPrefs={innerPrivacyPrefs}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      {/* 13. Real-Time Kind Message Notifications Center */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        notifications={kindNotifications}
        readState={notificationReadState}
        ownPlantedStories={ownPlantedStories}
        liveStories={stories}
        onOpenNotification={handleOpenNotification}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onStartPlanting={handleOpenGeneralPlanting}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* 14. Gentle Live Toast When a New Kind Message Arrives */}
      {liveToastNotification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 rounded-2xl bg-white/95 backdrop-blur-xl border border-rose-200/90 shadow-2xl p-3.5 flex items-start gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center shrink-0 mt-0.5">
            <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900">
              Someone left a kind message on your flower
            </p>
            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
              “{liveToastNotification.messageContent}”
            </p>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenNotification(liveToastNotification)}
                className="text-xs font-semibold text-rose-700 hover:text-rose-800 underline underline-offset-2 cursor-pointer"
              >
                Read Message
              </button>
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(true)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                View Inbox
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLiveToastNotification(null)}
            aria-label="Dismiss notification"
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
