import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  Users,
  Activity,
  CreditCard,
  Flag,
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Monitor,
  Clock,
  Flower2,
} from 'lucide-react';
import {
  LoginEvent,
  ModerationReportRecord,
  SEED_OPTIONS,
  Story,
  SUBSCRIPTION_PLAN_CATALOG,
  SubscriptionBillingCycle,
  SubscriptionCurrency,
  SubscriptionPlanTier,
  SubscriptionRecord,
  SubscriptionStatus,
  UserAccount,
} from '../types/garden';
import {
  deleteSubscriptionPlan,
  isVerifiedAdminUser,
  recordSubscriptionPlan,
  SaveSubscriptionInput,
  subscribeToAllLoginEvents,
  subscribeToAllReports,
  subscribeToAllSubscriptions,
  subscribeToAllUserAccounts,
  updateSubscriptionPlan,
} from '../services/authAccountService';
import {
  deleteModerationReportAsAdmin,
  deleteStoryAsAdmin,
  purgeLegacyGardenStories,
  subscribeToAllLiveStoriesForAdmin,
} from '../services/gardenService';

interface AdminBackendModalProps {
  isOpen: boolean;
  currentUser: User | null;
  stories: Story[];
  initialTab?: AdminTab;
  onStoryDeleted?: (storyId: string) => void;
  onClose: () => void;
}

export type AdminTab = 'users' | 'logins' | 'subscriptions' | 'stories' | 'reports';

function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export const AdminBackendModal: React.FC<AdminBackendModalProps> = ({
  isOpen,
  currentUser,
  stories,
  initialTab = 'users',
  onStoryDeleted,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [reports, setReports] = useState<ModerationReportRecord[]>([]);
  const [adminStories, setAdminStories] = useState<Story[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SubscriptionStatus>(
    'all'
  );

  // Subscription Form State
  const [showSubForm, setShowSubForm] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [planName, setPlanName] = useState<SubscriptionPlanTier>('seedling');
  const [billingCycle, setBillingCycle] =
    useState<SubscriptionBillingCycle>('monthly');
  const [amountPaid, setAmountPaid] = useState('199');
  const [currency, setCurrency] = useState<SubscriptionCurrency>('INR');
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>('active');
  const [startedAt, setStartedAt] = useState(() => getTodayIso());
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [isSavingSub, setIsSavingSub] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteStoryId, setConfirmDeleteStoryId] = useState<string | null>(
    null
  );
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);
  const [dismissingReportId, setDismissingReportId] = useState<string | null>(
    null
  );
  const [backendError, setBackendError] = useState<string | null>(null);
  const [confirmPurgeLegacy, setConfirmPurgeLegacy] = useState(false);
  const [isPurgingLegacy, setIsPurgingLegacy] = useState(false);
  const [purgeLegacyResult, setPurgeLegacyResult] = useState<string | null>(
    null
  );

  const isAdmin = isVerifiedAdminUser(currentUser);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    setBackendError(null);

    const handleErr = (err: Error) => {
      setBackendError(
        err.message.includes('permission')
          ? 'Firestore permission denied. Verify you are signed in as the verified admin account.'
          : 'Unable to sync live backend collections.'
      );
    };

    const unsubUsers = subscribeToAllUserAccounts(setUsers, handleErr);
    const unsubEvents = subscribeToAllLoginEvents(setLoginEvents, handleErr);
    const unsubSubs = subscribeToAllSubscriptions(setSubscriptions, handleErr);
    const unsubReports = subscribeToAllReports(setReports, handleErr);
    const unsubAdminStories = subscribeToAllLiveStoriesForAdmin(
      setAdminStories,
      handleErr
    );

    return () => {
      unsubUsers();
      unsubEvents();
      unsubSubs();
      unsubReports();
      unsubAdminStories();
    };
  }, [isOpen, isAdmin]);

  const userActiveSubMap = useMemo(() => {
    const map = new Map<string, SubscriptionRecord>();
    for (const sub of subscriptions) {
      const existing = map.get(sub.userId);
      if (
        !existing ||
        (sub.status === 'active' && existing.status !== 'active')
      ) {
        map.set(sub.userId, sub);
      }
    }
    return map;
  }, [subscriptions]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.userAgentSummary.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return loginEvents;
    return loginEvents.filter(
      (e) =>
        e.displayName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.userAgentSummary.toLowerCase().includes(q)
    );
  }, [loginEvents, searchQuery]);

  const filteredSubscriptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return subscriptions.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.userName.toLowerCase().includes(q) ||
        s.userEmail.toLowerCase().includes(q) ||
        s.planName.toLowerCase().includes(q) ||
        s.notes.toLowerCase().includes(q)
      );
    });
  }, [subscriptions, searchQuery, statusFilter]);

  const allAdminStories = adminStories ?? stories;

  const filteredStories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allAdminStories;
    return allAdminStories.filter(
      (s) =>
        s.content.toLowerCase().includes(q) ||
        s.seedType.toLowerCase().includes(q) ||
        s.contentWarning.toLowerCase().includes(q) ||
        s.storyId.toLowerCase().includes(q)
    );
  }, [allAdminStories, searchQuery]);

  const storyByIdMap = useMemo(() => {
    const map = new Map<string, Story>();
    for (const st of allAdminStories) {
      map.set(st.storyId, st);
    }
    return map;
  }, [allAdminStories]);

  const activeSubsCount = useMemo(
    () =>
      subscriptions.filter(
        (s) => s.status === 'active' || s.status === 'trialing'
      ).length,
    [subscriptions]
  );

  const revenueSummary = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const s of subscriptions) {
      if (s.status === 'cancelled') continue;
      totals[s.currency] = (totals[s.currency] || 0) + s.amountPaid;
    }
    const entries = Object.entries(totals);
    if (entries.length === 0) return '₹0';
    return entries.map(([cur, amt]) => formatMoney(amt, cur)).join(' · ');
  }, [subscriptions]);

  if (!isOpen || !isAdmin || !currentUser) return null;

  const openNewPlanForUser = (user?: UserAccount) => {
    setActiveTab('subscriptions');
    setEditingSubId(null);
    setSelectedUserId(user?.uid || users[0]?.uid || '');
    setPlanName('seedling');
    setBillingCycle('monthly');
    setAmountPaid('199');
    setCurrency('INR');
    setSubStatus('active');
    setStartedAt(getTodayIso());
    setExpiresAt('');
    setNotes('');
    setFormFeedback(null);
    setShowSubForm(true);
  };

  const openEditSubscription = (sub: SubscriptionRecord) => {
    setActiveTab('subscriptions');
    setEditingSubId(sub.subscriptionId);
    setSelectedUserId(sub.userId);
    setPlanName(sub.planName);
    setBillingCycle(sub.billingCycle);
    setAmountPaid(String(sub.amountPaid));
    setCurrency(sub.currency);
    setSubStatus(sub.status);
    setStartedAt(sub.startedAt || getTodayIso());
    setExpiresAt(sub.expiresAt || '');
    setNotes(sub.notes || '');
    setFormFeedback(null);
    setShowSubForm(true);
  };

  const handlePlanTierChange = (tier: SubscriptionPlanTier) => {
    setPlanName(tier);
    if (!editingSubId) {
      const cat = SUBSCRIPTION_PLAN_CATALOG.find((c) => c.id === tier);
      if (cat && currency === 'INR') {
        setAmountPaid(String(cat.suggestedAmountInr));
      }
    }
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    const targetUser = users.find((u) => u.uid === selectedUserId);
    if (!targetUser && !editingSubId) {
      setFormFeedback({
        type: 'error',
        message: 'Please select a logged-in user before recording a plan.',
      });
      return;
    }

    const existingSub = editingSubId
      ? subscriptions.find((s) => s.subscriptionId === editingSubId)
      : null;

    const payload: SaveSubscriptionInput = {
      userId: targetUser?.uid || existingSub?.userId || selectedUserId,
      userEmail: targetUser?.email || existingSub?.userEmail || '',
      userName: targetUser?.displayName || existingSub?.userName || 'Visitor',
      planName,
      billingCycle,
      amountPaid: Number(amountPaid) || 0,
      currency,
      status: subStatus,
      notes,
      startedAt,
      expiresAt,
    };

    setIsSavingSub(true);
    try {
      if (editingSubId) {
        await updateSubscriptionPlan(currentUser, editingSubId, payload);
        setFormFeedback({
          type: 'success',
          message: `Updated ${payload.userEmail}'s ${payload.planName} plan.`,
        });
      } else {
        await recordSubscriptionPlan(currentUser, payload);
        setFormFeedback({
          type: 'success',
          message: `Recorded ${payload.planName} subscription for ${payload.userEmail}.`,
        });
      }
      setShowSubForm(false);
      setEditingSubId(null);
    } catch {
      setFormFeedback({
        type: 'error',
        message: 'Could not save subscription record. Check field bounds and permissions.',
      });
    } finally {
      setIsSavingSub(false);
    }
  };

  const handleDeleteSub = async (subscriptionId: string) => {
    if (confirmDeleteId !== subscriptionId) {
      setConfirmDeleteId(subscriptionId);
      return;
    }
    try {
      await deleteSubscriptionPlan(subscriptionId);
      setConfirmDeleteId(null);
    } catch {
      setFormFeedback({
        type: 'error',
        message: 'Failed to delete subscription record.',
      });
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (confirmDeleteStoryId !== storyId) {
      setConfirmDeleteStoryId(storyId);
      return;
    }
    setDeletingStoryId(storyId);
    setFormFeedback(null);
    try {
      await deleteStoryAsAdmin(storyId);
      onStoryDeleted?.(storyId);
      setConfirmDeleteStoryId(null);
      setFormFeedback({
        type: 'success',
        message: 'Harmful story permanently deleted from the meadow and Firestore.',
      });
    } catch {
      setFormFeedback({
        type: 'error',
        message: 'Could not delete story. Verify you are signed in as the verified admin account.',
      });
    } finally {
      setDeletingStoryId(null);
    }
  };

  const handleDismissReport = async (reportId: string) => {
    setDismissingReportId(reportId);
    setFormFeedback(null);
    try {
      await deleteModerationReportAsAdmin(reportId);
      setFormFeedback({
        type: 'success',
        message: 'Moderation report dismissed.',
      });
    } catch {
      setFormFeedback({
        type: 'error',
        message: 'Could not dismiss report. Verify admin permissions.',
      });
    } finally {
      setDismissingReportId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-backend-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/45 backdrop-blur-md"
    >
      <div className="relative w-full max-w-5xl rounded-2xl sm:rounded-3xl bg-white/96 backdrop-blur-xl shadow-2xl border border-white/90 max-h-[94dvh] flex flex-col overflow-hidden">
        {/* Pinned Top Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-7 py-3.5 sm:py-5 border-b border-slate-200/70">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin Backend · {currentUser.email}</span>
            </div>
            <h2
              id="admin-backend-heading"
              className="font-editorial text-2xl sm:text-3xl font-semibold text-slate-900 mt-1"
            >
              User Logins & Subscription Plans
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close admin backend"
            className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary KPI Strip + Tabs */}
        <div className="shrink-0 px-4 sm:px-7 pt-3 pb-3 border-b border-slate-200/60 bg-slate-50/70 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/80">
              <p className="text-[11px] text-slate-500">Logged-In Users</p>
              <p className="text-lg sm:text-xl font-semibold text-slate-900 tabular-nums">
                {users.length}
              </p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/80">
              <p className="text-[11px] text-slate-500">Total Sign-Ins</p>
              <p className="text-lg sm:text-xl font-semibold text-slate-900 tabular-nums">
                {loginEvents.length}
              </p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/80">
              <p className="text-[11px] text-slate-500">Active Plans</p>
              <p className="text-lg sm:text-xl font-semibold text-emerald-700 tabular-nums">
                {activeSubsCount}
              </p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/80">
              <p className="text-[11px] text-slate-500">Recorded Revenue</p>
              <p className="text-base sm:text-lg font-semibold text-slate-900 tabular-nums truncate">
                {revenueSummary}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Users ({users.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('logins')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'logins'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Login History ({loginEvents.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('subscriptions')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'subscriptions'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Subscriptions ({subscriptions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stories')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'stories'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Flower2 className="w-3.5 h-3.5" />
                <span>Stories ({allAdminStories.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Reports ({reports.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-52">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search email or name..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>

              <button
                type="button"
                onClick={() => openNewPlanForUser()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Plan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0 px-4 sm:px-7 py-4 overflow-y-auto garden-scroll space-y-4">
          {backendError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{backendError}</span>
            </div>
          )}

          {formFeedback && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
                formFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {formFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{formFeedback.message}</span>
            </div>
          )}

          {/* TAB 1: LOGGED-IN USERS */}
          {activeTab === 'users' && (
            <div className="space-y-2.5">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500">
                  No logged-in user records match your search yet. Once visitors sign in via Google, their account details appear here automatically.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const activePlan = userActiveSubMap.get(u.uid);
                  const planMeta = activePlan
                    ? SUBSCRIPTION_PLAN_CATALOG.find(
                        (p) => p.id === activePlan.planName
                      )
                    : null;

                  return (
                    <div
                      key={u.uid}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        {u.photoURL ? (
                          <img
                            src={u.photoURL}
                            alt={u.displayName}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border border-white shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-800 font-semibold text-sm flex items-center justify-center shrink-0">
                            {(u.displayName || u.email || 'U')
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900">
                              {u.displayName}
                            </p>
                            {activePlan ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  planMeta?.badgeClass ||
                                  'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {planMeta?.label || activePlan.planName} ·{' '}
                                {activePlan.status}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                No Plan Recorded
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 truncate">
                            {u.email}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Last login: {formatDateTime(u.lastLoginAt)}
                            </span>
                            <span>Sign-ins: {u.loginCount}</span>
                            {u.userAgentSummary && (
                              <span className="inline-flex items-center gap-1">
                                <Monitor className="w-3 h-3" />
                                {u.userAgentSummary}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            activePlan
                              ? openEditSubscription(activePlan)
                              : openNewPlanForUser(u)
                          }
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {activePlan ? (
                            <>
                              <Pencil className="w-3 h-3 text-slate-500" />
                              <span>Edit Plan</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3 text-emerald-600" />
                              <span>Record Plan</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: LOGIN HISTORY */}
          {activeTab === 'logins' && (
            <div className="space-y-2">
              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500">
                  No login events recorded yet.
                </div>
              ) : (
                filteredEvents.map((ev) => (
                  <div
                    key={ev.eventId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50/85 border border-slate-200/75"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {ev.photoURL ? (
                        <img
                          src={ev.photoURL}
                          alt={ev.displayName}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-white shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold flex items-center justify-center shrink-0">
                          {(ev.displayName || ev.email || 'U')
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {ev.displayName}{' '}
                          <span className="font-normal text-slate-500">
                            ({ev.email})
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {ev.providerId} · {ev.userAgentSummary || 'Browser'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-600 tabular-nums shrink-0">
                      {formatDateTime(ev.loggedInAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: SUBSCRIPTION PLANS */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-4">
              {showSubForm && (
                <form
                  onSubmit={handleSaveSubscription}
                  className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {editingSubId
                        ? 'Update Subscription Plan'
                        : 'Record New Subscription Plan'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSubForm(false);
                        setEditingSubId(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Logged-In User
                      </label>
                      <select
                        value={selectedUserId}
                        disabled={Boolean(editingSubId)}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        required
                        className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:bg-slate-100"
                      >
                        <option value="" disabled>
                          Select a user...
                        </option>
                        {users.map((u) => (
                          <option key={u.uid} value={u.uid}>
                            {u.displayName} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Plan Tier
                      </label>
                      <select
                        value={planName}
                        onChange={(e) =>
                          handlePlanTierChange(
                            e.target.value as SubscriptionPlanTier
                          )
                        }
                        className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                      >
                        {SUBSCRIPTION_PLAN_CATALOG.map((tier) => (
                          <option key={tier.id} value={tier.id}>
                            {tier.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Billing Cycle
                      </label>
                      <select
                        value={billingCycle}
                        onChange={(e) =>
                          setBillingCycle(
                            e.target.value as SubscriptionBillingCycle
                          )
                        }
                        className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="lifetime">Lifetime</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Amount Paid
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100000}
                          step="0.01"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                          className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Currency
                        </label>
                        <select
                          value={currency}
                          onChange={(e) =>
                            setCurrency(e.target.value as SubscriptionCurrency)
                          }
                          className="w-full rounded-xl bg-white border border-slate-200 px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                        >
                          <option value="INR">INR</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Status
                      </label>
                      <select
                        value={subStatus}
                        onChange={(e) =>
                          setSubStatus(e.target.value as SubscriptionStatus)
                        }
                        className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                      >
                        <option value="active">Active</option>
                        <option value="trialing">Trialing</option>
                        <option value="paused">Paused</option>
                        <option value="expired">Expired</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={startedAt}
                          onChange={(e) => setStartedAt(e.target.value)}
                          className="w-full rounded-xl bg-white border border-slate-200 px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={expiresAt}
                          onChange={(e) => setExpiresAt(e.target.value)}
                          className="w-full rounded-xl bg-white border border-slate-200 px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Payment / Subscription Notes (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={500}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g., UPI reference ID, Razorpay/Stripe invoice, custom renewal note..."
                      className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      disabled={isSavingSub}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium cursor-pointer"
                    >
                      {isSavingSub
                        ? 'Saving...'
                        : editingSubId
                        ? 'Save Plan Updates'
                        : 'Save Subscription Record'}
                    </button>
                  </div>
                </form>
              )}

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    'all',
                    'active',
                    'trialing',
                    'paused',
                    'expired',
                    'cancelled',
                  ] as const
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {filteredSubscriptions.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500">
                  No subscription plans recorded yet. Click “Record Plan” above to assign a subscription plan to any logged-in user.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredSubscriptions.map((sub) => {
                    const meta = SUBSCRIPTION_PLAN_CATALOG.find(
                      (c) => c.id === sub.planName
                    );
                    return (
                      <div
                        key={sub.subscriptionId}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900">
                              {sub.userName || 'Visitor'}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                meta?.badgeClass ||
                                'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {meta?.label || sub.planName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 capitalize">
                              {sub.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">
                            {sub.userEmail} ·{' '}
                            <strong className="text-slate-900">
                              {formatMoney(sub.amountPaid, sub.currency)}
                            </strong>{' '}
                            ({sub.billingCycle})
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {sub.startedAt ? `Started ${sub.startedAt}` : ''}
                            {sub.expiresAt
                              ? ` · Expires ${sub.expiresAt}`
                              : ''}
                            {sub.notes ? ` · ${sub.notes}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditSubscription(sub)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSub(sub.subscriptionId)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors ${
                              confirmDeleteId === sub.subscriptionId
                                ? 'bg-rose-600 text-white border-rose-700'
                                : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>
                              {confirmDeleteId === sub.subscriptionId
                                ? 'Confirm Delete'
                                : 'Delete'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PLANTED STORIES MODERATION */}
          {activeTab === 'stories' && (
            <div className="space-y-2.5">
              {filteredStories.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500">
                  No planted stories match your search right now.
                </div>
              ) : (
                filteredStories.map((st) => {
                  const seedMeta = SEED_OPTIONS.find(
                    (opt) => opt.id === st.seedType
                  );
                  const isConfirming = confirmDeleteStoryId === st.storyId;
                  const isDeleting = deletingStoryId === st.storyId;
                  return (
                    <div
                      key={st.storyId}
                      className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-800">
                            {seedMeta?.name || st.seedType} Seed
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatDateTime(st.createdAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {st.warmthCount} warmth · {st.messageCount} replies
                          </span>
                          {st.contentWarning && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                              CW: {st.contentWarning}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                          “{st.content}”
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isConfirming && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteStoryId(null)}
                            disabled={isDeleting}
                            className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteStory(st.storyId)}
                          disabled={isDeleting}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 whitespace-nowrap ${
                            isConfirming
                              ? 'bg-rose-600 text-white border-rose-700'
                              : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>
                            {isDeleting
                              ? 'Deleting...'
                              : isConfirming
                              ? 'Confirm Delete'
                              : 'Delete Story'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 5: MODERATION REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-2.5">
              {reports.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500">
                  No moderation reports have been filed.
                </div>
              ) : (
                reports.map((rep) => {
                  const linkedStory = storyByIdMap.get(rep.storyId);
                  const isConfirming = confirmDeleteStoryId === rep.storyId;
                  const isDeleting = deletingStoryId === rep.storyId;
                  const isDismissing = dismissingReportId === rep.reportId;

                  return (
                    <div
                      key={rep.reportId}
                      className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/75 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-rose-900 capitalize">
                          {rep.reason} · Story {rep.storyId}
                        </span>
                        <span className="text-[11px] text-rose-700">
                          {formatDateTime(rep.createdAt)}
                        </span>
                      </div>
                      {rep.details && (
                        <p className="text-xs text-rose-900/85">
                          Report note: {rep.details}
                        </p>
                      )}
                      {linkedStory ? (
                        <p className="p-2.5 rounded-xl bg-white/85 border border-rose-200/70 text-xs text-slate-800 leading-relaxed">
                          “{linkedStory.content}”
                        </p>
                      ) : (
                        <p className="text-[11px] font-medium text-emerald-700">
                          This story is no longer in the live meadow.
                        </p>
                      )}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleDismissReport(rep.reportId)}
                          disabled={isDismissing}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer disabled:opacity-50"
                        >
                          {isDismissing ? 'Dismissing...' : 'Dismiss Report'}
                        </button>
                        {linkedStory && (
                          <button
                            type="button"
                            onClick={() => handleDeleteStory(rep.storyId)}
                            disabled={isDeleting}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 ${
                              isConfirming
                                ? 'bg-rose-700 text-white border-rose-800'
                                : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>
                              {isDeleting
                                ? 'Deleting...'
                                : isConfirming
                                ? 'Confirm Delete Story'
                                : 'Delete Story'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Pinned Footer */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-7 py-3 bg-white/95 border-t border-slate-200/70">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] text-slate-500">
              Synced live with Cloud Firestore
            </span>
            <button
              type="button"
              disabled={isPurgingLegacy}
              onClick={async () => {
                if (!confirmPurgeLegacy) {
                  setConfirmPurgeLegacy(true);
                  setPurgeLegacyResult(null);
                  return;
                }
                setIsPurgingLegacy(true);
                setPurgeLegacyResult(null);
                try {
                  const res = await purgeLegacyGardenStories();
                  setPurgeLegacyResult(
                    res.deletedCount > 0
                      ? `Deleted ${res.deletedCount} legacy pre-launch stories from Firestore.`
                      : 'No legacy pre-launch stories found in Firestore.'
                  );
                } catch {
                  setPurgeLegacyResult(
                    'Could not purge legacy stories. Verify admin sign-in.'
                  );
                } finally {
                  setIsPurgingLegacy(false);
                  setConfirmPurgeLegacy(false);
                }
              }}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                confirmPurgeLegacy
                  ? 'bg-rose-600 text-white border-rose-700'
                  : 'bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-200'
              }`}
            >
              {isPurgingLegacy
                ? 'Purging...'
                : confirmPurgeLegacy
                ? 'Click again to delete pre-launch DB stories'
                : 'Purge Legacy DB Stories'}
            </button>
            {purgeLegacyResult && (
              <span className="text-[11px] font-medium text-emerald-700">
                {purgeLegacyResult}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
          >
            Back to Garden
          </button>
        </div>
      </div>
    </div>
  );
};
