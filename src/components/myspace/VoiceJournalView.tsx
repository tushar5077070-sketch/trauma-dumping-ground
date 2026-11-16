import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Square,
  Pause,
  Play,
  Trash2,
  Pencil,
  Check,
  AlertCircle,
  Volume2,
  Lock,
} from 'lucide-react';
import { VoiceJournal } from '../../types/garden';
import {
  createVoiceJournal,
  deleteVoiceJournal,
  getTodayIsoDate,
  updateVoiceJournalTitle,
} from '../../services/secretGardenService';

interface VoiceJournalViewProps {
  userId: string;
  recordings: VoiceJournal[];
}

const MAX_SECONDS_CLOUD_SYNC = 90;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const VoiceJournalView: React.FC<VoiceJournalViewProps> = ({
  userId,
  recordings,
}) => {
  const [recordingState, setRecordingState] = useState<
    'idle' | 'recording' | 'paused' | 'preview'
  >('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);
  const [pendingMimeType, setPendingMimeType] = useState('audio/webm');
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const secondsRef = useRef(0);

  const cleanupStream = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      secondsRef.current += 1;
      setElapsedSeconds(secondsRef.current);
      if (secondsRef.current >= MAX_SECONDS_CLOUD_SYNC) {
        handleStopRecording();
      }
    }, 1000);
  };

  const handleStartRecording = async () => {
    setErrorMsg(null);
    setFeedback(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setErrorMsg(
        'Voice recording is not supported in this browser. Try Chrome, Edge, Safari, or Firefox.'
      );
      return;
    }

    try {
      // Request microphone access ONLY when the user explicitly presses Record
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      const chosenMime =
        preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

      const recorder = chosenMime
        ? new MediaRecorder(stream, {
            mimeType: chosenMime,
            audioBitsPerSecond: 16000,
          })
        : new MediaRecorder(stream, { audioBitsPerSecond: 16000 });

      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || chosenMime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          setPendingAudioUrl(dataUrl);
          setPendingMimeType(mime);
          setRecordingState('preview');
        };
        reader.readAsDataURL(blob);
        cleanupStream();
      };

      mediaRecorderRef.current = recorder;
      secondsRef.current = 0;
      setElapsedSeconds(0);
      setPendingAudioUrl(null);
      recorder.start(500);
      setRecordingState('recording');
      startTimer();
    } catch (err) {
      cleanupStream();
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('denied') || msg.includes('NotAllowed')) {
        setErrorMsg(
          'Microphone permission was declined. Allow microphone access in your browser settings whenever you feel ready to record.'
        );
      } else {
        setErrorMsg('Could not access a microphone on this device.');
      }
    }
  };

  const handlePauseOrResume = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (recordingState === 'recording' && rec.state === 'recording') {
      rec.pause();
      stopTimer();
      setRecordingState('paused');
    } else if (recordingState === 'paused' && rec.state === 'paused') {
      rec.resume();
      startTimer();
      setRecordingState('recording');
    }
  };

  const handleStopRecording = () => {
    stopTimer();
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    } else {
      cleanupStream();
      setRecordingState('idle');
    }
  };

  const handleDiscardPreview = () => {
    setPendingAudioUrl(null);
    setTitle('');
    setElapsedSeconds(0);
    secondsRef.current = 0;
    setRecordingState('idle');
  };

  const handleSaveRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAudioUrl || isSaving) return;
    setIsSaving(true);
    setErrorMsg(null);
    setFeedback(null);

    try {
      await createVoiceJournal(userId, {
        title: title.trim() || 'Private Voice Note',
        durationSeconds: Math.max(1, elapsedSeconds),
        mimeType: pendingMimeType,
        audioDataUrl: pendingAudioUrl,
        recordedDate: getTodayIsoDate(),
      });
      setFeedback('Voice journal saved securely to your private sanctuary.');
      handleDiscardPreview();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not save voice recording right now.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRename = async (voiceId: string) => {
    try {
      await updateVoiceJournalTitle(
        userId,
        voiceId,
        editTitleValue.trim() || 'Private Voice Note'
      );
      setEditingId(null);
      setFeedback('Recording title updated.');
    } catch {
      setErrorMsg('Unable to update title.');
    }
  };

  const handleDelete = async (voiceId: string) => {
    if (confirmDeleteId !== voiceId) {
      setConfirmDeleteId(voiceId);
      return;
    }
    try {
      await deleteVoiceJournal(userId, voiceId);
      setConfirmDeleteId(null);
      setFeedback('Voice journal deleted.');
    } catch {
      setErrorMsg('Failed to remove recording.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Privacy Notice */}
      <div className="p-4 rounded-2xl bg-sky-50/75 border border-sky-200/75 flex items-start gap-3">
        <Lock className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-950/85 space-y-0.5 leading-relaxed">
          <p className="font-semibold">Private Voice Sanctuary</p>
          <p>
            Microphone access is only requested when you tap{' '}
            <strong>Start Recording</strong>. Saved voice notes up to{' '}
            {MAX_SECONDS_CLOUD_SYNC} seconds are encrypted in transit and stored
            strictly under your owner-only Firestore subcollection.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Recording Studio Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-rose-100 shadow-xs text-center space-y-4">
        <div className="flex flex-col items-center justify-center space-y-2">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              recordingState === 'recording'
                ? 'bg-rose-100 text-rose-600 ring-8 ring-rose-50 animate-pulse'
                : recordingState === 'paused'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Mic className="w-7 h-7" />
          </div>

          <div className="space-y-0.5">
            <p className="font-mono text-xl font-semibold text-slate-900 tabular-nums">
              {formatTimer(elapsedSeconds)}{' '}
              <span className="text-xs font-normal text-slate-400">
                / {formatTimer(MAX_SECONDS_CLOUD_SYNC)}
              </span>
            </p>
            <p className="text-xs text-slate-500">
              {recordingState === 'idle' &&
                'Ready when you are. Speak softly — no one else can hear.'}
              {recordingState === 'recording' &&
                'Recording in progress...'}
              {recordingState === 'paused' && 'Recording paused.'}
              {recordingState === 'preview' &&
                'Listen to your recording or give it a title to keep.'}
            </p>
          </div>
        </div>

        {/* Recording Controls */}
        {recordingState === 'idle' && (
          <button
            type="button"
            onClick={handleStartRecording}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <Mic className="w-4 h-4 text-rose-300" />
            <span>Start Recording</span>
          </button>
        )}

        {(recordingState === 'recording' || recordingState === 'paused') && (
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handlePauseOrResume}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-medium transition-colors cursor-pointer"
            >
              {recordingState === 'recording' ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleStopRecording}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Stop & Review</span>
            </button>
          </div>
        )}

        {recordingState === 'preview' && pendingAudioUrl && (
          <form
            onSubmit={handleSaveRecording}
            className="max-w-md mx-auto space-y-3 pt-2 text-left"
          >
            <audio
              controls
              src={pendingAudioUrl}
              className="w-full h-10"
            />

            <div>
              <label
                htmlFor="voice-title"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Optional Title
              </label>
              <input
                id="voice-title"
                type="text"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Late evening thought..."
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleDiscardPreview}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Recording'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Saved Recordings List */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-600">
          Saved Voice Notes ({recordings.length})
        </h3>

        {recordings.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white/80 border border-slate-200/70 space-y-2">
            <Volume2 className="w-7 h-7 text-sky-300 mx-auto" />
            <p className="font-editorial text-lg text-slate-800">
              No voice journals yet.
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Record a brief note whenever putting words onto paper feels a little too tiring.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((rec) => (
              <div
                key={rec.voiceId}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {editingId === rec.voiceId ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={120}
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(rec.voiceId)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-xs text-slate-500 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <h4 className="font-editorial text-lg font-semibold text-slate-900 truncate">
                        {rec.title || 'Private Voice Note'}
                      </h4>
                    )}
                    <p className="text-[11px] text-slate-500">
                      {rec.recordedDate ||
                        rec.createdAt.toLocaleDateString()}{' '}
                      · {formatTimer(rec.durationSeconds)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(rec.voiceId);
                        setEditTitleValue(rec.title);
                      }}
                      aria-label="Rename recording"
                      className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(rec.voiceId)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-colors cursor-pointer ${
                        confirmDeleteId === rec.voiceId
                          ? 'bg-rose-600 text-white border-rose-700'
                          : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {confirmDeleteId === rec.voiceId && <span>Confirm</span>}
                    </button>
                  </div>
                </div>

                {rec.audioDataUrl && (
                  <audio
                    controls
                    src={rec.audioDataUrl}
                    className="w-full h-10"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
