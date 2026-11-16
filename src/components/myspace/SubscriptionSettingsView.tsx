import React, { useState } from 'react';
import {
  Crown,
  Calendar,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Check,
  XCircle,
} from 'lucide-react';
import {
  ALL_PREMIUM_FEATURES_FREE_FOR_NOW,
  SECRET_GARDEN_PLANS,
  SecretGardenMembership,
} from '../../types/garden';
import {
  cancelOrExpireMembership,
  isTrialExpired,
} from '../../services/secretGardenService';

interface SubscriptionSettingsViewProps {
  userId: string | null;
  membership: SecretGardenMembership | null;
  isAdmin: boolean;
  onOpenUpgrade: () => void;
}

export const SubscriptionSettingsView: React.FC<
  SubscriptionSettingsViewProps
> = ({ userId, membership, isAdmin, onOpenUpgrade }) => {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const expiredTrial = isTrialExpired(membership);
  const effectiveStatus = expiredTrial
    ? 'expired'
    : membership?.status || 'free';

  const planMeta =
    SECRET_GARDEN_PLANS.find((p) => p.id === (membership?.planId || 'free')) ||
    SECRET_GARDEN_PLANS[0];

  const handleCancel = async () => {
    if (!userId) return;
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      await cancelOrExpireMembership(userId, 'cancelled');
      setConfirmCancel(false);
      setFeedback(
        'Your Secret Garden subscription has been cancelled. You remain on the Open Meadow (₹0) plan with zero future charges.'
      );
    } catch {
      setErrorMsg('Could not cancel subscription right now.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-5">
      {ALL_PREMIUM_FEATURES_FREE_FOR_NOW && (
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-900">
          <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">All Secret Garden Features Are Free Right Now</p>
            <p className="text-emerald-900/85 leading-relaxed">
              Every personal feature — Personal Diary, Voice Journaling, My Memories,
              Reflection History, and Exclusive Garden Customisation — is unlocked at ₹0
              for everyone. No trial activation or payment plan is required.
            </p>
          </div>
        </div>
      )}

      {feedback && (
        <div className="flex items-start gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-start gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Membership Status Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-slate-500">
              Current Membership
            </p>
            <h3 className="font-editorial text-2xl font-semibold text-slate-900 mt-0.5 flex items-center gap-2">
              <Crown
                className={`w-5 h-5 ${
                  effectiveStatus === 'active' ||
                  effectiveStatus === 'trialing' ||
                  isAdmin
                    ? 'text-amber-500'
                    : 'text-slate-300'
                }`}
              />
              <span>
                {isAdmin && effectiveStatus === 'free'
                  ? 'Sanctuary Admin Access'
                  : planMeta.name}
              </span>
            </h3>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${
              effectiveStatus === 'active'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : effectiveStatus === 'trialing'
                ? 'bg-sky-50 text-sky-800 border-sky-200'
                : effectiveStatus === 'expired'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : effectiveStatus === 'cancelled'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {effectiveStatus === 'trialing'
              ? 'Free Trial (30 Days)'
              : effectiveStatus === 'active'
              ? 'Active Paid Plan (Demo)'
              : effectiveStatus === 'expired'
              ? 'Trial Expired'
              : effectiveStatus === 'cancelled'
              ? 'Cancelled'
              : 'Free Plan'}
          </span>
        </div>

        {/* Structured Subscription Lifecycle Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-xl bg-slate-50/90 space-y-0.5">
            <span className="text-slate-500">Selected Plan</span>
            <p className="font-semibold text-slate-900">
              {planMeta.name} ({planMeta.priceLabel})
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/90 space-y-0.5">
            <span className="text-slate-500">Trial Status</span>
            <p className="font-semibold text-slate-900">
              {effectiveStatus === 'trialing'
                ? `Active through ${membership?.trialEndsAt || '30 days'}`
                : effectiveStatus === 'expired'
                ? `Ended on ${membership?.trialEndsAt || 'previous cycle'}`
                : membership?.hasUsedFreeTrial
                ? '30-day trial previously used'
                : '30-day first-month-free trial available'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/90 space-y-0.5">
            <span className="text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Subscription Start Date</span>
            </span>
            <p className="font-semibold text-slate-900">
              {membership?.startedAt || 'Not subscribed yet'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/90 space-y-0.5">
            <span className="text-slate-500">Next Billing / Decision Date</span>
            <p className="font-semibold text-slate-900">
              {effectiveStatus === 'trialing'
                ? `${membership?.trialEndsAt || 'End of trial'} (Manual choice required)`
                : effectiveStatus === 'active'
                ? membership?.nextBillingAt || 'N/A'
                : 'None (₹0 due)'}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-sky-50/75 border border-sky-200/70 text-xs text-sky-950/85 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-700" />
            <span>Automatic Billing Protection & Demo Transparency</span>
          </p>
          <p className="leading-relaxed">
            Auto-renewal is always <strong>Off</strong> during your free trial
            and demo plans. We never charge payment details automatically. Real
            Razorpay/Stripe webhook integration is disabled in this development
            environment.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
          <button
            type="button"
            onClick={onOpenUpgrade}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>
              {effectiveStatus === 'trialing' || effectiveStatus === 'active'
                ? 'Switch or Manage Plan'
                : 'Explore The Secret Garden Plans'}
            </span>
          </button>

          {(effectiveStatus === 'trialing' || effectiveStatus === 'active') && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleCancel}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                confirmCancel
                  ? 'bg-rose-600 text-white border-rose-700'
                  : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>
                {confirmCancel
                  ? 'Confirm Cancel Membership'
                  : 'Cancel Membership'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
