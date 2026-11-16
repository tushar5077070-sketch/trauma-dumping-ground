import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Lock,
  Check,
  AlertCircle,
} from 'lucide-react';
import { DIARY_MOOD_TAGS, DiaryEntry } from '../../types/garden';
import {
  createDiaryEntry,
  deleteDiaryEntry,
  getTodayIsoDate,
  saveDiaryEntryAsMemory,
  updateDiaryEntry,
} from '../../services/secretGardenService';

interface PersonalDiaryViewProps {
  userId: string;
  entries: DiaryEntry[];
}

export const PersonalDiaryView: React.FC<PersonalDiaryViewProps> = ({
  userId,
  entries,
}) => {
  const [showComposer, setShowComposer] = useState(entries.length === 0);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [moodTag, setMoodTag] = useState('Quiet');
  const [entryDate, setEntryDate] = useState(() => getTodayIsoDate());
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setEditingEntryId(null);
    setTitle('');
    setContent('');
    setMoodTag('Quiet');
    setEntryDate(getTodayIsoDate());
    setShowComposer(false);
  };

  const openEdit = (entry: DiaryEntry) => {
    setEditingEntryId(entry.entryId);
    setTitle(entry.title);
    setContent(entry.content);
    setMoodTag(entry.moodTag || 'Quiet');
    setEntryDate(entry.entryDate || getTodayIsoDate());
    setShowComposer(true);
    setErrorMsg(null);
    setFeedback(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 1 || isSaving) return;
    setIsSaving(true);
    setErrorMsg(null);
    setFeedback(null);

    try {
      if (editingEntryId) {
        await updateDiaryEntry(userId, editingEntryId, {
          title,
          content,
          moodTag,
          entryDate,
        });
        setFeedback('Diary entry updated privately.');
      } else {
        await createDiaryEntry(userId, {
          title,
          content,
          moodTag,
          entryDate,
        });
        setFeedback('Entry saved to your private diary.');
      }
      resetForm();
    } catch {
      setErrorMsg('Unable to save diary entry right now. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (confirmDeleteId !== entryId) {
      setConfirmDeleteId(entryId);
      return;
    }
    try {
      await deleteDiaryEntry(userId, entryId);
      setConfirmDeleteId(null);
      setFeedback('Diary entry permanently removed from your space.');
    } catch {
      setErrorMsg('Failed to remove diary entry.');
    }
  };

  const handleBookmarkToMemory = async (entry: DiaryEntry) => {
    try {
      await saveDiaryEntryAsMemory(userId, entry, 'Personal Milestones');
      setFeedback('Saved to My Memories under Personal Milestones.');
    } catch {
      setErrorMsg('Could not bookmark this entry right now.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Privacy Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/75">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
            <Lock className="w-3.5 h-3.5 text-emerald-700" />
            <span>Strictly Private Digital Diary</span>
          </div>
          <p className="text-xs text-emerald-900/80">
            Entries written here are stored privately under your account and never appear in the public meadow.
          </p>
        </div>

        {!showComposer && (
          <button
            type="button"
            onClick={() => {
              setEditingEntryId(null);
              setTitle('');
              setContent('');
              setEntryDate(getTodayIsoDate());
              setShowComposer(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Entry</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Composer / Editor */}
      {showComposer && (
        <form
          onSubmit={handleSave}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-rose-100 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-editorial text-xl font-semibold text-slate-900">
              {editingEntryId ? 'Edit Private Entry' : 'Write a Private Reflection'}
            </h3>
            {entries.length > 0 && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="diary-title"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Optional Title
              </label>
              <input
                id="diary-title"
                type="text"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give this moment a quiet name..."
                className="w-full rounded-xl bg-slate-50/70 border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>

            <div>
              <label
                htmlFor="diary-date"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Date
              </label>
              <input
                id="diary-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full rounded-xl bg-slate-50/70 border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium text-slate-600 mb-1.5">
              Personal Note Label (Optional)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DIARY_MOOD_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setMoodTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    moodTag === tag
                      ? 'bg-rose-100 text-rose-900 border border-rose-300'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="diary-content"
                className="text-[11px] font-medium text-slate-600"
              >
                Your Thoughts
              </label>
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                {content.length} / 5000
              </span>
            </div>
            <textarea
              id="diary-content"
              rows={6}
              maxLength={5000}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write freely without worrying how it sounds to anyone else..."
              className="w-full rounded-2xl bg-slate-50/70 border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 leading-relaxed focus:outline-none focus:ring-2 focus:ring-rose-200 resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={isSaving || content.trim().length === 0}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              {isSaving
                ? 'Saving privately...'
                : editingEntryId
                ? 'Update Entry'
                : 'Save Private Entry'}
            </button>
          </div>
        </form>
      )}

      {/* Diary History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-600">
            Saved Diary Pages ({entries.length})
          </h3>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white/80 border border-slate-200/70 space-y-2">
            <BookOpen className="w-7 h-7 text-rose-300 mx-auto" />
            <p className="font-editorial text-lg text-slate-800">
              Your diary is quiet and waiting.
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Whenever you want to write something just for yourself, your pages will appear softly here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <article
                key={entry.entryId}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-medium text-slate-500">
                        {entry.entryDate ||
                          entry.createdAt.toLocaleDateString()}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200/70 text-[10px] font-medium">
                        {entry.moodTag || 'Quiet'}
                      </span>
                    </div>
                    <h4 className="font-editorial text-xl font-semibold text-slate-900 mt-1">
                      {entry.title || 'Untitled Reflection'}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleBookmarkToMemory(entry)}
                      title={
                        entry.isMemorySaved
                          ? 'Saved in My Memories'
                          : 'Save to My Memories'
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-colors cursor-pointer ${
                        entry.isMemorySaved
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {entry.isMemorySaved ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" />
                          <span className="hidden sm:inline">In Memories</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Save Memory</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEdit(entry)}
                      className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                      aria-label="Edit diary entry"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(entry.entryId)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-colors cursor-pointer ${
                        confirmDeleteId === entry.entryId
                          ? 'bg-rose-600 text-white border-rose-700'
                          : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {confirmDeleteId === entry.entryId && (
                        <span>Confirm</span>
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {entry.content}
                </p>

                <p className="text-[11px] text-slate-400">
                  Saved{' '}
                  {entry.updatedAt.toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
