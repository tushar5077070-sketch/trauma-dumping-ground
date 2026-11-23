import React, { useMemo, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Flower2,
  Heart,
  MessageCircleHeart,
  ShieldCheck,
  Sprout,
  X,
} from 'lucide-react';
import {
  KindMessageNotification,
  NotificationReadState,
  PlantedStoryReceipt,
  SEED_OPTIONS,
  Story,
} from '../types/garden';
import { isNotificationRead } from '../services/notificationService';
import { SeedIconIllustration } from './FlowerIllustration';

interface NotificationsModalProps {
  isOpen: boolean;
  notifications: KindMessageNotification[];
  readState: NotificationReadState;
  ownPlantedStories: PlantedStoryReceipt[];
  liveStories: Story[];
  onOpenNotification: (notification: KindMessageNotification) => void;
  onMarkAllRead: () => void;
  onStartPlanting: () => void;
  onClose: () => void;
}

function formatRelativeTime(date: Date): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  notifications,
  readState,
  ownPlantedStories,
  liveStories,
  onOpenNotification,
  onMarkAllRead,
  onStartPlanting,
  onClose,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const liveStoryIdSet = useMemo(
    () => new Set(liveStories.map((s) => s.storyId)),
    [liveStories]
  );

  const unreadCount = useMemo(
    () =>
      notifications.filter((n) => !isNotificationRead(n, readState)).length,
    [notifications, readState]
  );

  const visibleNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !isNotificationRead(n, readState));
    }
    return notifications;
  }, [notifications, readState, filter]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-slate-950/35 backdrop-blur-md"
    >
      <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border border-white/90 max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Pinned Header */}
        <div className="shrink-0 px-5 sm:px-6 pt-5 pb-3.5 border-b border-slate-200/70">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center shrink-0">
                <Bell className="w-4.5 h-4.5 text-rose-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="notifications-modal-heading"
                    className="font-editorial text-2xl font-semibold text-slate-900 tracking-tight"
                  >
                    Kindness Inbox
                  </h2>
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-semibold tabular-nums">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kind messages left on flowers you planted
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter & Mark All Read Row */}
          <div className="flex items-center justify-between gap-2 mt-3.5">
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/70">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filter === 'unread'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Notification Feed */}
        <div className="flex-1 min-h-0 overflow-y-auto garden-scroll px-4 sm:px-6 py-4 space-y-2.5">
          {visibleNotifications.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50/90 border border-rose-100 flex items-center justify-center">
                <MessageCircleHeart className="w-6 h-6 text-rose-400" />
              </div>
              {filter === 'unread' && notifications.length > 0 ? (
                <>
                  <p className="font-editorial text-xl font-medium text-slate-800">
                    You're all caught up
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Every kind note left on your flowers has been read. Switch to All to revisit earlier kind messages anytime.
                  </p>
                </>
              ) : ownPlantedStories.length === 0 ? (
                <>
                  <p className="font-editorial text-xl font-medium text-slate-800">
                    No notifications yet
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Plant a seed in the meadow and you'll be notified right here whenever someone leaves a kind message on your flower.
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onStartPlanting();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
                    >
                      <Sprout className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Plant a Seed</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-editorial text-xl font-medium text-slate-800">
                    Waiting for gentle words
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Whenever someone reads one of your planted flowers and leaves a kind message, it will appear right here in real time.
                  </p>
                </>
              )}
            </div>
          ) : (
            visibleNotifications.map((notif) => {
              const read = isNotificationRead(notif, readState);
              const isLive = liveStoryIdSet.has(notif.storyId);
              const seedInfo =
                SEED_OPTIONS.find((s) => s.id === notif.seedType) ||
                SEED_OPTIONS[0];

              return (
                <button
                  key={notif.messageId}
                  type="button"
                  onClick={() => onOpenNotification(notif)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                    read
                      ? 'bg-slate-50/75 hover:bg-white border-slate-200/80'
                      : 'bg-rose-50/65 hover:bg-rose-50 border-rose-200/90 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/70 flex items-center justify-center shadow-2xs">
                        <SeedIconIllustration
                          seedType={notif.seedType}
                          size={28}
                        />
                      </div>
                      {!read && (
                        <span
                          aria-label="Unread notification"
                          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                          <Heart className="w-3 h-3 fill-rose-500 text-rose-500 shrink-0" />
                          <span>New kind message on your {seedInfo.name}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-sm text-slate-800 leading-relaxed break-words">
                        “{notif.messageContent}”
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <p className="text-[11px] text-slate-500 truncate">
                          On your story: “{notif.storyPreview}”
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium shrink-0 ${
                            isLive
                              ? 'text-sky-700 group-hover:underline underline-offset-2'
                              : 'text-slate-400'
                          }`}
                        >
                          <Flower2 className="w-3 h-3" />
                          <span>{isLive ? 'Open Flower' : 'Removed'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Privacy Reassurance Footer */}
        <div className="shrink-0 px-5 sm:px-6 py-3 bg-slate-50/90 border-t border-slate-200/70 flex items-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            Only you can see notifications for your planted flowers — your stories remain 100% anonymous in the meadow.
          </span>
        </div>
      </div>
    </div>
  );
};
