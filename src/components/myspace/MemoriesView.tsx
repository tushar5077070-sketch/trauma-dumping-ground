import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  FolderOpen,
  Pencil,
  Trash2,
  Heart,
  BookOpen,
  MessageCircleHeart,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  MEMORY_FOLDERS,
  MemoryFolder,
  SavedMemory,
} from '../../types/garden';
import {
  deleteSavedMemory,
  updateSavedMemory,
} from '../../services/secretGardenService';

interface MemoriesViewProps {
  userId: string;
  memories: SavedMemory[];
}

export const MemoriesView: React.FC<MemoriesViewProps> = ({
  userId,
  memories,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<'All' | MemoryFolder>(
    'All'
  );
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editFolder, setEditFolder] = useState<MemoryFolder>('Unsorted');
  const [editNote, setEditNote] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (selectedFolder === 'All') return memories;
    return memories.filter((m) => m.folder === selectedFolder);
  }, [memories, selectedFolder]);

  const startEdit = (mem: SavedMemory) => {
    setEditingMemoryId(mem.memoryId);
    setEditFolder(mem.folder);
    setEditNote(mem.personalNote || '');
    setEditTitle(mem.title || '');
    setFeedback(null);
    setErrorMsg(null);
  };

  const handleSaveEdit = async (memoryId: string) => {
    try {
      await updateSavedMemory(userId, memoryId, {
        folder: editFolder,
        personalNote: editNote,
        title: editTitle,
      });
      setEditingMemoryId(null);
      setFeedback('Keepsake organization updated.');
    } catch {
      setErrorMsg('Unable to update memory right now.');
    }
  };

  const handleRemove = async (memoryId: string) => {
    if (confirmDeleteId !== memoryId) {
      setConfirmDeleteId(memoryId);
      return;
    }
    try {
      await deleteSavedMemory(userId, memoryId);
      setConfirmDeleteId(null);
      setFeedback('Removed from My Memories.');
    } catch {
      setErrorMsg('Unable to remove saved item.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Info Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900">
          <Bookmark className="w-3.5 h-3.5 text-amber-700" />
          <span>My Memories Collection</span>
        </div>
        <p className="text-xs text-amber-950/80 leading-relaxed">
          Keep meaningful community stories, kind replies left by strangers,
          and your own diary pages gathered in one quiet place. Community
          authors always remain strictly anonymous.
        </p>
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

      {/* Folder Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(['All', ...MEMORY_FOLDERS] as const).map((folder) => {
          const count =
            folder === 'All'
              ? memories.length
              : memories.filter((m) => m.folder === folder).length;
          return (
            <button
              key={folder}
              type="button"
              onClick={() => setSelectedFolder(folder)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                selectedFolder === folder
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>
                {folder} ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Saved List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white/80 border border-slate-200/70 space-y-2">
          <Bookmark className="w-7 h-7 text-amber-300 mx-auto" />
          <p className="font-editorial text-lg text-slate-800">
            No saved keepsakes in this folder yet.
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            While reading any flower story in the meadow or writing in your
            Personal Diary, tap the bookmark button to save words that spoke to
            you.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((mem) => {
            const isEditing = editingMemoryId === mem.memoryId;
            return (
              <div
                key={mem.memoryId}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {mem.sourceType === 'community_story' && (
                          <>
                            <Heart className="w-3 h-3 text-rose-500" />
                            <span>Community Story</span>
                          </>
                        )}
                        {mem.sourceType === 'supportive_reply' && (
                          <>
                            <MessageCircleHeart className="w-3 h-3 text-sky-600" />
                            <span>Supportive Reply</span>
                          </>
                        )}
                        {mem.sourceType === 'diary_entry' && (
                          <>
                            <BookOpen className="w-3 h-3 text-emerald-600" />
                            <span>Personal Diary</span>
                          </>
                        )}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70 font-medium">
                        {mem.folder}
                      </span>
                      <span className="text-slate-500 font-medium">
                        {mem.anonymousLabel}
                      </span>
                    </div>

                    {!isEditing && mem.title && (
                      <h4 className="font-editorial text-lg font-semibold text-slate-900">
                        {mem.title}
                      </h4>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(mem)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-600 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Organize</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemove(mem.memoryId)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                        confirmDeleteId === mem.memoryId
                          ? 'bg-rose-600 text-white border-rose-700'
                          : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {confirmDeleteId === mem.memoryId && <span>Confirm</span>}
                    </button>
                  </div>
                </div>

                <blockquote className="text-sm text-slate-700 leading-relaxed italic border-l-2 border-rose-200 pl-3.5">
                  “{mem.excerpt}”
                </blockquote>

                {isEditing ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Folder
                        </label>
                        <select
                          value={editFolder}
                          onChange={(e) =>
                            setEditFolder(e.target.value as MemoryFolder)
                          }
                          className="w-full rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-800"
                        >
                          {MEMORY_FOLDERS.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Keepsake Title
                        </label>
                        <input
                          type="text"
                          maxLength={140}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Private Reminder Note (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={300}
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="Why this mattered to you..."
                        className="w-full rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-800"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingMemoryId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-200/70 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(mem.memoryId)}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  mem.personalNote && (
                    <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                      <strong>Note:</strong> {mem.personalNote}
                    </p>
                  )
                )}

                <p className="text-[11px] text-slate-400">
                  Saved{' '}
                  {mem.savedAt.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
