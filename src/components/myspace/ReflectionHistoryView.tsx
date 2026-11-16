import React, { useMemo, useState } from 'react';
import {
  Calendar,
  BookOpen,
  Mic,
  Bookmark,
  Clock,
  Filter,
} from 'lucide-react';
import {
  DiaryEntry,
  SavedMemory,
  VoiceJournal,
} from '../../types/garden';

interface ReflectionHistoryViewProps {
  diaryEntries: DiaryEntry[];
  voiceJournals: VoiceJournal[];
  memories: SavedMemory[];
}

type TimelineItem =
  | {
      kind: 'diary';
      id: string;
      dateObj: Date;
      dateIso: string;
      title: string;
      subtitle: string;
      body: string;
      tag: string;
    }
  | {
      kind: 'voice';
      id: string;
      dateObj: Date;
      dateIso: string;
      title: string;
      subtitle: string;
      audioDataUrl: string;
      durationSeconds: number;
    }
  | {
      kind: 'memory';
      id: string;
      dateObj: Date;
      dateIso: string;
      title: string;
      subtitle: string;
      body: string;
      folder: string;
    };

function toIsoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const ReflectionHistoryView: React.FC<ReflectionHistoryViewProps> = ({
  diaryEntries,
  voiceJournals,
  memories,
}) => {
  const [kindFilter, setKindFilter] = useState<
    'all' | 'diary' | 'voice' | 'memory'
  >('all');
  const [dateRangePreset, setDateRangePreset] = useState<
    'all' | '7d' | '30d' | 'custom'
  >('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const timeline = useMemo(() => {
    const combined: TimelineItem[] = [];

    for (const d of diaryEntries) {
      combined.push({
        kind: 'diary',
        id: `d_${d.entryId}`,
        dateObj: d.createdAt,
        dateIso: d.entryDate || toIsoDay(d.createdAt),
        title: d.title || 'Untitled Diary Entry',
        subtitle: 'Personal Diary',
        body: d.content,
        tag: d.moodTag || 'Quiet',
      });
    }

    for (const v of voiceJournals) {
      combined.push({
        kind: 'voice',
        id: `v_${v.voiceId}`,
        dateObj: v.createdAt,
        dateIso: v.recordedDate || toIsoDay(v.createdAt),
        title: v.title || 'Private Voice Note',
        subtitle: 'Voice Journal',
        audioDataUrl: v.audioDataUrl,
        durationSeconds: v.durationSeconds,
      });
    }

    for (const m of memories) {
      combined.push({
        kind: 'memory',
        id: `m_${m.memoryId}`,
        dateObj: m.savedAt,
        dateIso: toIsoDay(m.savedAt),
        title: m.title || m.anonymousLabel,
        subtitle: `Saved Memory · ${m.anonymousLabel}`,
        body: m.excerpt,
        folder: m.folder,
      });
    }

    combined.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    const nowMs = Date.now();
    return combined.filter((item) => {
      if (kindFilter !== 'all' && item.kind !== kindFilter) return false;
      if (dateRangePreset === '7d') {
        return nowMs - item.dateObj.getTime() <= 7 * 24 * 60 * 60 * 1000;
      }
      if (dateRangePreset === '30d') {
        return nowMs - item.dateObj.getTime() <= 30 * 24 * 60 * 60 * 1000;
      }
      if (dateRangePreset === 'custom') {
        if (fromDate && item.dateIso < fromDate) return false;
        if (toDate && item.dateIso > toDate) return false;
      }
      return true;
    });
  }, [diaryEntries, voiceJournals, memories, kindFilter, dateRangePreset, fromDate, toDate]);

  return (
    <div className="space-y-5">
      {/* Descriptive Banner (Strictly Non-Clinical) */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-600" />
          <span>Chronological Personal Timeline</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Revisit your diary pages, voice recordings, and keepsake memories over
          time at your own pace. Everything here is simply organized by date.
        </p>
      </div>

      {/* Filters */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: 'All Moments' },
                { id: 'diary', label: 'Diary' },
                { id: 'voice', label: 'Voice' },
                { id: 'memory', label: 'Memories' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setKindFilter(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  kindFilter === opt.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'custom', label: 'By Date' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDateRangePreset(preset.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  dateRangePreset === preset.id
                    ? 'bg-rose-100 text-rose-900 border border-rose-200'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {dateRangePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Chronological Timeline List */}
      {timeline.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white/80 border border-slate-200/70 space-y-2">
          <Calendar className="w-7 h-7 text-slate-300 mx-auto" />
          <p className="font-editorial text-lg text-slate-800">
            No reflections match this filter yet.
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            As you write in your diary, record voice notes, or bookmark
            keepsakes, they will gather here in order.
          </p>
        </div>
      ) : (
        <div className="relative pl-5 sm:pl-6 space-y-3.5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-rose-200/80">
          {timeline.map((item) => (
            <div
              key={item.id}
              className="relative p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2"
            >
              <span
                aria-hidden="true"
                className={`absolute -left-[22px] sm:-left-[26px] top-5 w-3 h-3 rounded-full border-2 border-white shadow-2xs ${
                  item.kind === 'diary'
                    ? 'bg-rose-400'
                    : item.kind === 'voice'
                    ? 'bg-sky-400'
                    : 'bg-amber-400'
                }`}
              />

              <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  {item.kind === 'diary' && (
                    <BookOpen className="w-3.5 h-3.5 text-rose-500" />
                  )}
                  {item.kind === 'voice' && (
                    <Mic className="w-3.5 h-3.5 text-sky-600" />
                  )}
                  {item.kind === 'memory' && (
                    <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>{item.subtitle}</span>
                </span>
                <span className="tabular-nums">{item.dateIso}</span>
              </div>

              <h4 className="font-editorial text-lg font-semibold text-slate-900">
                {item.title}
              </h4>

              {item.kind === 'diary' && (
                <>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {item.body}
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[10px] font-medium">
                    {item.tag}
                  </span>
                </>
              )}

              {item.kind === 'voice' && (
                <div className="space-y-1.5">
                  {item.audioDataUrl && (
                    <audio
                      controls
                      src={item.audioDataUrl}
                      className="w-full h-10"
                    />
                  )}
                  <p className="text-[11px] text-slate-500">
                    Duration: {item.durationSeconds}s
                  </p>
                </div>
              )}

              {item.kind === 'memory' && (
                <>
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    “{item.body}”
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-medium">
                    Folder: {item.folder}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
