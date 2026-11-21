import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Pencil,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  Shield,
} from 'lucide-react';
import {
  InnerJournalEntry,
  InnerPrivacyPrefs,
  InnerReflectionMemory,
} from '../../types/garden';
import {
  extractThemesWithGemini,
  generateReflectionWithGemini,
} from '../../services/innerGardenAiService';
import {
  createInnerJournalEntry,
  createInnerReflectionMemory,
  deleteInnerJournalEntry,
  deleteInnerReflectionMemory,
  updateInnerJournalEntry,
  updateInnerReflectionMemory,
} from '../../services/innerGardenService';
import { addDaysIso, getTodayIsoDate } from '../../services/secretGardenService';

interface MemoryReflectionTabProps {
  userId: string;
  entries: InnerJournalEntry[];
  reflections: InnerReflectionMemory[];
  prefs: InnerPrivacyPrefs | null;
}

export const MemoryReflectionTab: React.FC<MemoryReflectionTabProps> = ({
  userId,
  entries,
  reflections,
  prefs,
}) => {
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTextComposer, setShowTextComposer] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newDate, setNewDate] = useState(() => getTodayIsoDate());
  const [newAllowAi, setNewAllowAi] = useState(false);
  const [isSavingText, setIsSavingText] = useState(false);

  const [editingReflectionId, setEditingReflectionId] = useState<string | null>(
    null
  );
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [editTakeaway, setEditTakeaway] = useState('');
  const [confirmDeleteReflectionId, setConfirmDeleteReflectionId] = useState<
    string | null
  >(null);

  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(
    null
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const aiConsent = Boolean(prefs?.allowAiProcessingConsent);

  const windowBounds = useMemo(() => {
    const today = getTodayIsoDate();
    const start =
      periodType === 'weekly'
        ? addDaysIso(new Date(), -7)
        : addDaysIso(new Date(), -30);
    return {
      start,
      end: today,
      label:
        periodType === 'weekly'
          ? `Weekly · ${start} to ${today}`
          : `Monthly · ${start} to ${today}`,
    };
  }, [periodType]);

  const optedInWindowEntries = useMemo(() => {
    return entries.filter((e) => {
      if (!e.allowAiAnalysis) return false;
      if (!e.transcript || e.transcript.trim().length < 5) return false;
      const d = e.recordedDate || getTodayIsoDate();
      return d >= windowBounds.start && d <= windowBounds.end;
    });
  }, [entries, windowBounds]);

  const handleCreateTextEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newText.trim().length < 5 || isSavingText) return;
    setIsSavingText(true);
    setErrorMsg(null);
    setFeedback(null);

    try {
      await createInnerJournalEntry(userId, {
        entryKind: 'text',
        storageChoice: 'transcript',
        title: newTitle.trim() || 'Private Garden Page',
        transcript: newText.trim(),
        recordedDate: newDate,
        allowAiAnalysis: newAllowAi,
      });
      setNewTitle('');
      setNewText('');
      setNewDate(getTodayIsoDate());
      setShowTextComposer(false);
      setFeedback('Private journal entry saved.');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to save journal entry.'
      );
    } finally {
      setIsSavingText(false);
    }
  };

  const handleToggleEntryAiOptIn = async (entry: InnerJournalEntry) => {
    try {
      await updateInnerJournalEntry(userId, entry.entryId, {
        allowAiAnalysis: !entry.allowAiAnalysis,
      });
      setFeedback(
        !entry.allowAiAnalysis
          ? 'Entry opted in for AI memory reflections.'
          : 'Entry excluded from AI analysis.'
      );
    } catch {
      setErrorMsg('Unable to update AI opt-in setting.');
    }
  };

  const handleGeneratePeriodReflection = async () => {
    if (!aiConsent) {
      setErrorMsg(
        'Enable "Gemini AI Transcription & Reflections" consent at the top before generating memories.'
      );
      return;
    }
    if (optedInWindowEntries.length === 0) {
      setErrorMsg(
        `No opted-in entries with text found in the ${periodType} window. Opt in at least one entry below first.`
      );
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setFeedback(null);

    try {
      const payloadEntries = optedInWindowEntries.map((e) => ({
        id: e.entryId,
        date: e.recordedDate,
        title: e.title,
        text: e.transcript,
      }));

      // Step 1: Extract recurring themes
      const themeResult = await extractThemesWithGemini({
        entries: payloadEntries.map((e) => ({
          id: e.id,
          date: e.date,
          text: e.text,
        })),
        aiConsent: true,
      });

      // Step 2: Generate empathetic weekly/monthly reflection
      const reflectionResult = await generateReflectionWithGemini({
        mode: periodType,
        periodLabel: windowBounds.label,
        entries: payloadEntries,
        aiConsent: true,
      });

      const mergedThemes = Array.from(
        new Set([
          ...themeResult.themes.map((t) => t.theme),
          ...reflectionResult.recurringThemes,
        ])
      ).slice(0, 8);

      await createInnerReflectionMemory(userId, {
        periodType,
        periodLabel: windowBounds.label,
        periodStart: windowBounds.start,
        periodEnd: windowBounds.end,
        title: reflectionResult.title,
        reflectionText: reflectionResult.reflectionText,
        gentleTakeaway: reflectionResult.gentleTakeaway,
        recurringThemes: mergedThemes,
        sourceEntryIds: optedInWindowEntries.map((e) => e.entryId),
        entryCountAnalyzed: optedInWindowEntries.length,
      });

      setFeedback(
        `${
          periodType === 'weekly' ? 'Weekly' : 'Monthly'
        } AI memory reflection saved to your timeline.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to generate memory reflection right now.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveReflectionEdit = async (reflectionId: string) => {
    try {
      await updateInnerReflectionMemory(userId, reflectionId, {
        title: editTitle,
        reflectionText: editText,
        gentleTakeaway: editTakeaway,
      });
      setEditingReflectionId(null);
      setFeedback('Reflection memory updated.');
    } catch {
      setErrorMsg('Unable to update reflection.');
    }
  };

  const handleDeleteReflection = async (reflectionId: string) => {
    if (confirmDeleteReflectionId !== reflectionId) {
      setConfirmDeleteReflectionId(reflectionId);
      return;
    }
    try {
      await deleteInnerReflectionMemory(userId, reflectionId);
      setConfirmDeleteReflectionId(null);
      setFeedback('Generated reflection removed.');
    } catch {
      setErrorMsg('Unable to remove reflection.');
    }
  };

  const handleRevisitEntry = (entryId: string) => {
    setHighlightedEntryId(entryId);
    const el = document.getElementById(`inner-entry-${entryId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    window.setTimeout(() => {
      setHighlightedEntryId((curr) => (curr === entryId ? null : curr));
    }, 5000);
  };

  const entryMap = useMemo(() => {
    const map = new Map<string, InnerJournalEntry>();
    for (const e of entries) map.set(e.entryId, e);
    return map;
  }, [entries]);

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <Check className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Weekly & Monthly Reflection Generator */}
      <section className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-editorial text-2xl font-semibold text-slate-900">
              AI Memory & Reflection Studio
            </h3>
            <p className="text-xs text-slate-600">
              Synthesizes warm, non-judgmental reflections exclusively from journal entries you explicitly opt in below.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 shrink-0 self-start">
            {(['weekly', 'monthly'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPeriodType(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  periodType === mode
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'weekly' ? 'Weekly (7d)' : 'Monthly (30d)'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
          <div className="text-xs text-slate-700 space-y-0.5">
            <p className="font-semibold">
              {windowBounds.label}
            </p>
            <p className="text-slate-500">
              <span className="font-mono tabular-nums font-medium text-slate-800">
                {optedInWindowEntries.length}
              </span>{' '}
              opted-in journal {optedInWindowEntries.length === 1 ? 'entry' : 'entries'} ready in this window.
            </p>
          </div>

          <button
            type="button"
            disabled={isGenerating || !aiConsent || optedInWindowEntries.length === 0}
            onClick={handleGeneratePeriodReflection}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BookOpen className="w-4 h-4 text-amber-200" />
            )}
            <span>
              {isGenerating
                ? 'Composing gentle reflection...'
                : `Generate ${periodType === 'weekly' ? 'Weekly' : 'Monthly'} Reflection`}
            </span>
          </button>
        </div>
      </section>

      {/* Previous Reflections Timeline */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-600">
            Reflection Timeline ({reflections.length})
          </h3>
        </div>

        {reflections.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-slate-200/80 space-y-2">
            <Calendar className="w-7 h-7 text-slate-300 mx-auto" />
            <p className="font-editorial text-xl text-slate-900">
              No weekly or monthly reflections generated yet.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Opt in at least one voice or written journal entry below, enable Gemini AI consent, and tap Generate Reflection above when you are ready.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reflections.map((refl) => {
              const isEditing = editingReflectionId === refl.reflectionId;
              return (
                <article
                  key={refl.reflectionId}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-medium text-emerald-800">
                          {refl.periodType === 'monthly'
                            ? 'Monthly Reflection'
                            : 'Weekly Reflection'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{refl.periodLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {refl.entryCountAnalyzed} source entries
                        </span>
                      </div>
                      {!isEditing && (
                        <h4 className="font-editorial text-2xl font-semibold text-slate-900">
                          {refl.title}
                        </h4>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReflectionId(refl.reflectionId);
                          setEditTitle(refl.title);
                          setEditText(refl.reflectionText);
                          setEditTakeaway(refl.gentleTakeaway);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteReflection(refl.reflectionId)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium cursor-pointer ${
                          confirmDeleteReflectionId === refl.reflectionId
                            ? 'bg-rose-600 text-white border-rose-700'
                            : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>
                          {confirmDeleteReflectionId === refl.reflectionId
                            ? 'Confirm'
                            : 'Delete'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <input
                        type="text"
                        maxLength={140}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
                      />
                      <textarea
                        rows={5}
                        maxLength={4000}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800"
                      />
                      <input
                        type="text"
                        maxLength={400}
                        value={editTakeaway}
                        onChange={(e) => setEditTakeaway(e.target.value)}
                        placeholder="Gentle takeaway"
                        className="w-full rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-700"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingReflectionId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveReflectionEdit(refl.reflectionId)}
                          className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium cursor-pointer"
                        >
                          Save Memory
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {refl.reflectionText}
                      </p>

                      {refl.gentleTakeaway && (
                        <p className="text-xs text-emerald-900 bg-emerald-50/70 border border-emerald-200/70 rounded-xl px-3.5 py-2.5">
                          {refl.gentleTakeaway}
                        </p>
                      )}

                      {refl.recurringThemes.length > 0 && (
                        <p className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">
                            Recurring themes:
                          </span>{' '}
                          {refl.recurringThemes.join(' · ')}
                        </p>
                      )}

                      {refl.sourceEntryIds.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-500">
                            Revisit original entries:
                          </span>
                          {refl.sourceEntryIds.map((srcId) => {
                            const found = entryMap.get(srcId);
                            return (
                              <button
                                key={srcId}
                                type="button"
                                onClick={() => handleRevisitEntry(srcId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-medium text-slate-800 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>
                                  {found
                                    ? `${found.title || 'Entry'} (${found.recordedDate})`
                                    : 'View Entry'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Private Entries Bank & Per-Entry AI Opt-In Control */}
      <section className="space-y-3 pt-2 border-t border-slate-200/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold text-slate-700">
              Private Journal Entries & AI Opt-In Control ({entries.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Toggle per-entry AI permission to decide exactly which entries Gemini can analyze.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowTextComposer((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Write Private Entry</span>
          </button>
        </div>

        {showTextComposer && (
          <form
            onSubmit={handleCreateTextEntry}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                maxLength={140}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Optional entry title..."
                className="sm:col-span-2 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-sm text-slate-900"
              />
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <textarea
              rows={4}
              maxLength={8000}
              required
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Write your private thoughts here..."
              className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-800 leading-relaxed"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAllowAi}
                  onChange={(e) => setNewAllowAi(e.target.checked)}
                />
                <span>Allow AI analysis for this entry</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTextComposer(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingText || newText.trim().length < 5}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium cursor-pointer"
                >
                  {isSavingText ? 'Saving...' : 'Save Private Entry'}
                </button>
              </div>
            </div>
          </form>
        )}

        {entries.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-slate-200/80 space-y-2">
            <BookOpen className="w-7 h-7 text-slate-300 mx-auto" />
            <p className="font-editorial text-xl text-slate-900">
              Your private Inner Garden journal is empty.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Record a voice note in Voice Journal or write a private entry above to start building your timeline.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {entries.map((entry) => {
              const isHighlighted = highlightedEntryId === entry.entryId;
              return (
                <article
                  key={entry.entryId}
                  id={`inner-entry-${entry.entryId}`}
                  className={`p-4 rounded-2xl border transition-all space-y-2 ${
                    isHighlighted
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-200'
                      : 'bg-white border-slate-200/80'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>{entry.recordedDate}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {entry.entryKind === 'voice'
                            ? 'Voice Note'
                            : entry.entryKind === 'voice_and_text'
                            ? 'Voice & Transcript'
                            : 'Written Entry'}
                        </span>
                        {entry.primaryEmotion && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-800 font-medium">
                              {entry.primaryEmotion}
                            </span>
                          </>
                        )}
                      </div>
                      <h4 className="font-editorial text-lg font-semibold text-slate-900">
                        {entry.title || 'Private Reflection'}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleEntryAiOptIn(entry)}
                        aria-pressed={entry.allowAiAnalysis}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium cursor-pointer transition-colors ${
                          entry.allowAiAnalysis
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        <span>
                          {entry.allowAiAnalysis ? 'AI Opted-In' : 'Excluded from AI'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteInnerJournalEntry(userId, entry.entryId)}
                        aria-label="Delete entry"
                        className="p-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {entry.transcript ? (
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {entry.transcript}
                    </p>
                  ) : (
                    <p className="text-xs italic text-slate-400">
                      Audio-only clip (no written transcript stored).
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
