import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Award,
  AlertCircle,
  Loader2,
  Info,
  Check,
} from 'lucide-react';
import {
  ExtractedThemeItem,
  InnerJournalEntry,
  InnerPrivacyPrefs,
  InnerReflectionMemory,
} from '../../types/garden';
import {
  classifyEmotionWithGemini,
  extractThemesWithGemini,
} from '../../services/innerGardenAiService';
import { updateInnerJournalEntry } from '../../services/innerGardenService';
import { addDaysIso, getTodayIsoDate } from '../../services/secretGardenService';

interface EmotionalPatternsTabProps {
  userId: string;
  entries: InnerJournalEntry[];
  reflections: InnerReflectionMemory[];
  prefs: InnerPrivacyPrefs | null;
}

export const EmotionalPatternsTab: React.FC<EmotionalPatternsTabProps> = ({
  userId,
  entries,
  reflections,
  prefs,
}) => {
  const [trendWindow, setTrendWindow] = useState<'weekly' | 'monthly'>('weekly');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extractedThemes, setExtractedThemes] = useState<ExtractedThemeItem[]>(
    []
  );

  const aiConsent = Boolean(prefs?.allowAiProcessingConsent);

  const optedInWithText = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.allowAiAnalysis &&
          e.transcript &&
          e.transcript.trim().length >= 5
      ),
    [entries]
  );

  const entriesNeedingAnalysis = useMemo(
    () => optedInWithText.filter((e) => !e.primaryEmotion),
    [optedInWithText]
  );

  const analyzedEntries = useMemo(
    () =>
      entries.filter(
        (e) => Boolean(e.primaryEmotion) || e.emotions.length > 0
      ),
    [entries]
  );

  const handleAnalyzeOptedIn = async () => {
    if (!aiConsent) {
      setErrorMsg(
        'Please enable "Gemini AI Transcription & Reflections" consent above before analyzing entries.'
      );
      return;
    }
    if (optedInWithText.length === 0) {
      setErrorMsg(
        'No opted-in entries with text found. Opt in entries in Voice Journal or Memory & Reflection first.'
      );
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const targetList =
        entriesNeedingAnalysis.length > 0
          ? entriesNeedingAnalysis.slice(0, 12)
          : optedInWithText.slice(0, 12);

      for (const entry of targetList) {
        const res = await classifyEmotionWithGemini({
          text: entry.transcript,
          aiConsent: true,
        });
        await updateInnerJournalEntry(userId, entry.entryId, {
          primaryEmotion: res.primaryEmotion,
          emotions: res.emotions,
          emotionConfidenceNote: res.interpretationNote,
        });
      }

      const themeRes = await extractThemesWithGemini({
        entries: optedInWithText.map((e) => ({
          id: e.entryId,
          date: e.recordedDate,
          text: e.transcript,
        })),
        aiConsent: true,
      });
      setExtractedThemes(themeRes.themes);

      setStatusMsg(
        `Interpreted ${targetList.length} opted-in ${
          targetList.length === 1 ? 'entry' : 'entries'
        } and refreshed recurring themes.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to analyze opted-in entries right now.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Frequently expressed emotions from real analyzed entries
  const emotionFrequency = useMemo(() => {
    const counts = new Map<
      string,
      { label: string; count: number; intensitySum: number }
    >();

    for (const entry of analyzedEntries) {
      const items =
        entry.emotions.length > 0
          ? entry.emotions
          : entry.primaryEmotion
          ? [{ label: entry.primaryEmotion, intensity: 60 }]
          : [];

      for (const item of items) {
        const key = item.label.trim();
        if (!key) continue;
        const curr = counts.get(key) || { label: key, count: 0, intensitySum: 0 };
        curr.count += 1;
        curr.intensitySum += item.intensity;
        counts.set(key, curr);
      }
    }

    return Array.from(counts.values())
      .map((item) => ({
        label: item.label,
        count: item.count,
        avgIntensity: Math.round(item.intensitySum / item.count),
      }))
      .sort((a, b) => b.count - a.count || b.avgIntensity - a.avgIntensity)
      .slice(0, 7);
  }, [analyzedEntries]);

  // Recurring themes from extractedThemes OR saved entry/reflection themes
  const displayThemes = useMemo(() => {
    if (extractedThemes.length > 0) {
      return extractedThemes.map((t) => ({
        theme: t.theme,
        count: t.frequency,
        description: t.description,
      }));
    }

    const themeMap = new Map<string, number>();
    for (const e of entries) {
      for (const t of e.themes || []) {
        themeMap.set(t, (themeMap.get(t) || 0) + 1);
      }
    }
    for (const r of reflections) {
      for (const t of r.recurringThemes || []) {
        themeMap.set(t, (themeMap.get(t) || 0) + 1);
      }
    }
    return Array.from(themeMap.entries())
      .map(([theme, count]) => ({ theme, count, description: '' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [extractedThemes, entries, reflections]);

  // Weekly (7 days) & Monthly (30 days grouped into real date points) emotional trend
  const trendSeries = useMemo(() => {
    const days = trendWindow === 'weekly' ? 7 : 30;
    const today = getTodayIsoDate();
    const startIso = addDaysIso(new Date(), -(days - 1));

    // Collect real dates within window
    const byDate = new Map<
      string,
      { date: string; avgIntensity: number; count: number; primary: string }
    >();

    for (let i = 0; i < days; i++) {
      const iso = addDaysIso(new Date(), -(days - 1 - i));
      byDate.set(iso, { date: iso, avgIntensity: 0, count: 0, primary: '' });
    }

    for (const e of analyzedEntries) {
      const d = e.recordedDate;
      if (!d || d < startIso || d > today) continue;
      const bucket = byDate.get(d);
      if (!bucket) continue;
      const entryIntensity =
        e.emotions[0]?.intensity ?? (e.primaryEmotion ? 60 : 0);
      if (entryIntensity > 0) {
        const nextCount = bucket.count + 1;
        bucket.avgIntensity = Math.round(
          (bucket.avgIntensity * bucket.count + entryIntensity) / nextCount
        );
        bucket.count = nextCount;
        bucket.primary = e.primaryEmotion || bucket.primary;
      }
    }

    return Array.from(byDate.values());
  }, [analyzedEntries, trendWindow]);

  const activeTrendDays = trendSeries.filter((p) => p.count > 0);

  // Personal Reflection Milestones computed strictly from real data
  const milestones = useMemo(() => {
    const totalMinutesSpoken = Math.round(
      entries.reduce((acc, e) => acc + (e.durationSeconds || 0), 0) / 60
    );
    const distinctDays = new Set(entries.map((e) => e.recordedDate).filter(Boolean))
      .size;

    return [
      {
        label: 'Private Reflections Recorded',
        value: `${entries.length}`,
        achieved: entries.length >= 1,
        note: entries.length >= 1 ? 'Started your private vault' : 'Waiting for first entry',
      },
      {
        label: 'Distinct Days Checked In',
        value: `${distinctDays}`,
        achieved: distinctDays >= 3,
        note: distinctDays >= 3 ? 'Steady personal rhythm' : '3 days unlocks milestone',
      },
      {
        label: 'Minutes Spoken in Sanctuary',
        value: `${totalMinutesSpoken}m`,
        achieved: totalMinutesSpoken >= 1,
        note: totalMinutesSpoken >= 1 ? 'Voice expression active' : 'Record a voice note',
      },
      {
        label: 'Memory Reflections Saved',
        value: `${reflections.length}`,
        achieved: reflections.length >= 1,
        note: reflections.length >= 1 ? 'Weekly/Monthly timeline begun' : 'Generate in Memory tab',
      },
    ];
  }, [entries, reflections]);

  const hasEnoughChartData = analyzedEntries.length >= 2;
  const maxFreq = Math.max(1, ...emotionFrequency.map((e) => e.count));

  return (
    <div className="space-y-6">
      {/* Non-Clinical Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-700 leading-relaxed">
          <strong>Approximate Interpretation Only:</strong> Emotional tone labels and trends shown here are gentle AI estimates of your own written or transcribed words. They are <strong>not</strong> a clinical assessment, therapy, or medical diagnosis.
        </p>
      </div>

      {statusMsg && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <Check className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action Bar for Opted-In Entries */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs sm:text-sm font-semibold text-slate-900">
            Analyze Opted-In Journal Entries
          </p>
          <p className="text-xs text-slate-500">
            <span className="font-mono tabular-nums font-medium text-slate-800">
              {analyzedEntries.length}
            </span>{' '}
            interpreted entries ·{' '}
            <span className="font-mono tabular-nums font-medium text-slate-800">
              {entriesNeedingAnalysis.length}
            </span>{' '}
            opted-in entries awaiting interpretation
          </p>
        </div>

        <button
          type="button"
          disabled={isAnalyzing || !aiConsent || optedInWithText.length === 0}
          onClick={handleAnalyzeOptedIn}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
        >
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BarChart3 className="w-4 h-4 text-amber-200" />
          )}
          <span>
            {isAnalyzing
              ? 'Interpreting entries...'
              : entriesNeedingAnalysis.length > 0
              ? 'Interpret Opted-In Entries'
              : 'Refresh Emotional Patterns'}
          </span>
        </button>
      </div>

      {/* Real Milestones Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {milestones.map((m) => (
          <div
            key={m.label}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <Award
                className={`w-4 h-4 ${
                  m.achieved ? 'text-emerald-700' : 'text-slate-300'
                }`}
              />
              <span className="font-mono text-xl font-semibold text-slate-900 tabular-nums">
                {m.value}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800">{m.label}</p>
            <p className="text-[11px] text-slate-500">{m.note}</p>
          </div>
        ))}
      </div>

      {/* Insufficient Data Empty State (Never Invents Fake Analytics!) */}
      {!hasEnoughChartData ? (
        <div className="p-8 sm:p-10 text-center rounded-2xl bg-white border border-slate-200/80 space-y-3">
          <BarChart3 className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="font-editorial text-2xl font-semibold text-slate-900">
            Waiting for at least 2 interpreted entries
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Emotional charts only display real patterns from your own private entries—never invented or placeholder graphs. Record or write at least two entries, opt them into AI analysis, and run interpretation above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: Frequently Expressed Emotions */}
          <section className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-4">
            <div className="space-y-0.5">
              <h3 className="font-editorial text-xl font-semibold text-slate-900">
                Frequently Expressed Emotions
              </h3>
              <p className="text-[11px] text-slate-500">
                Count of entries & average estimated intensity across your analyzed notes
              </p>
            </div>

            <div className="space-y-3">
              {emotionFrequency.map((item) => {
                const widthPct = Math.max(10, Math.round((item.count / maxFreq) * 100));
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">
                        {item.label}
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-slate-500">
                        {item.count} {item.count === 1 ? 'entry' : 'entries'} ·{' '}
                        {item.avgIntensity}% avg intensity
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600/85 transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Chart 2: Weekly / Monthly Emotional Trend SVG */}
          <section className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-editorial text-xl font-semibold text-slate-900">
                  {trendWindow === 'weekly'
                    ? 'Weekly Emotional Trend'
                    : 'Monthly Emotional Trend'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Real dates with analyzed entries ({activeTrendDays.length} active{' '}
                  {activeTrendDays.length === 1 ? 'day' : 'days'})
                </p>
              </div>

              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100">
                {(['weekly', 'monthly'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setTrendWindow(w)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer ${
                      trendWindow === w
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    {w === 'weekly' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>
            </div>

            {activeTrendDays.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-50 text-xs text-slate-500">
                No interpreted entries dated inside this {trendWindow} window yet.
              </div>
            ) : (
              <div className="space-y-3">
                <svg
                  viewBox="0 0 360 140"
                  role="img"
                  aria-label="Emotional intensity trend over dates"
                  className="w-full h-36 rounded-xl bg-slate-50/70 border border-slate-200/60"
                >
                  {/* Baseline grid */}
                  <line x1="24" y1="25" x2="344" y2="25" stroke="#e2e8f0" strokeDasharray="3 3" />
                  <line x1="24" y1="68" x2="344" y2="68" stroke="#e2e8f0" strokeDasharray="3 3" />
                  <line x1="24" y1="112" x2="344" y2="112" stroke="#cbd5e1" />

                  <text x="4" y="29" fontSize="8" fill="#64748b">100</text>
                  <text x="8" y="72" fontSize="8" fill="#64748b">50</text>
                  <text x="12" y="115" fontSize="8" fill="#64748b">0</text>

                  {/* Polyline connecting active data points */}
                  {activeTrendDays.length >= 2 && (
                    <polyline
                      fill="none"
                      stroke="#0f766e"
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={trendSeries
                        .map((pt, idx) => {
                          if (pt.count === 0) return null;
                          const x =
                            28 +
                            (idx / Math.max(1, trendSeries.length - 1)) * 310;
                          const y = 112 - (pt.avgIntensity / 100) * 85;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .filter(Boolean)
                        .join(' ')}
                    />
                  )}

                  {/* Data Dots */}
                  {trendSeries.map((pt, idx) => {
                    if (pt.count === 0) return null;
                    const x =
                      28 + (idx / Math.max(1, trendSeries.length - 1)) * 310;
                    const y = 112 - (pt.avgIntensity / 100) * 85;
                    return (
                      <g key={pt.date}>
                        <circle
                          cx={x}
                          cy={y}
                          r={5}
                          fill="#0f766e"
                          stroke="#ffffff"
                          strokeWidth={2}
                        >
                          <title>
                            {`${pt.date}: ${pt.primary || 'Reflective'} (${pt.avgIntensity}%)`}
                          </title>
                        </circle>
                      </g>
                    );
                  })}
                </svg>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  {activeTrendDays.map((d) => (
                    <span key={d.date} className="font-mono tabular-nums">
                      {d.date.slice(5)}: <strong className="font-sans text-slate-800">{d.primary}</strong> ({d.avgIntensity}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Recurring Themes Card */}
          <section className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3">
            <h3 className="font-editorial text-xl font-semibold text-slate-900">
              Recurring Personal Themes
            </h3>
            {displayThemes.length === 0 ? (
              <p className="text-xs text-slate-500">
                No recurring themes extracted yet. Tap Refresh Emotional Patterns above or generate a Weekly/Monthly Reflection in Memory &amp; Reflection.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayThemes.map((t) => (
                  <div
                    key={t.theme}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {t.theme}
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-emerald-800">
                        {t.count}x
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {t.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
