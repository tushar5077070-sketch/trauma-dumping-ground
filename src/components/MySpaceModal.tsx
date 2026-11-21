import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  BookHeart,
  BookOpen,
  Mic,
  Bookmark,
  History,
  Palette,
  Lock,
  Crown,
  Sparkles,
  Settings,
  ArrowLeft,
  ShieldCheck,
  ChevronRight,
  LogIn,
} from 'lucide-react';
import {
  ALL_PREMIUM_FEATURES_FREE_FOR_NOW,
  DiaryEntry,
  GardenCustomisationSettings,
  SavedMemory,
  SecretGardenMembership,
  VoiceJournal,
} from '../types/garden';
import { PersonalDiaryView } from './myspace/PersonalDiaryView';
import { VoiceJournalView } from './myspace/VoiceJournalView';
import { MemoriesView } from './myspace/MemoriesView';
import { ReflectionHistoryView } from './myspace/ReflectionHistoryView';
import { GardenCustomisationView } from './myspace/GardenCustomisationView';
import { SubscriptionSettingsView } from './myspace/SubscriptionSettingsView';
import { isTrialExpired } from '../services/secretGardenService';
import { signInWithGoogleAndRecord } from '../services/authAccountService';
import { PrivacyTrustTab } from './PrivacyTrustModal';

export type MySpaceFeatureKey =
  | 'overview'
  | 'diary'
  | 'voice'
  | 'memories'
  | 'history'
  | 'customise'
  | 'settings';

interface MySpaceModalProps {
  isOpen: boolean;
  currentUser: User | null;
  membership: SecretGardenMembership | null;
  hasPremiumAccess: boolean;
  isAdmin: boolean;
  diaryEntries: DiaryEntry[];
  voiceJournals: VoiceJournal[];
  memories: SavedMemory[];
  gardenCustomisation: GardenCustomisationSettings;
  lockedEncryptedCount: number;
  onOpenPrivacyTrust: (tab?: PrivacyTrustTab) => void;
  onUpdateCustomisation: (next: GardenCustomisationSettings) => Promise<void>;
  onOpenUpgrade: (featureName?: string) => void;
  onClose: () => void;
}

interface FeatureDefinition {
  key: Exclude<MySpaceFeatureKey, 'overview' | 'settings'>;
  title: string;
  shortDesc: string;
  previewDesc: string;
  previewPoints: string[];
  accentBg: string;
  iconBg: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FEATURES: FeatureDefinition[] = [
  {
    key: 'diary',
    title: 'Personal Diary',
    shortDesc: 'Quiet private pages never shared with the public garden.',
    previewDesc:
      'Keep a peaceful personal journal linked only to your account. Give entries optional titles, dates, write at your own pace, and edit or delete anytime.',
    previewPoints: [
      'Private entries with timestamps — never visible in the public meadow',
      'Optional titles & personal tags without judgments',
      'Edit, delete, or bookmark meaningful pages to Memories',
    ],
    accentBg: 'from-rose-50/90 to-white',
    iconBg: 'bg-rose-100 text-rose-700',
    icon: BookOpen,
  },
  {
    key: 'voice',
    title: 'Voice Journaling',
    shortDesc: 'Speak freely with pause, resume, playback, and private storage.',
    previewDesc:
      'For moments when typing feels heavier than speaking. Record voice thoughts privately using your microphone and replay or remove them anytime.',
    previewPoints: [
      'Microphone access asked only when you press Start Recording',
      'Pause, resume, stop, title & replay controls',
      'Stored strictly under your owner-only account path',
    ],
    accentBg: 'from-sky-50/90 to-white',
    iconBg: 'bg-sky-100 text-sky-700',
    icon: Mic,
  },
  {
    key: 'memories',
    title: 'My Memories',
    shortDesc: 'Save meaningful stories, kind replies & personal keepsakes.',
    previewDesc:
      'Collect flowers and comforting words from strangers alongside your favorite diary reflections — organized cleanly into quiet folders.',
    previewPoints: [
      'Bookmark anonymous community stories & supportive replies',
      'Organize into Calm Comfort, Kind Words & Personal Milestones',
      'Preserves full author anonymity on every saved item',
    ],
    accentBg: 'from-amber-50/85 to-white',
    iconBg: 'bg-amber-100 text-amber-700',
    icon: Bookmark,
  },
  {
    key: 'history',
    title: 'Reflection History',
    shortDesc: 'A serene chronological timeline filtered by date.',
    previewDesc:
      'Walk gently back through your written reflections, saved voice notes, and bookmarked keepsakes arranged clearly across time.',
    previewPoints: [
      'Unified chronological view across diary, voice & memories',
      'Filter by last 7 days, 30 days, or custom date range',
      'Calm factual record with zero clinical labels or diagnoses',
    ],
    accentBg: 'from-emerald-50/85 to-white',
    iconBg: 'bg-emerald-100 text-emerald-700',
    icon: History,
  },
  {
    key: 'customise',
    title: 'Exclusive Garden Customisation',
    shortDesc: 'Personalize meadow light, twilight skies, fireflies & blooms.',
    previewDesc:
      'Shape the visual mood of your personal garden sanctuary with twilight skies, golden-hour light, drifting petals, evening fireflies, and soft flora halos.',
    previewPoints: [
      'Lavender Twilight, Rosewater Mist & Golden Hour themes',
      'Pastel Dawn skies & subtle ambient fireflies/petals',
      'The original open sunlit meadow always remains free to everyone',
    ],
    accentBg: 'from-purple-50/85 to-white',
    iconBg: 'bg-purple-100 text-purple-700',
    icon: Palette,
  },
];

export const MySpaceModal: React.FC<MySpaceModalProps> = ({
  isOpen,
  currentUser,
  membership,
  hasPremiumAccess,
  isAdmin,
  diaryEntries,
  voiceJournals,
  memories,
  gardenCustomisation,
  lockedEncryptedCount,
  onOpenPrivacyTrust,
  onUpdateCustomisation,
  onOpenUpgrade,
  onClose,
}) => {
  const [activeView, setActiveView] = useState<MySpaceFeatureKey>('overview');
  const [previewFeature, setPreviewFeature] =
    useState<FeatureDefinition | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (!isOpen) return null;

  const handleQuickSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogleAndRecord();
    } catch {
      // Sign-in popup closed or cancelled
    } finally {
      setIsSigningIn(false);
    }
  };

  const expired = isTrialExpired(membership);
  const membershipBadgeLabel = ALL_PREMIUM_FEATURES_FREE_FOR_NOW
    ? 'All Features Free'
    : isAdmin && !membership?.status
    ? 'Admin · Full Access'
    : membership?.status === 'trialing' && !expired
    ? `Secret Garden · Free Trial (Ends ${membership.trialEndsAt || 'in 30d'})`
    : membership?.status === 'active'
    ? `Secret Garden · ${
        membership.planId === 'secret_garden_annual' ? 'Annual' : 'Monthly'
      }`
    : expired
    ? 'Trial Expired · Choose Plan'
    : 'Free Plan (₹0)';

  const handleCardClick = (feat: FeatureDefinition) => {
    if (!hasPremiumAccess) {
      setPreviewFeature(feat);
      return;
    }
    setPreviewFeature(null);
    setActiveView(feat.key);
  };

  const activeFeatureDef = FEATURES.find((f) => f.key === activeView);

  const countForFeature = (key: FeatureDefinition['key']): string => {
    if (!hasPremiumAccess) return 'Locked preview';
    if (key === 'customise') return 'Customize live view';
    if (!currentUser) return 'Sign in to save';
    if (key === 'diary') return `${diaryEntries.length} entries`;
    if (key === 'voice') return `${voiceJournals.length} recordings`;
    if (key === 'memories') return `${memories.length} keepsakes`;
    return `${
      diaryEntries.length + voiceJournals.length + memories.length
    } moments`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-space-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/38 backdrop-blur-md"
    >
      <div className="relative w-full max-w-4xl rounded-2xl sm:rounded-3xl bg-[#FAF8F5]/97 backdrop-blur-xl shadow-2xl border border-white/90 max-h-[94dvh] flex flex-col overflow-hidden">
        {/* Pinned Top Bar */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-7 py-3.5 sm:py-4 border-b border-rose-100/80 bg-white/85">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeView !== 'overview' ? (
              <button
                type="button"
                onClick={() => setActiveView('overview')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-xs font-medium text-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>My Space</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200/80 text-xs font-medium shrink-0">
                <BookHeart className="w-3.5 h-3.5 text-rose-500" />
                <span>My Space</span>
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border truncate ${
                hasPremiumAccess
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Crown
                className={`w-3 h-3 shrink-0 ${
                  hasPremiumAccess ? 'text-amber-500' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{membershipBadgeLabel}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!hasPremiumAccess && (
              <button
                type="button"
                onClick={() => onOpenUpgrade()}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Unlock Secret Garden</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setPreviewFeature(null);
                setActiveView('settings');
              }}
              aria-label="Subscription and Settings"
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                activeView === 'settings'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Subscription</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close My Space"
              className="p-1.5 sm:p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Sanctuary Content */}
        <div className="flex-1 min-h-0 overflow-y-auto garden-scroll px-4 sm:px-8 py-5 sm:py-7 space-y-6">
          {currentUser && lockedEncryptedCount > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90">
              <div className="flex items-start gap-2.5 text-xs text-amber-950">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong className="font-semibold tabular-nums">
                    {lockedEncryptedCount}
                  </strong>{' '}
                  diary {lockedEncryptedCount === 1 ? 'entry is' : 'entries are'}{' '}
                  Zero-Knowledge encrypted. Unlock with your passphrase to read or edit.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenPrivacyTrust('encryption')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer shrink-0 self-start sm:self-auto"
              >
                Unlock Vault
              </button>
            </div>
          )}

          {activeView === 'overview' && (
            <>
              {/* Welcoming Heading & Privacy Promise */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2 max-w-xl">
                  <h2
                    id="my-space-heading"
                    className="font-editorial text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight"
                  >
                    Your little space, just for you.
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    A calm, private corner tucked behind the public meadow.
                    Everything written, recorded, or saved here stays strictly
                    private to your account and is never shown publicly or used
                    for advertising.
                  </p>
                </div>

                {!hasPremiumAccess ? (
                  <button
                    type="button"
                    onClick={() => onOpenUpgrade()}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>Unlock The Secret Garden · 1st Month Free</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs font-medium text-emerald-900 shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>
                      {ALL_PREMIUM_FEATURES_FREE_FOR_NOW
                        ? 'All 5 Spaces Free & Open to Everyone'
                        : 'All 5 Secret Garden Spaces Unlocked'}
                    </span>
                  </div>
                )}
              </div>

              {/* 5 Feature Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {FEATURES.map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <button
                      key={feat.key}
                      type="button"
                      onClick={() => handleCardClick(feat)}
                      className={`group text-left p-5 rounded-2xl bg-gradient-to-br ${feat.accentBg} border border-slate-200/80 hover:border-rose-300 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={`w-10 h-10 rounded-xl ${feat.iconBg} flex items-center justify-center shrink-0`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                          {!hasPremiumAccess ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/90 text-[10px] font-semibold">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Premium</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-emerald-700">
                              {ALL_PREMIUM_FEATURES_FREE_FOR_NOW ? 'Free' : 'Open'}
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="font-editorial text-xl font-semibold text-slate-900 group-hover:text-rose-900 transition-colors">
                            {feat.title}
                          </h3>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {feat.shortDesc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 font-medium">
                        <span>{countForFeature(feat.key)}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Active Feature Subview (All Free & Open) */}
          {activeView !== 'overview' && activeView !== 'settings' && (
            <div className="space-y-4">
              {activeFeatureDef && (
                <div className="space-y-1">
                  <h2
                    id="my-space-heading"
                    className="font-editorial text-2xl sm:text-3xl font-semibold text-slate-900"
                  >
                    {activeFeatureDef.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600">
                    {activeFeatureDef.shortDesc}
                  </p>
                </div>
              )}

              {activeView === 'customise' ? (
                <GardenCustomisationView
                  customisation={gardenCustomisation}
                  hasPremiumAccess={hasPremiumAccess}
                  onUpdateCustomisation={onUpdateCustomisation}
                  onRequestUpgrade={onOpenUpgrade}
                />
              ) : !currentUser ? (
                <div className="p-6 sm:p-8 rounded-2xl bg-white border border-rose-100 shadow-2xs text-center space-y-3">
                  <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h3 className="font-editorial text-2xl font-semibold text-slate-900">
                    Keep your {activeFeatureDef?.title || 'private space'} safe
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    All My Space features are completely free. Sign in with
                    Google once so your private diary entries, voice notes, and
                    memories stay securely linked only to your account.
                  </p>
                  <button
                    type="button"
                    onClick={handleQuickSignIn}
                    disabled={isSigningIn}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-amber-200" />
                    <span>
                      {isSigningIn ? 'Signing in...' : 'Continue with Google'}
                    </span>
                  </button>
                </div>
              ) : (
                <>
                  {activeView === 'diary' && (
                    <PersonalDiaryView
                      userId={currentUser.uid}
                      entries={diaryEntries}
                    />
                  )}

                  {activeView === 'voice' && (
                    <VoiceJournalView
                      userId={currentUser.uid}
                      recordings={voiceJournals}
                    />
                  )}

                  {activeView === 'memories' && (
                    <MemoriesView
                      userId={currentUser.uid}
                      memories={memories}
                    />
                  )}

                  {activeView === 'history' && (
                    <ReflectionHistoryView
                      diaryEntries={diaryEntries}
                      voiceJournals={voiceJournals}
                      memories={memories}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Subscription Management Settings */}
          {activeView === 'settings' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2
                  id="my-space-heading"
                  className="font-editorial text-2xl sm:text-3xl font-semibold text-slate-900"
                >
                  Subscription & Settings
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Manage The Secret Garden plan, check trial dates, or cancel
                  anytime with zero surprises.
                </p>
              </div>
              <SubscriptionSettingsView
                userId={currentUser?.uid || null}
                membership={membership}
                isAdmin={isAdmin}
                onOpenUpgrade={() => onOpenUpgrade()}
              />
            </div>
          )}
        </div>

        {/* Locked Feature Attractive Calm Preview Drawer Overlay */}
        {previewFeature && !hasPremiumAccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/35 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-rose-100 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl ${previewFeature.iconBg} flex items-center justify-center shrink-0`}
                >
                  <previewFeature.icon className="w-5 h-5" />
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewFeature(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  aria-label="Close feature preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                  <Lock className="w-2.5 h-2.5" />
                  <span>The Secret Garden Feature Preview</span>
                </div>
                <h3 className="font-editorial text-2xl font-semibold text-slate-900">
                  {previewFeature.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {previewFeature.previewDesc}
                </p>
              </div>

              <ul className="space-y-2 p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/70 text-xs text-slate-700">
                {previewFeature.previewPoints.map((pt) => (
                  <li key={pt} className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const name = previewFeature.title;
                    setPreviewFeature(null);
                    onOpenUpgrade(name);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Unlock The Secret Garden</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFeature(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pinned Footer */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-3 bg-white/95 border-t border-slate-200/70">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>Private to your account · Free meadow remains unchanged</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onOpenPrivacyTrust('encryption')}
              className="inline-flex items-center gap-1 font-medium text-emerald-800 hover:underline underline-offset-2 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Privacy &amp; Vault</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Return to Garden
          </button>
        </div>
      </div>
    </div>
  );
};
