import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { SEED_OPTIONS, SeedType, Story } from '../types/garden';
import {
  generateAnonymousSoulId,
  pickFlowerVariantForSeed,
  plantNewStory,
} from '../services/gardenService';
import { soundscape } from '../utils/soundscape';
import { MeadowFlowerSvg, SeedIconIllustration } from './FlowerIllustration';

interface WriteStoryModalProps {
  isOpen: boolean;
  selectedSeed: SeedType;
  onSelectSeed: (seed: SeedType) => void;
  existingStories: Story[];
  onClose: () => void;
  onStoryPlanted: (newStory: Story) => void;
}

type PlantingPhase =
  | 'writing'
  | 'seed-falling'
  | 'soil-light'
  | 'stem-growing'
  | 'leaves-unfurling'
  | 'flower-blooming'
  | 'complete';

export const WriteStoryModal: React.FC<WriteStoryModalProps> = ({
  isOpen,
  selectedSeed,
  onSelectSeed,
  existingStories,
  onClose,
  onStoryPlanted,
}) => {
  const [content, setContent] = useState('');
  const [contentWarning, setContentWarning] = useState('');
  const [showContentWarningInput, setShowContentWarningInput] = useState(false);
  const [anonymousConfirmed, setAnonymousConfirmed] = useState(true);
  const [anonymousId, setAnonymousId] = useState(() => generateAnonymousSoulId());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phase, setPhase] = useState<PlantingPhase>('writing');
  const [plantedStory, setPlantedStory] = useState<Story | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhase('writing');
      setErrorMsg(null);
      setIsSubmitting(false);
      setAnonymousId(generateAnonymousSoulId());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSeed =
    SEED_OPTIONS.find((s) => s.id === selectedSeed) || SEED_OPTIONS[0];
  const charCount = content.length;
  const maxChars = 2000;

  const handlePlantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (content.trim().length < 5) {
      setErrorMsg('Please share at least a few words (5+ characters) so your seed can take root.');
      return;
    }
    if (!anonymousConfirmed) {
      setErrorMsg('Please confirm anonymous posting before planting your seed.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await plantNewStory({
        content,
        seedType: selectedSeed,
        contentWarning: showContentWarningInput ? contentWarning : '',
        anonymousId,
        existingStories,
      });
      setPlantedStory(created);
      soundscape.playBloomChord();

      // Run choreographed 5-stage botanical planting sequence
      setPhase('seed-falling');
      setTimeout(() => setPhase('soil-light'), 900);
      setTimeout(() => setPhase('stem-growing'), 1800);
      setTimeout(() => setPhase('leaves-unfurling'), 2700);
      setTimeout(() => setPhase('flower-blooming'), 3600);
      setTimeout(() => setPhase('complete'), 4500);
    } catch (err) {
      let friendlyMessage = 'Unable to plant your seed right now. Please try again.';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/35 backdrop-blur-md transition-opacity"
    >
      {phase === 'writing' ? (
        <div className="relative w-full max-w-2xl rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border border-white/80 p-6 sm:p-8 max-h-[90vh] overflow-y-auto garden-scroll">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close writing sanctuary"
            className="absolute right-5 top-5 p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="pr-8">
            <p className="text-xs font-medium text-slate-500">
              {currentSeed.numberLabel} · {currentSeed.name} · {anonymousId}
            </p>
            <h2
              id="write-story-heading"
              className="font-editorial text-3xl sm:text-4xl font-semibold text-slate-900 mt-1 tracking-tight"
            >
              What's been weighing on your heart?
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              This garden is a place to let things out. Write whatever you need to. Nobody needs to know it's you.
            </p>
          </div>

          <form onSubmit={handlePlantSubmit} className="mt-6 space-y-5">
            {/* Seed Selector Strip */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Selected Seed
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {SEED_OPTIONS.map((seed) => {
                  const isActive = seed.id === selectedSeed;
                  return (
                    <button
                      key={seed.id}
                      type="button"
                      onClick={() => onSelectSeed(seed.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-sky-50/90 border-sky-300 shadow-xs'
                          : 'bg-slate-50/70 border-slate-200/80 hover:bg-white'
                      }`}
                    >
                      <SeedIconIllustration seedType={seed.id} size={36} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {seed.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {seed.tagline}
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
                    charCount > maxChars * 0.9 ? 'text-amber-600' : 'text-slate-400'
                  }`}
                >
                  {charCount} / {maxChars}
                </span>
              </div>
              <textarea
                id="story-textarea"
                rows={6}
                maxLength={maxChars}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your story here..."
                className="w-full rounded-2xl bg-slate-50/90 border border-slate-200 px-4 py-3.5 text-base text-slate-800 placeholder:text-slate-400 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 transition-all resize-y"
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
            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 cursor-pointer">
              <input
                type="checkbox"
                checked={anonymousConfirmed}
                onChange={(e) => setAnonymousConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-sky-400"
              />
              <div className="text-xs text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Anonymous Sanctuary Promise
                </span>
                Your story will be planted anonymously as{' '}
                <span className="font-medium text-slate-800">{anonymousId}</span>. No name, email, or personal identity is ever collected or displayed.
              </div>
            </label>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>{isSubmitting ? 'Planting Seed...' : 'Plant My Seed'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Choreographed Planting Animation Sanctuary */
        <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-sky-100/95 via-white/95 to-emerald-50/95 backdrop-blur-xl shadow-2xl border border-white/90 p-8 text-center overflow-hidden">
          <div className="relative h-64 flex flex-col items-center justify-end pb-6">
            {/* Stage 1: Falling Seed */}
            {phase === 'seed-falling' && (
              <div className="animate-bounce mb-16 flex flex-col items-center">
                <div className="w-5 h-7 rounded-full bg-amber-300 shadow-lg shadow-amber-200 border border-amber-400" />
              </div>
            )}

            {/* Stage 2+: Warm Soil Light Ripple */}
            {phase !== 'seed-falling' && (
              <div className="absolute bottom-4 w-44 h-8 rounded-full bg-amber-200/60 blur-md animate-pulse-aura" />
            )}

            {/* Stage 3: Growing Stem */}
            {phase === 'stem-growing' && (
              <svg width="80" height="140" viewBox="0 0 80 140" className="overflow-visible">
                <path
                  d="M 40 135 Q 40 90 40 50"
                  stroke="#6DA651"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            )}

            {/* Stage 4: Unfurling Leaves */}
            {phase === 'leaves-unfurling' && (
              <svg width="100" height="160" viewBox="0 0 100 160" className="overflow-visible">
                <path
                  d="M 50 150 Q 48 95 50 38"
                  stroke="#6DA651"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
                <path d="M 50 110 Q 22 92 30 74 Q 45 84 50 110" fill="#7FB862" />
                <path d="M 50 96 Q 78 78 70 60 Q 55 70 50 96" fill="#7FB862" />
              </svg>
            )}

            {/* Stage 5 & Complete: Full Backlit Flower Blooming */}
            {(phase === 'flower-blooming' || phase === 'complete') && (
              <div className="w-32 h-52 transition-transform duration-700 scale-110">
                <MeadowFlowerSvg
                  variant={
                    plantedStory?.flowerVariant ||
                    pickFlowerVariantForSeed(selectedSeed)
                  }
                  isHovered={true}
                  stemHeight={130}
                  uniqueId="planted-preview"
                />
              </div>
            )}

            {/* Soft Meadow Soil Mound */}
            <div className="w-52 h-5 rounded-full bg-emerald-800/25 border-t border-emerald-700/20" />
          </div>

          {/* Stage Captions */}
          <div className="min-h-[116px] flex flex-col items-center justify-center">
            {phase !== 'complete' ? (
              <>
                <p className="font-editorial text-2xl font-medium text-slate-800">
                  {phase === 'seed-falling' && 'A quiet seed meets the earth...'}
                  {phase === 'soil-light' && 'Taking root in warm meadow soil...'}
                  {phase === 'stem-growing' && 'Reaching gently toward the sky...'}
                  {phase === 'leaves-unfurling' && 'Unfurling leaves in the breeze...'}
                  {phase === 'flower-blooming' && 'Blooming into the garden...'}
                </p>
                <p className="text-xs text-slate-500 mt-1.5">
                  Planting {currentSeed.name} for {anonymousId}
                </p>
              </>
            ) : (
              <div className="space-y-2">
                <h3 className="font-editorial text-3xl font-semibold text-slate-900">
                  Your story has found a place to grow.
                </h3>
                <p className="text-sm text-slate-600">
                  Thank you for planting your seed.
                </p>
                <div className="pt-4">
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
