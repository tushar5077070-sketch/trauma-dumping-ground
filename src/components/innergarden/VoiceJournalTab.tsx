import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Pause,
  Play,
  Square,
  Sparkles,
  Trash2,
  Pencil,
  Check,
  AlertCircle,
  Loader2,
  FileAudio,
  FileText,
  VolumeX,
} from 'lucide-react';
import {
  InnerAiServerStatus,
  InnerEmotionItem,
  InnerEntryKind,
  InnerJournalEntry,
  InnerPrivacyPrefs,
  InnerStorageChoice,
} from '../../types/garden';
import {
  classifyEmotionWithGemini,
  generateReflectionWithGemini,
  summarizeJournalWithGemini,
  transcribeAudioWithGemini,
} from '../../services/innerGardenAiService';
import {
  createInnerJournalEntry,
  deleteInnerJournalEntry,
  saveInnerPrivacyPrefs,
  updateInnerJournalEntry,
} from '../../services/innerGardenService';
import { getTodayIsoDate } from '../../services/secretGardenService';

interface VoiceJournalTabProps {
  userId: string;
  entries: InnerJournalEntry[];
  prefs: InnerPrivacyPrefs | null;
  aiStatus: InnerAiServerStatus | null;
}

const MAX_RECORDING_SECONDS = 90;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const VoiceJournalTab: React.FC<VoiceJournalTabProps> = ({
  userId,
  entries,
  prefs,
  aiStatus,
}) => {
  const [recordingState, setRecordingState] = useState<
    'idle' | 'recording' | 'paused' | 'preview'
  >('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);
  const [pendingMimeType, setPendingMimeType] = useState('audio/webm');

  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [recordedDate, setRecordedDate] = useState(() => getTodayIsoDate());
  const [storageChoice, setStorageChoice] = useState<InnerStorageChoice>('both');
  const [allowAiForEntry, setAllowAiForEntry] = useState(false);

  const [processingLabel, setProcessingLabel] = useState<string | null>(null);
  const [draftAiSummary, setDraftAiSummary] = useState('');
  const [draftAiReflection, setDraftAiReflection] = useState('');
  const [draftPrimaryEmotion, setDraftPrimaryEmotion] = useState('');
  const [draftEmotions, setDraftEmotions] = useState<InnerEmotionItem[]>([]);
  const [draftThemes, setDraftThemes] = useState<string[]>([]);
  const [draftEmotionNote, setDraftEmotionNote] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTranscript, setEditTranscript] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const secondsRef = useRef(0);

  const aiConsent = Boolean(prefs?.allowAiProcessingConsent);
  const audioConsent = Boolean(prefs?.allowAudioStorageConsent);

  const stopWaveformLoop = () => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  };

  const cleanupMedia = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopWaveformLoop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, []);

  // Draw calm baseline whenever idle/paused/preview
  useEffect(() => {
    if (recordingState === 'recording') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const bars = 40;
    const barWidth = 4;
    const gap = (w - bars * barWidth) / (bars - 1);
    ctx.fillStyle = recordingState === 'paused' ? '#f59e0b' : '#cbd5e1';

    for (let i = 0; i < bars; i++) {
      const x = i * (barWidth + gap);
      const barH = recordingState === 'paused' ? 10 : 6;
      const y = (h - barH) / 2;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 2);
      ctx.fill();
    }
  }, [recordingState]);

  const startWaveformVisualization = (stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas || !analyserRef.current) return;
        const c = canvas.getContext('2d');
        if (!c) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const w = canvas.width;
        const h = canvas.height;
        c.clearRect(0, 0, w, h);

        const bars = 40;
        const barWidth = 4;
        const gap = (w - bars * barWidth) / (bars - 1);

        for (let i = 0; i < bars; i++) {
          const val = dataArray[i % dataArray.length] / 255;
          const barH = Math.max(6, Math.round(val * (h - 10)));
          const x = i * (barWidth + gap);
          const y = (h - barH) / 2;
          c.fillStyle = val > 0.35 ? '#e11d48' : '#0f766e';
          c.beginPath();
          c.roundRect(x, y, barWidth, barH, 2);
          c.fill();
        }
        animFrameRef.current = requestAnimationFrame(draw);
      };

      animFrameRef.current = requestAnimationFrame(draw);
    } catch {
      // AudioContext unavailable in restricted mode; timer still works
    }
  };

  const startTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      secondsRef.current += 1;
      setElapsedSeconds(secondsRef.current);
      if (secondsRef.current >= MAX_RECORDING_SECONDS) {
        handleStopRecording();
      }
    }, 1000);
  };

  const resetDraft = () => {
    setPendingAudioUrl(null);
    setTitle('');
    setTranscript('');
    setRecordedDate(getTodayIsoDate());
    setElapsedSeconds(0);
    secondsRef.current = 0;
    setDraftAiSummary('');
    setDraftAiReflection('');
    setDraftPrimaryEmotion('');
    setDraftEmotions([]);
    setDraftThemes([]);
    setDraftEmotionNote('');
    setRecordingState('idle');
  };

  const runTranscription = async (dataUrl: string, mime: string) => {
    if (!aiConsent) {
      return;
    }
    if (aiStatus && !aiStatus.configured) {
      setStatusError(
        'Server GEMINI_API_KEY is missing. You can still type or edit your transcript manually or save your audio.'
      );
      return;
    }

    setProcessingLabel('Transcribing voice note with Gemini...');
    setStatusError(null);
    try {
      const result = await transcribeAudioWithGemini({
        audioBase64: dataUrl,
        mimeType: mime,
        aiConsent: true,
      });
      if (result.transcript) {
        setTranscript(result.transcript);
        setFeedback('Voice note transcribed. Feel free to review or edit before saving.');
      } else {
        setStatusError(
          'No clear speech was detected in this clip. You can type your thoughts manually or re-record.'
        );
      }
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'Transcription failed.'
      );
    } finally {
      setProcessingLabel(null);
    }
  };

  const handleStartRecording = async () => {
    setStatusError(null);
    setFeedback(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setStatusError(
        'Microphone recording is not supported in this browser. Try Chrome, Edge, Safari, or Firefox.'
      );
      return;
    }

    try {
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
          if (aiConsent && dataUrl) {
            void runTranscription(dataUrl, mime);
          }
        };
        reader.readAsDataURL(blob);
        cleanupMedia();
      };

      mediaRecorderRef.current = recorder;
      secondsRef.current = 0;
      setElapsedSeconds(0);
      setPendingAudioUrl(null);
      setTranscript('');
      setDraftAiSummary('');
      setDraftAiReflection('');
      setDraftPrimaryEmotion('');
      setDraftEmotions([]);
      setDraftEmotionNote('');

      recorder.start(500);
      setRecordingState('recording');
      setAllowAiForEntry(aiConsent);
      startWaveformVisualization(stream);
      startTimer();
    } catch (err) {
      cleanupMedia();
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('denied') || msg.includes('NotAllowed')) {
        setStatusError(
          'Microphone access was declined. Enable microphone permission in your browser when ready.'
        );
      } else {
        setStatusError('Could not access a microphone on this device.');
      }
    }
  };

  const handlePauseOrResume = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (recordingState === 'recording' && rec.state === 'recording') {
      rec.pause();
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setRecordingState('paused');
    } else if (recordingState === 'paused' && rec.state === 'paused') {
      rec.resume();
      setRecordingState('recording');
      if (streamRef.current) startWaveformVisualization(streamRef.current);
      startTimer();
    }
  };

  const handleStopRecording = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    } else {
      cleanupMedia();
      setRecordingState('idle');
    }
  };

  const handleGenerateAiInsights = async () => {
    if (!aiConsent) {
      setStatusError(
        'Turn on Gemini AI consent in the controls above before analyzing this entry.'
      );
      return;
    }
    if (transcript.trim().length < 8) {
      setStatusError(
        'Please transcribe or write at least a few words before requesting an AI reflection.'
      );
      return;
    }

    setProcessingLabel('Running Gemini summary, emotional tone & gentle reflection...');
    setStatusError(null);
    setFeedback(null);

    try {
      const [sumRes, emoRes, reflRes] = await Promise.all([
        summarizeJournalWithGemini({
          text: transcript,
          title,
          entryDate: recordedDate,
          aiConsent: true,
        }),
        classifyEmotionWithGemini({
          text: transcript,
          aiConsent: true,
        }),
        generateReflectionWithGemini({
          mode: 'entry',
          singleText: transcript,
          aiConsent: true,
        }),
      ]);

      setDraftAiSummary(sumRes.summary);
      if (!title.trim() && sumRes.suggestedTitle) {
        setTitle(sumRes.suggestedTitle);
      }
      setDraftPrimaryEmotion(emoRes.primaryEmotion);
      setDraftEmotions(emoRes.emotions);
      setDraftEmotionNote(emoRes.interpretationNote);
      setDraftAiReflection(reflRes.reflectionText);
      setDraftThemes(reflRes.recurringThemes);
      setAllowAiForEntry(true);
      setFeedback('Gemini reflection and emotional interpretation added below.');
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'Unable to run AI reflection right now.'
      );
    } finally {
      setProcessingLabel(null);
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const wantsAudio = storageChoice === 'audio' || storageChoice === 'both';
    if (wantsAudio && !audioConsent) {
      setStatusError(
        'Please enable "Store Private Audio Clips" consent above, or choose "Transcript Only".'
      );
      return;
    }

    if (wantsAudio && !pendingAudioUrl) {
      setStatusError('No audio clip recorded. Switch to Transcript Only or record audio first.');
      return;
    }

    if (storageChoice !== 'audio' && transcript.trim().length === 0) {
      setStatusError(
        'Please write or transcribe text before saving as Transcript Only or Both.'
      );
      return;
    }

    setIsSaving(true);
    setStatusError(null);
    setFeedback(null);

    try {
      const entryKind: InnerEntryKind =
        storageChoice === 'both'
          ? 'voice_and_text'
          : storageChoice === 'audio'
          ? 'voice'
          : 'text';

      await createInnerJournalEntry(userId, {
        entryKind,
        storageChoice,
        title: title.trim() || 'Voice Reflection',
        transcript: transcript.trim(),
        durationSeconds: pendingAudioUrl ? Math.max(1, elapsedSeconds) : 0,
        mimeType: pendingMimeType,
        audioDataUrl: wantsAudio && pendingAudioUrl ? pendingAudioUrl : '',
        recordedDate,
        allowAiAnalysis: allowAiForEntry,
        aiSummary: draftAiSummary,
        aiReflection: draftAiReflection,
        primaryEmotion: draftPrimaryEmotion,
        emotions: draftEmotions,
        themes: draftThemes,
        emotionConfidenceNote: draftEmotionNote,
      });

      setFeedback('Saved strictly inside your private My Inner Garden vault.');
      resetDraft();
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'Could not save entry right now.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleGrantAudioConsentQuick = async () => {
    try {
      await saveInnerPrivacyPrefs(userId, {
        allowAudioStorageConsent: true,
        allowAiProcessingConsent: aiConsent,
      });
      setFeedback('Private audio storage consent enabled.');
      setStatusError(null);
    } catch {
      setStatusError('Unable to update consent right now.');
    }
  };

  const handleSaveInlineEdit = async (entryId: string) => {
    try {
      await updateInnerJournalEntry(userId, entryId, {
        title: editTitle.trim() || 'Voice Reflection',
        transcript: editTranscript,
      });
      setEditingEntryId(null);
      setFeedback('Transcript and title updated.');
    } catch {
      setStatusError('Unable to update entry.');
    }
  };

  const handleRemoveAudioOnly = async (entry: InnerJournalEntry) => {
    try {
      await updateInnerJournalEntry(userId, entry.entryId, {
        audioDataUrl: '',
        durationSeconds: 0,
        mimeType: '',
        storageChoice: 'transcript',
        entryKind: 'text',
      });
      setFeedback('Audio recording deleted; transcript preserved.');
    } catch {
      setStatusError('Could not delete audio clip.');
    }
  };

  const handleRemoveTranscriptOnly = async (entry: InnerJournalEntry) => {
    try {
      await updateInnerJournalEntry(userId, entry.entryId, {
        transcript: '',
        aiSummary: '',
        aiReflection: '',
        primaryEmotion: '',
        emotions: [],
        themes: [],
        emotionConfidenceNote: '',
        storageChoice: 'audio',
        entryKind: 'voice',
      });
      setFeedback('Transcript deleted; audio clip preserved.');
    } catch {
      setStatusError('Could not delete transcript.');
    }
  };

  const handleDeleteEntireEntry = async (entryId: string) => {
    if (confirmDeleteId !== entryId) {
      setConfirmDeleteId(entryId);
      return;
    }
    try {
      await deleteInnerJournalEntry(userId, entryId);
      setConfirmDeleteId(null);
      setFeedback('Journal entry permanently deleted.');
    } catch {
      setStatusError('Failed to delete entry.');
    }
  };

  const voiceOrMixedEntries = entries.filter(
    (e) => e.audioDataUrl || e.entryKind !== 'text' || e.transcript
  );

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <Check className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {statusError && (
        <div className="flex items-start justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{statusError}</span>
          </div>
          {(storageChoice === 'audio' || storageChoice === 'both') &&
            !audioConsent && (
              <button
                type="button"
                onClick={handleGrantAudioConsentQuick}
                className="px-2.5 py-1 rounded-lg bg-rose-700 text-white text-[11px] font-medium shrink-0 cursor-pointer"
              >
                Enable Audio Storage
              </button>
            )}
        </div>
      )}

      {/* Recorder Studio Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 space-y-5">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                recordingState === 'recording'
                  ? 'bg-rose-600'
                  : recordingState === 'paused'
                  ? 'bg-amber-500'
                  : processingLabel
                  ? 'bg-sky-600'
                  : 'bg-slate-300'
              }`}
            />
            <span>
              {processingLabel
                ? processingLabel
                : recordingState === 'recording'
                ? 'Listening · Live Microphone Active'
                : recordingState === 'paused'
                ? 'Recording Paused'
                : recordingState === 'preview'
                ? 'Ready to Review & Save'
                : 'Ready to Record'}
            </span>
          </div>

          <canvas
            ref={canvasRef}
            width={340}
            height={56}
            aria-label="Live microphone waveform"
            className="w-full max-w-[340px] h-14 rounded-xl bg-slate-50 border border-slate-200/60"
          />

          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatTimer(elapsedSeconds)}{' '}
            <span className="text-xs font-normal text-slate-400">
              / {formatTimer(MAX_RECORDING_SECONDS)}
            </span>
          </p>

          <p className="text-xs text-slate-500 max-w-md">
            Microphone permission is only requested when you press Start Recording.
          </p>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {recordingState === 'idle' && (
              <button
                type="button"
                onClick={handleStartRecording}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                <Mic className="w-4 h-4 text-rose-300" />
                <span>Start Recording</span>
              </button>
            )}

            {(recordingState === 'recording' || recordingState === 'paused') && (
              <>
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
                  <span>Stop Recording</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Review, Transcription, AI Reflection & Storage Options */}
        {recordingState === 'preview' && pendingAudioUrl && (
          <form
            onSubmit={handleSaveEntry}
            className="pt-4 border-t border-slate-200/70 space-y-4"
          >
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-700">Audio Playback</p>
              <audio controls src={pendingAudioUrl} className="w-full h-10" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="ig-voice-title"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Optional Title
                </label>
                <input
                  id="ig-voice-title"
                  type="text"
                  maxLength={140}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give this moment a quiet name..."
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label
                  htmlFor="ig-voice-date"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Date
                </label>
                <input
                  id="ig-voice-date"
                  type="date"
                  value={recordedDate}
                  onChange={(e) => setRecordedDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            {/* Editable Transcript + Gemini Speech-to-Text trigger */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="ig-voice-transcript"
                  className="text-xs font-medium text-slate-700"
                >
                  Transcript (Editable)
                </label>

                <button
                  type="button"
                  disabled={Boolean(processingLabel) || !aiConsent}
                  onClick={() => void runTranscription(pendingAudioUrl, pendingMimeType)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  {processingLabel?.includes('Transcribing') ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  )}
                  <span>
                    {aiConsent
                      ? 'Transcribe Audio with Gemini'
                      : 'Enable AI Consent to Transcribe'}
                  </span>
                </button>
              </div>

              <textarea
                id="ig-voice-transcript"
                rows={4}
                maxLength={8000}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={
                  aiConsent
                    ? 'Your Gemini transcript will appear here, or you can edit/type freely...'
                    : 'AI consent is off — type your notes manually or enable Gemini AI above.'
                }
                className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-800 leading-relaxed resize-y"
              />
            </div>

            {/* Storage Choice */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-700">
                What would you like to save?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { id: 'both', label: 'Audio + Transcript' },
                    { id: 'transcript', label: 'Transcript Only' },
                    { id: 'audio', label: 'Audio Only' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStorageChoice(opt.id)}
                    className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                      storageChoice === opt.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Gemini Reflection & AI Opt-In */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowAiForEntry}
                  onChange={(e) => setAllowAiForEntry(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Allow Gemini to include this entry in reflections & patterns</span>
              </label>

              <button
                type="button"
                disabled={
                  Boolean(processingLabel) ||
                  !aiConsent ||
                  transcript.trim().length < 8
                }
                onClick={handleGenerateAiInsights}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
              >
                {processingLabel?.includes('summary') ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Generate AI Reflection</span>
              </button>
            </div>

            {(draftAiReflection || draftPrimaryEmotion) && (
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70 space-y-2 text-xs text-slate-800">
                {draftPrimaryEmotion && (
                  <p className="font-semibold text-emerald-950">
                    Approximate Tone: {draftPrimaryEmotion} ·{' '}
                    <span className="font-normal text-slate-600">
                      {draftEmotionNote || 'Tentative text interpretation, not a diagnosis'}
                    </span>
                  </p>
                )}
                {draftAiSummary && <p className="text-slate-700">{draftAiSummary}</p>}
                {draftAiReflection && (
                  <p className="text-slate-800 italic leading-relaxed">
                    “{draftAiReflection}”
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetDraft}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs sm:text-sm font-medium cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save to Private Vault'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Saved Recordings & Transcripts */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-600">
          Saved Voice & Transcript Entries ({voiceOrMixedEntries.length})
        </h3>

        {voiceOrMixedEntries.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-slate-200/80 space-y-2">
            <Mic className="w-7 h-7 text-slate-300 mx-auto" />
            <p className="font-editorial text-xl text-slate-900">
              No voice journals saved yet.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Press Start Recording above whenever speaking out loud feels easier than writing. You decide whether to save audio, text, or both.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {voiceOrMixedEntries.map((entry) => {
              const isEditing = editingEntryId === entry.entryId;
              const hasAudio = Boolean(entry.audioDataUrl);
              const hasTranscript = Boolean(entry.transcript.trim());

              return (
                <article
                  key={entry.entryId}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>{entry.recordedDate}</span>
                        {entry.durationSeconds > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {formatTimer(entry.durationSeconds)}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>
                          {entry.storageChoice === 'both'
                            ? 'Audio & Transcript'
                            : entry.storageChoice === 'audio'
                            ? 'Audio Only'
                            : 'Transcript Only'}
                        </span>
                        {entry.primaryEmotion && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-800 font-medium">
                              Tone: {entry.primaryEmotion}
                            </span>
                          </>
                        )}
                      </div>

                      {!isEditing && (
                        <h4 className="font-editorial text-xl font-semibold text-slate-900">
                          {entry.title || 'Private Voice Reflection'}
                        </h4>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEntryId(entry.entryId);
                          setEditTitle(entry.title);
                          setEditTranscript(entry.transcript);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {hasAudio && hasTranscript && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRemoveAudioOnly(entry)}
                            title="Delete audio file while keeping transcript"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 text-xs text-slate-600 cursor-pointer"
                          >
                            <VolumeX className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete Audio</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveTranscriptOnly(entry)}
                            title="Delete transcript while keeping audio"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 text-xs text-slate-600 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete Text</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteEntireEntry(entry.entryId)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium cursor-pointer ${
                          confirmDeleteId === entry.entryId
                            ? 'bg-rose-600 text-white border-rose-700'
                            : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>
                          {confirmDeleteId === entry.entryId ? 'Confirm' : 'Delete'}
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
                        placeholder="Title"
                        className="w-full rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
                      />
                      <textarea
                        rows={4}
                        maxLength={8000}
                        value={editTranscript}
                        onChange={(e) => setEditTranscript(e.target.value)}
                        placeholder="Transcript text"
                        className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingEntryId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveInlineEdit(entry.entryId)}
                          className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {hasAudio && (
                        <div className="flex items-center gap-2">
                          <FileAudio className="w-4 h-4 text-sky-600 shrink-0" />
                          <audio
                            controls
                            src={entry.audioDataUrl}
                            className="w-full h-9"
                          />
                        </div>
                      )}

                      {hasTranscript && (
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {entry.transcript}
                        </p>
                      )}

                      {entry.aiReflection && (
                        <div className="p-3.5 rounded-xl bg-emerald-50/55 border border-emerald-200/70 space-y-1">
                          <p className="text-[11px] font-semibold text-emerald-900">
                            Gemini Companion Reflection
                          </p>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {entry.aiReflection}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
