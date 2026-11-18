import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  Sprout,
  Mic,
  BookOpen,
  BarChart3,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import {
  InnerAiServerStatus,
  InnerJournalEntry,
  InnerPrivacyPrefs,
  InnerReflectionMemory,
} from '../types/garden';
import { fetchAiServerStatus } from '../services/innerGardenAiService';
import { signInWithGoogleAndRecord } from '../services/authAccountService';
import { PrivacyConsentBanner } from './innergarden/PrivacyConsentBanner';
import { VoiceJournalTab } from './innergarden/VoiceJournalTab';
import { MemoryReflectionTab } from './innergarden/MemoryReflectionTab';
import { EmotionalPatternsTab } from './innergarden/EmotionalPatternsTab';

export type InnerGardenTabKey = 'voice' | 'memory' | 'patterns';

interface InnerGardenModalProps {
  isOpen: boolean;
  currentUser: User | null;
  entries: InnerJournalEntry[];
  reflections: InnerReflectionMemory[];
  prefs: InnerPrivacyPrefs | null;
  onClose: () => void;
}

export const InnerGardenModal: React.FC<InnerGardenModalProps> = ({
  isOpen,
  currentUser,
  entries,
  reflections,
  prefs,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<InnerGardenTabKey>('voice');
  const [aiStatus, setAiStatus] = useState<InnerAiServerStatus | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [bannerFeedback, setBannerFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetchAiServerStatus()
      .then((status) => {
        if (!cancelled) setAiStatus(status);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setSignInError(null);
    try {
      await signInWithGoogleAndRecord();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('popup-closed-by-user')) {
        setSignInError('Unable to sign in right now. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="My Inner Garden Private Sanctuary"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/45 backdrop-blur-md"
    >
      <div className="relative w-full max-w-5xl rounded-2xl sm:rounded-3xl bg-[#FAF8F5] shadow-2xl border border-white/90 max-h-[94dvh] flex flex-col overflow-hidden">
        {/* Top Sanctuary Header */}
        <div className="shrink-0 px-4 sm:px-7 pt-4 sm:pt-6 pb-3.5 bg-white/90 border-b border-slate-200/75 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-emerald-800">
                <Sprout className="w-3.5 h-3.5 shrink-0" />
                <span>My Inner Garden · Private Personal Sanctuary</span>
              </div>
              <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                A quiet room inside your own heart.
              </h2>
              <p className="text-xs text-slate-600">
                Completely separate from the public meadow. Voice notes, reflections, and emotional patterns stay strictly private to your account.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close My Inner Garden"
              className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3 Interconnected Sections Navigation */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {(
              [
                {
                  id: 'voice',
                  label: 'Voice Journal',
                  icon: Mic,
                  count: entries.filter((e) => e.audioDataUrl || e.transcript)
                    .length,
                },
                {
                  id: 'memory',
                  label: 'Memory & Reflection',
                  icon: BookOpen,
                  count: reflections.length,
                },
                {
                  id: 'patterns',
                  label: 'Emotional Patterns',
                  icon: BarChart3,
                  count: entries.filter((e) => e.primaryEmotion).length,
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100/90 hover:bg-slate-200/75 text-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    ({tab.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Sanctuary Workspace */}
        <div className="flex-1 min-h-0 px-4 sm:px-7 py-4 sm:py-6 overflow-y-auto garden-scroll space-y-5">
          {!currentUser ? (
            <div className="p-8 sm:p-10 rounded-2xl bg-white border border-slate-200/80 text-center space-y-4 max-w-lg mx-auto my-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6 text-emerald-700" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-slate-900">
                  Sign in to enter My Inner Garden
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Because Voice Journals, AI Reflections, and Emotional Patterns are strictly private to you, they are encrypted and isolated under your personal account—while your public meadow flowers remain 100% anonymous.
                </p>
              </div>

              {signInError && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {signInError}
                </p>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {isSigningIn ? 'Opening Google Sign-In...' : 'Sign In with Google'}
                </span>
              </button>
            </div>
          ) : (
            <>
              <PrivacyConsentBanner
                userId={currentUser.uid}
                prefs={prefs}
                aiStatus={aiStatus}
                onFeedback={(msg) => {
                  setBannerFeedback(msg);
                  window.setTimeout(() => setBannerFeedback(null), 4000);
                }}
              />

              {bannerFeedback && (
                <div className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs">
                  {bannerFeedback}
                </div>
              )}

              {activeTab === 'voice' && (
                <VoiceJournalTab
                  userId={currentUser.uid}
                  entries={entries}
                  prefs={prefs}
                  aiStatus={aiStatus}
                />
              )}

              {activeTab === 'memory' && (
                <MemoryReflectionTab
                  userId={currentUser.uid}
                  entries={entries}
                  reflections={reflections}
                  prefs={prefs}
                />
              )}

              {activeTab === 'patterns' && (
                <EmotionalPatternsTab
                  userId={currentUser.uid}
                  entries={entries}
                  reflections={reflections}
                  prefs={prefs}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-7 py-3 bg-white/95 border-t border-slate-200/75">
          <p className="text-[11px] text-slate-500">
            Owner-only private vault · Never visible in the public garden
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Return to Garden
          </button>
        </div>
      </div>
    </div>
  );
};
