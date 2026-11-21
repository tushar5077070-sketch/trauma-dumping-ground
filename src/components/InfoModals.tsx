import React from 'react';
import { X } from 'lucide-react';
import { SEED_OPTIONS } from '../types/garden';
import { SeedIconIllustration } from './FlowerIllustration';

interface InfoModalProps {
  activeModal: 'about' | 'how-it-works' | null;
  onClose: () => void;
  onStartPlanting: () => void;
  totalFlowersCount: number;
  plantedStoriesCount?: number;
}

export const InfoModals: React.FC<InfoModalProps> = ({
  activeModal,
  onClose,
  onStartPlanting,
  totalFlowersCount,
  plantedStoriesCount = 0,
}) => {
  if (!activeModal) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-slate-950/35 backdrop-blur-md"
    >
      <div className="relative w-full max-w-xl rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border border-white/85 max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Pinned Header */}
        <div className="shrink-0 flex items-start justify-between gap-4 px-4 sm:px-7 pt-4 sm:pt-6 pb-3 border-b border-slate-200/60">
          <div>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500">
              {activeModal === 'about'
                ? plantedStoriesCount > 0
                  ? `About the Sanctuary · ${plantedStoriesCount} ${
                      plantedStoriesCount === 1 ? 'Planted Story' : 'Planted Stories'
                    } · ${totalFlowersCount} Living Flowers`
                  : `About the Sanctuary · ${totalFlowersCount} Open Blooms Waiting for Stories`
                : 'Guide to the Meadow'}
            </p>
            <h2 className="font-editorial text-2xl sm:text-4xl font-semibold text-slate-900 mt-0.5">
              {activeModal === 'about'
                ? 'Some feelings deserve a place.'
                : 'How the Garden Works'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 sm:p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 px-4 sm:px-7 py-4 sm:py-5 overflow-y-auto garden-scroll space-y-4">
          {activeModal === 'about' ? (
            <>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                <strong>Unsaid</strong> is an anonymous emotional sanctuary where heavy memories, unspoken grief, and personal turning points can be set down and transformed into a living digital meadow.
              </p>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Many of us carry experiences that feel too heavy to bring up in everyday conversation. Here, you don’t need a profile, a username, or an explanation. You simply choose a seed, write what has been weighing on your heart, and let the meadow hold it for you.
              </p>

              <div className="pt-3 border-t border-slate-200/70 space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-800">
                  Privacy & Compassion Principles
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Zero personal information is collected or displayed. Every flower blooms completely anonymously with no username or tracking ID shown, and visitors can offer quiet warmth or a supportive note to remind authors they are not alone.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-3.5">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/70">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                  01. Explore & Read Anonymous Stories
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Move your cursor or finger across the meadow to feel the flowers sway in the breeze. Tap any flower to open the anonymous story it holds, send warmth, or leave a kind message.
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/70">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                  02. Click “Plant a Seed 🌱” & Choose Your Seed
                </h3>
                <p className="text-xs text-slate-600 mt-1 mb-2.5 leading-relaxed">
                  Click “Plant a Seed” to open the writing sanctuary and select the seed that best reflects what you are releasing today:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {SEED_OPTIONS.map((seed) => (
                    <div
                      key={seed.id}
                      className="flex flex-row sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1.5 p-2.5 rounded-xl bg-white border border-slate-200/70"
                    >
                      <SeedIconIllustration seedType={seed.id} size={28} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800">
                          {seed.name}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          {seed.tagline}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/70">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                  03. Plant & Watch It Bloom
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Write your experience anonymously and click “Plant My Seed.” Watch your seed take root and bloom into a permanent flower in the shared meadow.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Always-Visible Action Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2.5 px-4 sm:px-7 py-3 sm:py-4 bg-white/95 border-t border-slate-200/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            Return to Garden
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartPlanting();
            }}
            className="px-4 sm:px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Plant a Seed 🌱</span>
          </button>
        </div>
      </div>
    </div>
  );
};
