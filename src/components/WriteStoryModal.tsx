import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { X, ShieldCheck, AlertCircle, Sprout, Check, LogIn } from 'lucide-react';
import {
  AmbientMeadowFlower,
  SEED_OPTIONS,
  SeedType,
  Story,
} from '../types/garden';
import {
  pickFlowerVariantForSeed,
  plantNewStory,
} from '../services/gardenService';
import { signInWithGoogleAndRecord } from '../services/authAccountService';
import { soundscape } from '../utils/soundscape';
import { SeedIconIllustration } from './FlowerIllustration';
import {
  PlantingPhase,
  RealisticPlantingAnimation,
} from './RealisticPlantingAnimation';

interface WriteStoryModalProps {
  isOpen: boolean;
  currentUser: User | null;
  selectedSeed: SeedType;
  onSelectSeed: (seed: SeedType) => void;
  existingStories: Story[];
  targetFlower?: AmbientMeadowFlower | null;
  onClose: () => void;
  onStoryPlanted: (newStory: Story) => void;
}

export const WriteStoryModal: React.FC<WriteStoryModalProps> = ({
  isOpen,
  currentUser,
  selectedSeed,
  onSelectSeed,
  existingStories,
  targetFlower,
  onClose,
  onStoryPlanted,
}) => {
  const [content, setContent] = useState('');
  const [contentWarning, setContentWarning] = useState('');
  const [showContentWarningInput, setShowContentWarningInput] = useState(false);
  const [anonymousConfirmed, setAnonymousConfirmed] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phase, setPhase] = useState<PlantingPhase>('writing');
  const [plantedStory, setPlantedStory] = useState<Story | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhase('writing');
      setErrorMsg(null);
      setAuthError(null);
      setIsSigningIn(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentUser) {
      setAuthError(null);
      setIsSigningIn(false);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const currentSeed =
    SEED_OPTIONS.find((s) => s.id === selectedSeed) || SEED_OPTIONS[0];
  const charCount = content.length;
  const maxChars = 2000;

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogleAndRecord();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('popup-closed-by-user')) {
        setAuthError(
          'Sign-in was cancelled. You can try again whenever you are ready.'
        );
      } else if (msg.includes('popup-blocked')) {
        setAuthError(
          'Your browser blocked the sign-in popup. Please allow popups and try again.'
        );
      } else {
        setAuthError('Unable to sign in right now. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handlePlantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentUser) {
      setErrorMsg(
        'Please sign in with Google before planting a seed in the meadow.'
      );
      return;
    }

    if (content.trim().length < 5) {
      setErrorMsg(
        'Please share at least a few words (5+ characters) so your seed can take root.'
      );
      return;
    }
    if (!anonymousConfirmed) {
      setErrorMsg(
        'Please confirm anonymous posting before planting your seed.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await plantNewStory({
        content,
        seedType: selectedSeed,
        contentWarning: showContentWarningInput ? contentWarning : '',
        existingStories,
        targetFlower,
      });
      setPlantedStory(created);
      soundscape.playBloomChord();
      setPhase('seed-falling');
    } catch (err) {
      let friendlyMessage =
        'Unable to plant your seed right now. Please try again.';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          friendlyMessage = parsed.error || friendlyMessage;
        } catch {
          friendlyMessage = err.message;
        }
      }
      setErrorMsg(friendlyMessage);
      setIsSubmitting(false);
    }
  };

  const handleReturnToGarden = () => {
    if (plantedStory) {
      onStoryPlanted(plantedStory);
    }
    setContent('');
    setContentWarning('');
    setShowContentWarningInput(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-story-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-slate-950/35 backdrop-blur-md transition-opacity"
    >
      {phase === 'writing' && !currentUser ? (
        <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border border-white/80 overflow-hidden">
          <div className="flex items-start justify-between gap-4 px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-slate-200/60">
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-emerald-700">
                Sign In Required · Your Story Stays 100% Anonymous
              </p>
              <h2
                id="write-story-heading"
                className="font-editorial text-2xl sm:text-3xl font-semibold text-slate-900 mt-0.5 tracking-tight"
              >
                Sign in to plant your seed
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close sign in dialog"
              className="p-1.5 sm:p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              To keep Unsaid safe, gentle, and free from spam, please sign in with Google before planting a seed in the meadow.
            </p>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50/75 border border-emerald-200/80">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-900">
                  Your flower stays completely anonymous
                </p>
                <p className="mt-0.5">
                  Signing in only unlocks planting. Your name, email, and profile are never saved on your story or shown anywhere in the garden.
                </p>
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isSigningIn}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-300" />
                <span>
                  {isSigningIn
                    ? 'Signing in with Google...'
                    : 'Continue with Google'}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : phase === 'writing' ? (
        <form
          onSubmit={handlePlantSubmit}
          className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border border-white/80 max-h-[94dvh] flex flex-col overflow-hidden"
        >
          {/* Pinned Header */}
          <div className="shrink-0 flex items-start justify-between gap-4 px-4 sm:px-7 pt-4 sm:pt-6 pb-3 border-b border-slate-200/60">
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">
                {currentSeed.numberLabel} · {currentSeed.name} · Completely Anonymous
              </p>
              <h2
                id="write-story-heading"
                className="font-editorial text-2xl sm:text-4xl font-semibold text-slate-900 mt-0.5 tracking-tight"
              >
                What's been weighing on your heart?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                This garden is a place to let things out. Write whatever you need to. Nobody needs to know it's you.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close writing sanctuary"
              className="p-1.5 sm:p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 min-h-0 px-4 sm:px-7 py-4 sm:py-5 overflow-y-auto garden-scroll space-y-4">
            {/* Choose Your Seed Directly in the Plant Modal */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-2">
                Choose your seed 🌱
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {SEED_OPTIONS.map((seed) => {
                  const isActive = seed.id === selectedSeed;
                  return (
                    <button
                      key={seed.id}
                      type="button"
                      onClick={() => onSelectSeed(seed.id)}
                      className={`flex flex-row sm:flex-col lg:flex-row items-center sm:items-start gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-sky-50/95 border-sky-300 shadow-xs ring-1 ring-sky-200'
                          : 'bg-slate-50/75 border-slate-200/80 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between w-auto sm:w-full lg:w-auto shrink-0">
                        <SeedIconIllustration seedType={seed.id} size={34} />
                        {isActive && (
                          <span className="hidden sm:inline-flex lg:hidden items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 w-full">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-slate-900">
                            {seed.numberLabel} — {seed.name}
                          </p>
                          {isActive && (
                            <span className="inline-flex sm:hidden lg:inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-600 text-white shrink-0">
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {seed.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Large Multiline Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="story-textarea"
                  className="text-xs font-medium text-slate-700"
                >
                  Your Story
                </label>
                <span
                  className={`text-xs font-mono tabular-nums ${
                    charCount > maxChars * 0.9
                      ? 'text-amber-600'
                      : 'text-slate-400'
                  }`}
                >
                  {charCount} / {maxChars}
                </span>
              </div>
              <textarea
                id="story-textarea"
                rows={4}
                maxLength={maxChars}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your story here..."
                className="w-full rounded-2xl bg-slate-50/90 border border-slate-200 px-3.5 sm:px-4 py-3 text-sm sm:text-base text-slate-800 placeholder:text-slate-400 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 transition-all resize-y"
              />
            </div>

            {/* Optional Content Warning */}
            <div>
              {!showContentWarningInput ? (
                <button
                  type="button"
                  onClick={() => setShowContentWarningInput(true)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 underline underline-offset-4 cursor-pointer"
                >
                  + Add an optional content warning (for sensitive topics)
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="content-warning-input"
                      className="text-xs font-medium text-slate-700"
                    >
                      Optional Content Warning
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowContentWarningInput(false);
                        setContentWarning('');
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    id="content-warning-input"
                    type="text"
                    maxLength={120}
                    value={contentWarning}
                    onChange={(e) => setContentWarning(e.target.value)}
                    placeholder="e.g., Grief, family loss, burnout..."
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
              )}
            </div>

            {/* Anonymous Posting Confirmation */}
            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50/90 border border-slate-200/80 cursor-pointer">
              <input
                type="checkbox"
                checked={anonymousConfirmed}
                onChange={(e) => setAnonymousConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-sky-400"
              />
              <div className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Anonymous Sanctuary Promise
                </span>
                Your story will be planted completely anonymously — with no username, profile, or tracking ID ever attached or shown. Your Google account is never linked to or displayed on your flower.
              </div>
            </label>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Pinned Always-Visible Action Footer */}
          <div className="shrink-0 flex items-center justify-end gap-2.5 px-4 sm:px-7 py-3 sm:py-4 bg-white/95 border-t border-slate-200/70">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sprout className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isSubmitting ? 'Planting Seed...' : 'Plant My Seed'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* Choreographed 60fps Botanical Time-Lapse Planting Sanctuary */
        <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-sky-100/95 via-white/95 to-emerald-50/95 backdrop-blur-xl shadow-2xl border border-white/90 p-5 sm:p-7 text-center overflow-hidden space-y-4">
          <RealisticPlantingAnimation
            seedType={selectedSeed}
            flowerVariant={
              plantedStory?.flowerVariant ||
              pickFlowerVariantForSeed(selectedSeed)
            }
            onPhaseChange={setPhase}
          />

          <div className="min-h-[104px] flex flex-col items-center justify-center">
            {phase !== 'complete' ? (
              <>
                <p className="font-editorial text-xl sm:text-2xl font-medium text-slate-800 transition-opacity duration-300">
                  {phase === 'seed-falling' &&
                    'A quiet seed meets the earth...'}
                  {phase === 'soil-light' &&
                    'Taking root in damp meadow soil...'}
                  {phase === 'stem-growing' &&
                    'A tender shoot reaches for the light...'}
                  {phase === 'leaves-unfurling' &&
                    'Leaves unfurl as the bud awakens...'}
                  {phase === 'flower-blooming' &&
                    'Blooming gently into the meadow...'}
                </p>
                <p className="text-xs text-slate-500 mt-1.5">
                  Planting {currentSeed.name} · Anonymous bloom
                </p>
              </>
            ) : (
              <div className="space-y-2">
                <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-slate-900">
                  Your story has found a place to grow.
                </h3>
                <p className="text-sm text-slate-600">
                  Thank you for planting your seed.
                </p>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleReturnToGarden}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer"
                  >
                    Return to the Garden
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
