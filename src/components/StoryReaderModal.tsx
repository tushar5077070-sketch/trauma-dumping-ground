import React, { useEffect, useState } from 'react';
import {
  Heart,
  MessageCircleHeart,
  Shuffle,
  ArrowLeft,
  Flag,
  Check,
  Eye,
  Send,
  X,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
} from 'lucide-react';
import { SEED_OPTIONS, Story, SupportiveMessage } from '../types/garden';
import {
  leaveSupportiveMessage,
  reportStoryContent,
  sendWarmthReaction,
  subscribeToStoryMessages,
} from '../services/gardenService';
import { soundscape } from '../utils/soundscape';
import { MeadowFlowerSvg } from './FlowerIllustration';

interface StoryReaderModalProps {
  story: Story | null;
  onClose: () => void;
  onReadAnother: () => void;
  onLocalStoryWarmthIncrement: (storyId: string) => void;
  canSaveMemories?: boolean;
  savedSourceIds?: Set<string>;
  onSaveStoryToMemory?: (story: Story) => Promise<void>;
  onSaveMessageToMemory?: (
    msg: SupportiveMessage,
    story: Story
  ) => Promise<void>;
  onRequestUnlockMemories?: () => void;
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMins < 60) return `Planted ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Planted ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `Planted ${diffDays}d ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const StoryReaderModal: React.FC<StoryReaderModalProps> = ({
  story,
  onClose,
  onReadAnother,
  onLocalStoryWarmthIncrement,
  canSaveMemories = false,
  savedSourceIds,
  onSaveStoryToMemory,
  onSaveMessageToMemory,
  onRequestUnlockMemories,
}) => {
  const [warmthSent, setWarmthSent] = useState(false);
  const [localWarmthDelta, setLocalWarmthDelta] = useState(0);
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportiveMessage[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [isWarningRevealed, setIsWarningRevealed] = useState(false);
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [reportReason, setReportReason] = useState<
    'self-harm' | 'harassment' | 'spam' | 'pii' | 'other'
  >('other');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  useEffect(() => {
    if (!story) return;
    setWarmthSent(false);
    setLocalWarmthDelta(0);
    setShowMessageComposer(false);
    setMessageText('');
    setMessageSuccess(false);
    setMessageError(null);
    setIsWarningRevealed(!story.contentWarning);
    setShowReportPanel(false);
    setReportSubmitted(false);
    setReportDetails('');

    const unsubscribe = subscribeToStoryMessages(story.storyId, (loaded) => {
      setMessages(loaded);
    });
    return () => unsubscribe();
  }, [story]);

  if (!story) return null;

  const seedMeta =
    SEED_OPTIONS.find((s) => s.id === story.seedType) || SEED_OPTIONS[0];
  const displayedWarmth = story.warmthCount + localWarmthDelta;

  const handleSendWarmth = async () => {
    if (warmthSent) return;
    setWarmthSent(true);
    setLocalWarmthDelta(1);
    onLocalStoryWarmthIncrement(story.storyId);
    soundscape.playHoverChime();
    try {
      await sendWarmthReaction(story, 'warmth');
    } catch {
      // Optimistic warmth stays visible in UI
    }
  };

  const handlePostKindMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim().length < 2 || isSendingMessage) return;
    setIsSendingMessage(true);
    setMessageError(null);
    setMessageSuccess(false);
    try {
      const created = await leaveSupportiveMessage(story, messageText);
      setMessages((prev) =>
        prev.some((m) => m.messageId === created.messageId)
          ? prev
          : [created, ...prev]
      );
      setMessageText('');
      setMessageSuccess(true);
      soundscape.playHoverChime();
      setTimeout(() => setMessageSuccess(false), 3000);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'This message could not be sent. Please share only kind, supportive words.';
      setMessageError(msg);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reportStoryContent(story.storyId, reportReason, reportDetails);
    } catch {
      // Acknowledge report locally
    }
    setReportSubmitted(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-soul-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-slate-950/35 backdrop-blur-md"
    >
      <div className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-white/94 backdrop-blur-xl shadow-2xl border border-white/85 overflow-hidden max-h-[94dvh] flex flex-col">
        {/* Pinned Top Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-7 py-3 sm:py-4 border-b border-slate-200/60">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-500 flex-wrap min-w-0">
            <span className="font-semibold text-slate-700">
              {seedMeta.name} Seed
            </span>
            <span aria-hidden="true">·</span>
            <span>{seedMeta.tagline}</span>
            <span aria-hidden="true">·</span>
            <span>{formatRelativeTime(story.createdAt)}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                if (!canSaveMemories) {
                  onRequestUnlockMemories?.();
                  return;
                }
                if (!onSaveStoryToMemory || savingId === story.storyId) return;
                setSavingId(story.storyId);
                try {
                  await onSaveStoryToMemory(story);
                } finally {
                  setSavingId(null);
                }
              }}
              title={
                savedSourceIds?.has(story.storyId)
                  ? 'Saved in My Memories'
                  : 'Save story to My Memories'
              }
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                savedSourceIds?.has(story.storyId)
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 font-medium'
                  : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50/70'
              }`}
            >
              {savedSourceIds?.has(story.storyId) ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Saved</span>
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
              onClick={() => setShowReportPanel((prev) => !prev)}
              title="Report story"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close story"
              className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Story & Messages Body */}
        <div className="flex-1 min-h-0 p-4 sm:p-7 overflow-y-auto garden-scroll space-y-4 sm:space-y-5">
          {/* Botanical Illustration & Author Heading */}
          <div className="flex flex-row items-start gap-3.5 sm:gap-6">
            <div className="w-18 h-26 sm:w-28 sm:h-40 shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-b from-sky-100/80 via-sky-50/50 to-emerald-50/70 border border-white shadow-inner pt-2">
              <div className="w-14 h-24 sm:w-20 sm:h-36">
                <MeadowFlowerSvg
                  variant={story.flowerVariant}
                  isHovered={true}
                  stemHeight={95}
                  uniqueId={`reader-${story.storyId}`}
                />
              </div>
            </div>

            <div className="flex-1 min-w-0 text-left">
              <h2
                id="story-soul-heading"
                className="font-editorial text-xl sm:text-3xl font-semibold text-slate-900 leading-tight"
              >
                Anonymous Soul
              </h2>

              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 mt-0.5">
                <span className="tabular-nums">
                  {displayedWarmth} warmth received
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {messages.length} kind messages
                </span>
              </div>

              {/* Content Warning Gate if present */}
              {story.contentWarning && !isWarningRevealed ? (
                <div className="mt-3 p-3 sm:p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-left space-y-2">
                  <p className="text-xs font-semibold text-amber-900">
                    Gentle Content Note: {story.contentWarning}
                  </p>
                  <p className="text-xs text-amber-800/90">
                    The author included a content note for this story. Read only when you feel ready.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsWarningRevealed(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-900 text-white text-xs font-medium hover:bg-amber-800 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Read story</span>
                  </button>
                </div>
              ) : (
                <blockquote className="mt-2.5 sm:mt-4 font-editorial text-lg sm:text-2xl text-slate-800 leading-relaxed font-normal">
                  “{story.content}”
                </blockquote>
              )}
            </div>
          </div>

          {/* Optional Moderation Report Drawer */}
          {showReportPanel && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 space-y-2.5">
              {reportSubmitted ? (
                <p className="text-xs font-medium text-emerald-800">
                  Thank you for helping keep this garden safe and compassionate. Our moderation queue has received your report.
                </p>
              ) : (
                <form onSubmit={handleReportSubmit} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-rose-900">
                      Report inappropriate or harmful content
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowReportPanel(false)}
                      className="text-xs text-rose-700 hover:underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={reportReason}
                      onChange={(e) =>
                        setReportReason(
                          e.target.value as
                            | 'self-harm'
                            | 'harassment'
                            | 'spam'
                            | 'pii'
                            | 'other'
                        )
                      }
                      className="rounded-xl bg-white border border-rose-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    >
                      <option value="self-harm">
                        Self-harm or crisis concern
                      </option>
                      <option value="harassment">Harassment or cruelty</option>
                      <option value="pii">Contains personal/private info</option>
                      <option value="spam">Spam or unrelated text</option>
                      <option value="other">Other concern</option>
                    </select>
                    <input
                      type="text"
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Optional note..."
                      maxLength={250}
                      className="rounded-xl bg-white border border-rose-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Submit Report
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Kind Message Composer */}
          {showMessageComposer && (
            <form
              onSubmit={handlePostKindMessage}
              className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <label
                  htmlFor="kind-message-input"
                  className="text-xs font-medium text-slate-700"
                >
                  Write a gentle, supportive note for this author
                </label>
                <span className="text-[11px] font-mono tabular-nums text-slate-400">
                  {messageText.length} / 500
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  id="kind-message-input"
                  type="text"
                  maxLength={500}
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    if (messageError) setMessageError(null);
                  }}
                  placeholder="Remind them they aren't carrying this alone..."
                  className="flex-1 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
                <button
                  type="submit"
                  disabled={isSendingMessage || messageText.trim().length < 2}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingMessage ? 'Checking...' : 'Send'}</span>
                </button>
              </div>
              {messageError && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{messageError}</span>
                </div>
              )}
              {messageSuccess && (
                <p className="text-xs text-emerald-700 font-medium">
                  Your kind note has been placed beside this flower.
                </p>
              )}
            </form>
          )}

          {/* Supportive Messages List */}
          {messages.length > 0 && (
            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-semibold text-slate-500">
                Kind Words Left by Visitors ({messages.length})
              </h3>
              <div className="space-y-2">
                {messages.map((msg) => {
                  const isMsgSaved = savedSourceIds?.has(msg.messageId);
                  return (
                    <div
                      key={msg.messageId}
                      className="p-3 rounded-2xl bg-slate-50/85 border border-slate-200/60"
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">
                            Kind Gardener
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatRelativeTime(msg.createdAt)}</span>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!canSaveMemories) {
                              onRequestUnlockMemories?.();
                              return;
                            }
                            if (!onSaveMessageToMemory || savingId === msg.messageId)
                              return;
                            setSavingId(msg.messageId);
                            try {
                              await onSaveMessageToMemory(msg, story);
                            } finally {
                              setSavingId(null);
                            }
                          }}
                          title={
                            isMsgSaved
                              ? 'Saved in My Memories'
                              : 'Save kind words to My Memories'
                          }
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                            isMsgSaved
                              ? 'bg-amber-50 text-amber-800 font-medium'
                              : 'text-slate-400 hover:text-amber-700 hover:bg-amber-50/60'
                          }`}
                        >
                          {isMsgSaved ? (
                            <BookmarkCheck className="w-3 h-3 text-amber-600" />
                          ) : (
                            <Bookmark className="w-3 h-3" />
                          )}
                          <span>{isMsgSaved ? 'Saved' : 'Save'}</span>
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pinned Always-Visible Action Footer (Balanced 2x2 grid on mobile & small tablet, single row on md+) */}
        <div className="shrink-0 px-4 sm:px-6 md:px-7 py-3 sm:py-4 bg-white/95 border-t border-slate-200/70 grid grid-cols-2 md:flex md:flex-nowrap items-center gap-2">
          {/* 1. Send a little warmth */}
          <button
            type="button"
            onClick={handleSendWarmth}
            disabled={warmthSent}
            className={`px-3 md:px-3.5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              warmthSent
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80'
            }`}
          >
            {warmthSent ? (
              <>
                <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Warmth sent ({displayedWarmth})</span>
              </>
            ) : (
              <>
                <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Send a little warmth</span>
              </>
            )}
          </button>

          {/* 2. Leave a kind message */}
          <button
            type="button"
            onClick={() => setShowMessageComposer((prev) => !prev)}
            className="px-3 md:px-3.5 py-2 sm:py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80 text-[11px] sm:text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <MessageCircleHeart className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>Leave a kind message</span>
          </button>

          {/* 3. Read another story */}
          <button
            type="button"
            onClick={() => {
              soundscape.playBloomChord();
              onReadAnother();
            }}
            className="px-3 md:px-3.5 py-2 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-[11px] sm:text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Shuffle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>Read another story</span>
          </button>

          {/* 4. Back to the garden */}
          <button
            type="button"
            onClick={onClose}
            className="md:ml-auto px-3 md:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] sm:text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Back to the garden</span>
          </button>
        </div>
      </div>
    </div>
  );
};
