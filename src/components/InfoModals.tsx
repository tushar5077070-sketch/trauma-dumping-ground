import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { SEED_OPTIONS } from '../types/garden';
import { SeedIconIllustration } from './FlowerIllustration';

interface InfoModalProps {
  activeModal: 'about' | 'how-it-works' | null;
  onClose: () => void;
  onStartPlanting: () => void;
  totalFlowersCount: number;
}

export const InfoModals: React.FC<InfoModalProps> = ({
  activeModal,
  onClose,
  onStartPlanting,
  totalFlowersCount,
}) => {
  if (!activeModal) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/35 backdrop-blur-md"
    >
      <div className="relative w-full max-w-xl rounded-3xl bg-white/94 backdrop-blur-xl shadow-2xl border border-white/85 p-6 sm:p-8 max-h-[88vh] overflow-y-auto garden-scroll">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-5 top-5 p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {activeModal === 'about' && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-slate-500">
                About the Sanctuary · {totalFlowersCount} Living Flowers
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-slate-900 mt-1">
                Every story deserves a place to exist.
              </h2>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              <strong>Trauma Dumping Ground</strong> is an anonymous emotional sanctuary where heavy memories, unspoken grief, and personal turning points can be set down and transformed into a living digital meadow.
            </p>

            <p className="text-sm text-slate-600 leading-relaxed">
              Many of us carry experiences that feel too heavy to bring up in everyday conversation. Here, you don’t need a profile, a username, or an explanation. You simply choose a seed, write what has been weighing on your heart, and let the meadow hold it for you.
            </p>

            <div className="pt-3 border-t border-slate-200/70 space-y-2">
              <h3 className="text-xs font-semibold text-slate-800">
                Privacy & Compassion Principles
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Zero personal information is collected or displayed. Every flower is identified only by an anonymous soul number, and visitors can offer quiet warmth or a supportive note to remind authors they are not alone.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Return to Garden
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartPlanting();
                }}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Plant a Seed</span>
              </button>
            </div>
          </div>
        )}

        {activeModal === 'how-it-works' && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Guide to the Meadow
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-slate-900 mt-1">
                How the Garden Works
              </h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/70">
                <h3 className="text-sm font-semibold text-slate-900">
                  01. Explore & Read Anonymous Stories
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Move your cursor or finger across the meadow to feel the flowers sway in the breeze. Tap any flower to open the anonymous story it holds, send warmth, or leave a kind message.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/70">
                <h3 className="text-sm font-semibold text-slate-900">
                  02. Choose Your Seed
                </h3>
                <p className="text-xs text-slate-600 mt-1 mb-3 leading-relaxed">
                  Use the seed selector on the right side of the sky to choose the symbol that best reflects what you are releasing today:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {SEED_OPTIONS.map((seed) => (
                    <div
                      key={seed.id}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/70"
                    >
                      <SeedIconIllustration seedType={seed.id} size={32} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800">
                          {seed.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {seed.tagline}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/70">
                <h3 className="text-sm font-semibold text-slate-900">
                  03. Plant & Watch It Bloom
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Write your experience anonymously and click “Plant My Seed.” Watch your seed take root and bloom into a permanent flower in the shared meadow.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Back to Meadow
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartPlanting();
                }}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Plant Your Story</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
