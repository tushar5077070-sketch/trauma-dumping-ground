import React, { useState } from 'react';
import { ShieldCheck, Mic, Sparkles, AlertTriangle, Check } from 'lucide-react';
import { InnerAiServerStatus, InnerPrivacyPrefs } from '../../types/garden';
import { saveInnerPrivacyPrefs } from '../../services/innerGardenService';

interface PrivacyConsentBannerProps {
  userId: string;
  prefs: InnerPrivacyPrefs | null;
  aiStatus: InnerAiServerStatus | null;
  onFeedback?: (msg: string) => void;
}

export const PrivacyConsentBanner: React.FC<PrivacyConsentBannerProps> = ({
  userId,
  prefs,
  aiStatus,
  onFeedback,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const audioConsent = Boolean(prefs?.allowAudioStorageConsent);
  const aiConsent = Boolean(prefs?.allowAiProcessingConsent);

  const toggleConsent = async (
    field: 'allowAudioStorageConsent' | 'allowAiProcessingConsent'
  ) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const nextAudio =
        field === 'allowAudioStorageConsent' ? !audioConsent : audioConsent;
      const nextAi =
        field === 'allowAiProcessingConsent' ? !aiConsent : aiConsent;

      await saveInnerPrivacyPrefs(userId, {
        allowAudioStorageConsent: nextAudio,
        allowAiProcessingConsent: nextAi,
      });

      if (onFeedback) {
        onFeedback(
          field === 'allowAiProcessingConsent'
            ? nextAi
              ? 'AI processing consent enabled for opted-in entries.'
              : 'AI processing consent turned off. Nothing is sent to Gemini.'
            : nextAudio
            ? 'Private audio storage consent enabled.'
            : 'Private audio storage consent turned off.'
        );
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <section
      aria-label="Privacy and Consent Controls"
      className="rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-5 space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
              Private Sanctuary Controls & Explicit Consent
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
              Isolated strictly to your signed-in account. Never posted to the public meadow, never used to train AI models, and never used for clinical diagnosis.
            </p>
          </div>
        </div>
      </div>

      {aiStatus && !aiStatus.configured && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/90 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            Gemini AI requires a server-side <code className="font-mono">GEMINI_API_KEY</code> in Settings &gt; Secrets. Local voice recording and private written journaling remain fully functional.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => toggleConsent('allowAudioStorageConsent')}
          disabled={isUpdating}
          aria-pressed={audioConsent}
          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
            audioConsent
              ? 'bg-sky-50/70 border-sky-200 text-slate-900'
              : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Mic className="w-4 h-4 text-sky-700 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">
                Store Private Audio Clips
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {audioConsent
                  ? 'Permitted · You can delete audio anytime'
                  : 'Off · Tap to allow saving recorded audio'}
              </p>
            </div>
          </div>
          <span
            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
              audioConsent
                ? 'bg-sky-700 border-sky-700 text-white'
                : 'bg-white border-slate-300'
            }`}
          >
            {audioConsent && <Check className="w-3.5 h-3.5" />}
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleConsent('allowAiProcessingConsent')}
          disabled={isUpdating}
          aria-pressed={aiConsent}
          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
            aiConsent
              ? 'bg-emerald-50/70 border-emerald-200 text-slate-900'
              : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">
                Gemini AI Transcription & Reflections
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {aiConsent
                  ? 'Permitted · Only for entries you opt in'
                  : 'Off · Zero data sent to AI'}
              </p>
            </div>
          </div>
          <span
            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
              aiConsent
                ? 'bg-emerald-700 border-emerald-700 text-white'
                : 'bg-white border-slate-300'
            }`}
          >
            {aiConsent && <Check className="w-3.5 h-3.5" />}
          </span>
        </button>
      </div>
    </section>
  );
};
