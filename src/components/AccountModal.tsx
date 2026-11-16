import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  LogIn,
  LogOut,
  ShieldCheck,
  Crown,
  Calendar,
  Monitor,
  AlertCircle,
  Lock,
} from 'lucide-react';
import {
  ALL_PREMIUM_FEATURES_FREE_FOR_NOW,
  LoginEvent,
  SECRET_GARDEN_PLANS,
  SecretGardenMembership,
  SUBSCRIPTION_PLAN_CATALOG,
  SubscriptionRecord,
  UserAccount,
} from '../types/garden';
import {
  isVerifiedAdminUser,
  signInWithGoogleAndRecord,
  signOutUser,
  subscribeToOwnLoginEvents,
  subscribeToOwnSubscriptions,
  subscribeToOwnUserAccount,
} from '../services/authAccountService';

interface AccountModalProps {
  isOpen: boolean;
  currentUser: User | null;
  secretGardenMembership?: SecretGardenMembership | null;
  onClose: () => void;
  onOpenAdminConsole: () => void;
  onOpenMySpace?: () => void;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number, currency: string): string {
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

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  currentUser,
  secretGardenMembership,
  onClose,
  onOpenAdminConsole,
  onOpenMySpace,
}) => {
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [ownEvents, setOwnEvents] = useState<LoginEvent[]>([]);
  const [ownSubscriptions, setOwnSubscriptions] = useState<SubscriptionRecord[]>(
    []
  );
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !currentUser) {
      setAccount(null);
      setOwnEvents([]);
      setOwnSubscriptions([]);
      return;
    }

    const unsubAccount = subscribeToOwnUserAccount(
      currentUser.uid,
      setAccount,
      () => {}
    );
    const unsubEvents = subscribeToOwnLoginEvents(
      currentUser.uid,
      setOwnEvents,
      () => {}
    );
    const unsubSubs = subscribeToOwnSubscriptions(
      currentUser.uid,
      setOwnSubscriptions,
      () => {}
    );

    return () => {
      unsubAccount();
      unsubEvents();
      unsubSubs();
    };
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const isAdmin = isVerifiedAdminUser(currentUser);
  const primarySubscription =
    ownSubscriptions.find((s) => s.status === 'active' || s.status === 'trialing') ||
    ownSubscriptions[0] ||
    null;

  const planMeta = primarySubscription
    ? SUBSCRIPTION_PLAN_CATALOG.find((p) => p.id === primarySubscription.planName)
    : SUBSCRIPTION_PLAN_CATALOG[0];

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsLoadingAuth(true);
    try {
      await signInWithGoogleAndRecord();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('Sign-in was cancelled before completion.');
      } else if (msg.includes('popup-blocked')) {
        setErrorMsg(
          'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.'
        );
      } else {
        setErrorMsg('Could not sign in right now. Please try again.');
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoadingAuth(true);
    try {
      await signOutUser();
      onClose();
    } finally {
      setIsLoadingAuth(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-slate-950/35 backdrop-blur-md"
    >
      <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border border-white/85 max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Pinned Header */}
        <div className="shrink-0 flex items-start justify-between gap-4 px-4 sm:px-7 pt-4 sm:pt-6 pb-3 border-b border-slate-200/60">
          <div>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500">
              {currentUser ? 'Authenticated Sanctuary Account' : 'Member Access'}
            </p>
            <h2
              id="account-modal-heading"
              className="font-editorial text-2xl sm:text-3xl font-semibold text-slate-900 mt-0.5"
            >
              {currentUser ? 'Your Garden Account' : 'Sign In to Your Account'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close account modal"
            className="p-1.5 sm:p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 px-4 sm:px-7 py-4 sm:py-5 overflow-y-auto garden-scroll space-y-4">
          {!currentUser ? (
            <>
              <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200/70 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-900">
                  <Lock className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                  <span>Your planted stories always stay anonymous</span>
                </div>
                <p className="text-xs text-sky-900/80 leading-relaxed">
                  Signing in links your visitor account and displays any subscription plan assigned to you. Any stories you plant in the meadow continue to use an anonymous soul ID with zero personal details exposed.
                </p>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoadingAuth}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium inline-flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-amber-200 shrink-0" />
                <span>
                  {isLoadingAuth ? 'Signing in...' : 'Continue with Google'}
                </span>
              </button>
            </>
          ) : (
            <>
              {/* Profile Summary Card */}
              <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User avatar'}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover border border-white shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-800 font-semibold flex items-center justify-center shrink-0">
                    {(currentUser.displayName || currentUser.email || 'U')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {currentUser.displayName || 'Garden Visitor'}
                    </p>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-semibold">
                        <ShieldCheck className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 truncate">
                    {currentUser.email}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                    <span>{account?.loginCount ?? 1} recorded sign-ins</span>
                    {account?.userAgentSummary && (
                      <span className="inline-flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        {account.userAgentSummary}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Subscription Plan Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-sky-50/70 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    Subscription Plan
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                      primarySubscription?.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : primarySubscription?.status === 'trialing'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {primarySubscription
                      ? primarySubscription.status
                      : 'Free Access'}
                  </span>
                </div>

                <div>
                  <p className="font-editorial text-xl font-semibold text-slate-900">
                    {planMeta?.label || 'Free Meadow'}
                  </p>
                  {primarySubscription ? (
                    <div className="mt-1 space-y-1 text-xs text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-800">
                          {formatCurrency(
                            primarySubscription.amountPaid,
                            primarySubscription.currency
                          )}
                        </span>{' '}
                        ·{' '}
                        <span className="capitalize">
                          {primarySubscription.billingCycle}
                        </span>
                      </p>
                      {(primarySubscription.startedAt ||
                        primarySubscription.expiresAt) && (
                        <p className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {primarySubscription.startedAt
                              ? `Started ${primarySubscription.startedAt}`
                              : ''}
                            {primarySubscription.expiresAt
                              ? ` · Renews/Ends ${primarySubscription.expiresAt}`
                              : ''}
                          </span>
                        </p>
                      )}
                      {primarySubscription.notes && (
                        <p className="text-[11px] text-slate-500 italic">
                          Note: {primarySubscription.notes}
                        </p>
                      )}
                    </div>
                  ) : secretGardenMembership &&
                    secretGardenMembership.status !== 'free' ? (
                    <div className="mt-1 space-y-1 text-xs text-slate-600">
                      <p className="font-medium text-slate-800">
                        {SECRET_GARDEN_PLANS.find(
                          (p) => p.id === secretGardenMembership.planId
                        )?.name || 'The Secret Garden'}{' '}
                        ·{' '}
                        <span className="capitalize">
                          {secretGardenMembership.status}
                        </span>
                      </p>
                      {secretGardenMembership.trialEndsAt && (
                        <p className="text-[11px] text-slate-500">
                          Trial window ends: {secretGardenMembership.trialEndsAt}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ALL_PREMIUM_FEATURES_FREE_FOR_NOW
                        ? 'Open Meadow (₹0) — All Secret Garden features are currently free & unlocked for everyone.'
                        : 'Currently on the Open Meadow Free Plan (₹0).'}
                    </p>
                  )}
                </div>

                {onOpenMySpace && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenMySpace();
                    }}
                    className="text-xs font-medium text-rose-700 hover:text-rose-800 underline underline-offset-2 cursor-pointer"
                  >
                    Open My Space & Secret Garden Membership →
                  </button>
                )}
              </div>

              {/* Recent Login Sessions */}
              {ownEvents.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-slate-600">
                    Recent Sign-In Activity
                  </h3>
                  <div className="space-y-1.5">
                    {ownEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.eventId}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600"
                      >
                        <span className="truncate">
                          {ev.userAgentSummary || ev.providerId}
                        </span>
                        <span className="shrink-0 text-slate-500 tabular-nums">
                          {formatDateTime(ev.loggedInAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAdminConsole();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>Open Backend Logins & Subscription Plans</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Pinned Footer */}
        <div className="shrink-0 flex items-center justify-between gap-2.5 px-4 sm:px-7 py-3 sm:py-4 bg-white/95 border-t border-slate-200/70">
          {currentUser ? (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isLoadingAuth}
              className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500">
              Secured by Google Auth
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
