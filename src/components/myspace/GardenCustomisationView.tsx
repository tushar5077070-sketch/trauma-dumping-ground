import React, { useState } from 'react';
import {
  Palette,
  Flower2,
  Sun,
  Lock,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  DEFAULT_GARDEN_CUSTOMISATION,
  EXCLUSIVE_FLORA_CATALOG,
  GARDEN_BACKGROUND_CATALOG,
  GARDEN_EFFECT_CATALOG,
  GARDEN_THEME_CATALOG,
  GardenCustomisationSettings,
} from '../../types/garden';

interface GardenCustomisationViewProps {
  customisation: GardenCustomisationSettings;
  hasPremiumAccess: boolean;
  onUpdateCustomisation: (next: GardenCustomisationSettings) => Promise<void>;
  onRequestUpgrade: (featureName?: string) => void;
}

export const GardenCustomisationView: React.FC<GardenCustomisationViewProps> = ({
  customisation,
  hasPremiumAccess,
  onUpdateCustomisation,
  onRequestUpgrade,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const applySelection = async (
    patch: Partial<GardenCustomisationSettings>,
    itemIsPremium: boolean,
    itemLabel: string
  ) => {
    if (itemIsPremium && !hasPremiumAccess) {
      onRequestUpgrade(itemLabel);
      return;
    }
    const next: GardenCustomisationSettings = {
      ...customisation,
      ...patch,
    };
    setIsSaving(true);
    setSavedNotice(null);
    try {
      await onUpdateCustomisation(next);
      setSavedNotice(`Applied "${itemLabel}" to your personal garden view.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToFree = async () => {
    setIsSaving(true);
    try {
      await onUpdateCustomisation(DEFAULT_GARDEN_CUSTOMISATION);
      setSavedNotice('Restored the original open sunlit meadow.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-rose-50/75 border border-rose-200/75">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-900">
            <Palette className="w-3.5 h-3.5 text-rose-600" />
            <span>Personal Meadow Atmosphere</span>
          </div>
          <p className="text-xs text-rose-950/80">
            Shape the light, sky mood, breeze effects, and subtle bloom glow of
            your garden view. The original sunlit meadow always remains free.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetToFree}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-rose-200 text-xs font-medium text-slate-700 cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Default</span>
        </button>
      </div>

      {savedNotice && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* 1. Garden Themes */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Garden Theme</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GARDEN_THEME_CATALOG.map((theme) => {
            const selected = customisation.gardenTheme === theme.id;
            const locked = theme.isPremium && !hasPremiumAccess;
            return (
              <button
                key={theme.id}
                type="button"
                disabled={isSaving}
                onClick={() =>
                  applySelection(
                    { gardenTheme: theme.id },
                    theme.isPremium,
                    theme.name
                  )
                }
                className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                  selected
                    ? 'bg-white border-rose-400 ring-2 ring-rose-100 shadow-2xs'
                    : 'bg-white/85 border-slate-200/80 hover:border-rose-200'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.swatch} shrink-0 border border-white shadow-2xs`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {theme.name}
                    </span>
                    {locked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium shrink-0">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Premium</span>
                      </span>
                    ) : selected ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      !theme.isPremium && (
                        <span className="text-[10px] font-medium text-emerald-700">
                          Free
                        </span>
                      )
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {theme.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Sky Background Options */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-semibold text-slate-700">
          Sky & Backdrop Veil
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GARDEN_BACKGROUND_CATALOG.map((bg) => {
            const selected = customisation.gardenBackground === bg.id;
            const locked = bg.isPremium && !hasPremiumAccess;
            return (
              <button
                key={bg.id}
                type="button"
                disabled={isSaving}
                onClick={() =>
                  applySelection(
                    { gardenBackground: bg.id },
                    bg.isPremium,
                    bg.name
                  )
                }
                className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  selected
                    ? 'bg-white border-rose-400 ring-2 ring-rose-100 shadow-2xs'
                    : 'bg-white/85 border-slate-200/80 hover:border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    {bg.name}
                  </span>
                  {locked ? (
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  ) : selected ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    !bg.isPremium && (
                      <span className="text-[10px] font-medium text-emerald-700">
                        Free
                      </span>
                    )
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {bg.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Subtle Visual Effects */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Flower2 className="w-3.5 h-3.5 text-amber-500" />
          <span>Ambient Garden Effects</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GARDEN_EFFECT_CATALOG.map((eff) => {
            const selected = customisation.gardenEffect === eff.id;
            const locked = eff.isPremium && !hasPremiumAccess;
            return (
              <button
                key={eff.id}
                type="button"
                disabled={isSaving}
                onClick={() =>
                  applySelection(
                    { gardenEffect: eff.id },
                    eff.isPremium,
                    eff.name
                  )
                }
                className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  selected
                    ? 'bg-white border-rose-400 ring-2 ring-rose-100 shadow-2xs'
                    : 'bg-white/85 border-slate-200/80 hover:border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    {eff.name}
                  </span>
                  {locked ? (
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  ) : selected ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    !eff.isPremium && (
                      <span className="text-[10px] font-medium text-emerald-700">
                        Free
                      </span>
                    )
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {eff.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Exclusive Flora Variety Glow */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Flower2 className="w-3.5 h-3.5 text-rose-500" />
          <span>Flora Varieties & Petal Aura</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EXCLUSIVE_FLORA_CATALOG.map((flora) => {
            const selected = customisation.exclusiveFloraPreset === flora.id;
            const locked = flora.isPremium && !hasPremiumAccess;
            return (
              <button
                key={flora.id}
                type="button"
                disabled={isSaving}
                onClick={() =>
                  applySelection(
                    { exclusiveFloraPreset: flora.id },
                    flora.isPremium,
                    flora.name
                  )
                }
                className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  selected
                    ? 'bg-white border-rose-400 ring-2 ring-rose-100 shadow-2xs'
                    : 'bg-white/85 border-slate-200/80 hover:border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    {flora.name}
                  </span>
                  {locked ? (
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  ) : selected ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    !flora.isPremium && (
                      <span className="text-[10px] font-medium text-emerald-700">
                        Free
                      </span>
                    )
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {flora.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
