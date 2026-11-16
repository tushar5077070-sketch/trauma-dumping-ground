import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  Sparkles,
  Check,
  X,
  Lock,
  ArrowLeft,
  Flower2,
  ShieldCheck,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import {
  SECRET_GARDEN_PLANS,
  SecretGardenMembership,
} from '../types/garden';
import {
  activateDemoPaidSubscription,
  startSecretGardenFreeTrial,
} from '../services/secretGardenService';
import { signInWithGoogleAndRecord } from '../services/authAccountService';

interface SecretGardenUpgradeModalProps {
  isOpen: boolean;
  currentUser: User | null;
  membership: SecretGardenMembership | null;
  initialFocusFeature?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SecretGardenUpgradeModal: React.FC<
  SecretGardenUpgradeModalProps
> = ({
  isOpen,
  currentUser,
  membership,
  initialFocusFeature,
  onClose,
  onSuccess,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<
    'secret_garden_monthly' | 'secret_garden_annual'
  >('secret_garden_annual');
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasUsedTrial = Boolean(membership?.hasUsedFreeTrial);
  const isCurrentlyActive =
    membership?.status === 'active' || membership?.status === 'trialing';

  const handleSignInFirst = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogleAndRecord();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('Sign-in was cancelled before finishing.');
      } else {
        setErrorMsg('Unable to sign in right now. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartFreeTrial = async () => {
    if (!currentUser) {
      await handleSignInFirst();
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      await startSecretGardenFreeTrial(currentUser.uid, selectedPlan);
      setSuccessMsg(
        'Your 30-day free trial of The Secret Garden is now open. Welcome inside.'
      );
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 900);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not start free trial right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateDemoPaidPlan = async () => {
    if (!currentUser) {
      await handleSignInFirst();
      return;
    }
    if (!consentChecked) {
      setErrorMsg(
        'Please confirm the explicit consent checkbox below before activating a plan.'
      );
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      await activateDemoPaidSubscription(
        currentUser.uid,
        selectedPlan,
        membership
      );
      setSuccessMsg(
        `Your ${
          selectedPlan === 'secret_garden_annual' ? 'Annual' : 'Monthly'
        } Secret Garden plan is active in development demo mode.`
      );
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 900);
    } catch {
      setErrorMsg('Unable to update subscription status right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthlyPlan = SECRET_GARDEN_PLANS.find(
    (p) => p.id === 'secret_garden_monthly'
  )!;
  const annualPlan = SECRET_GARDEN_PLANS.find(
    (p) => p.id === 'secret_garden_annual'
  )!;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="secret-garden-upgrade-heading"
      className="fixed inset-0 z-[60] flex items-center justify-center p-2.5 sm:p-6 bg-slate-950/40 backdrop-blur-md"
    >
      <div className="relative w-full max-w-3xl rounded-2xl sm:rounded-3xl bg-[#FBF9F7]/98 backdrop-blur-xl shadow-2xl border border-white/90 max-h-[94dvh] flex flex-col overflow-hidden">
        {/* Pinned Top Header */}
        <div className="shrink-0 flex items-center justify-between gap-4 px-5 sm:px-8 pt-5 pb-3 border-b border-rose-100/80 bg-white/75">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-rose-700 bg-rose-50/90 border border-rose-200/80 px-3 py-1 rounded-full">
            <Flower2 className="w-3.5 h-3.5 text-rose-500" />
            <span>The Secret Garden Membership</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Return without subscribing"
            className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto garden-scroll px-5 sm:px-8 py-5 sm:py-7 space-y-6">
          {/* Calm Editorial Hero */}
          <div className="text-center max-w-xl mx-auto space-y-2">
            {initialFocusFeature && (
              <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 inline-block px-3 py-1 rounded-full">
                Includes {initialFocusFeature} & all private sanctuary tools
              </p>
            )}
            <h2
              id="secret-garden-upgrade-heading"
              className="font-editorial text-2xl sm:text-4xl font-semibold text-slate-900 leading-tight"
            >
              Your thoughts deserve a space of their own.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Make your garden more personal with The Secret Garden.
            </p>
          </div>

          {/* What's Inside + What Always Stays Free */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-rose-100 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-800">
                <Sparkles className="w-4 h-4 text-rose-500" />
                <span>Inside The Secret Garden</span>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Personal Diary:</strong> Private written thoughts,
                    timestamps & edit history — never visible in the meadow.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Voice Journaling:</strong> Speak softly when typing
                    feels too heavy, stored privately to your account.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>My Memories:</strong> Bookmark touching anonymous
                    stories, kind notes & personal diary entries.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Reflection History:</strong> Gentle chronological
                    timeline across dates with zero labels or diagnoses.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Exclusive Garden Customisation:</strong> Twilight &
                    blossom themes, fireflies, drifting petals & flora glows.
                  </span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50/55 border border-emerald-200/70 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Always Free for Everyone (₹0)</span>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-emerald-950/80">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>Anonymous story planting in the sunlit meadow</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>Reading community stories & sending warmth</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>Leaving kind, supportive replies</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>Original sunlit meadow & safety reporting tools</span>
                </li>
              </ul>
              <p className="text-[11px] text-emerald-900/75 pt-1 leading-relaxed">
                Private diary notes and voice journals are strictly isolated to
                your account and never shared for advertising or AI training.
              </p>
            </div>
          </div>

          {/* Pricing Plans: Monthly vs Annual */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-700 text-center">
              Choose your plan preference
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[monthlyPlan, annualPlan].map((plan) => {
                const isSelected = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() =>
                      setSelectedPlan(
                        plan.id as
                          | 'secret_garden_monthly'
                          | 'secret_garden_annual'
                      )
                    }
                    className={`relative text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-rose-400 ring-2 ring-rose-200/80 shadow-sm'
                        : 'bg-white/75 border-slate-200 hover:border-rose-200'
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                        {plan.badge}
                      </span>
                    )}
                    <p className="text-xs font-medium text-slate-500">
                      {plan.billingCycle === 'annual'
                        ? 'Annual Sanctuary'
                        : 'Monthly Sanctuary'}
                    </p>
                    <p className="font-editorial text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">
                      {plan.priceLabel}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">{plan.tagline}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clear First-Month Trial & Explicit Consent Terms */}
          <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/75 border border-sky-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-900">
              <Lock className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <span>Clear Trial & Subscription Terms</span>
            </div>
            <ul className="text-xs text-sky-950/85 space-y-1.5 leading-relaxed list-disc pl-4">
              <li>
                <strong>First month free:</strong> Enjoy 30 full days of The
                Secret Garden with <strong>no payment details required</strong>.
              </li>
              <li>
                <strong>No automatic charges:</strong> When your free trial
                ends, you will never be automatically billed. We will ask you
                to explicitly choose Monthly (₹99) or Annual (₹799) if you wish
                to continue.
              </li>
              <li>
                <strong>Development Demo Mode Notice:</strong> Live payment
                gateway webhooks (Razorpay/Stripe) are not connected in this
                preview. Trial activation writes directly to your authenticated
                Firestore account, and paid plan selection runs in transparent
                demo checkout mode.
              </li>
            </ul>
          </div>

          {/* Feedback */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Actions Area */}
          {!currentUser ? (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
              <p className="text-xs text-slate-600">
                Sign in with Google so your private diary, voice recordings, and
                30-day free trial belong securely to your account.
              </p>
              <button
                type="button"
                onClick={handleSignInFirst}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-amber-200" />
                <span>
                  {isSubmitting
                    ? 'Connecting...'
                    : 'Sign In to Start Free Trial'}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {!hasUsedTrial && !isCurrentlyActive && (
                <button
                  type="button"
                  onClick={handleStartFreeTrial}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium inline-flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>
                    {isSubmitting
                      ? 'Opening your space...'
                      : 'Start Free Trial · ₹0 for 30 Days'}
                  </span>
                </button>
              )}

              {/* Explicit Paid Demo Selection */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 space-y-3">
                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-rose-300"
                  />
                  <span>
                    I explicitly choose the{' '}
                    <strong>
                      {selectedPlan === 'secret_garden_annual'
                        ? 'Annual (₹799/year)'
                        : 'Monthly (₹99/month)'}
                    </strong>{' '}
                    plan in <strong>Development Demo Mode</strong>. I understand
                    no real payment gateway is attached and auto-renewal is
                    disabled.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleActivateDemoPaidPlan}
                  disabled={isSubmitting || !consentChecked}
                  className="w-full py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-45 text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  {isSubmitting
                    ? 'Activating...'
                    : `Activate Demo ${
                        selectedPlan === 'secret_garden_annual'
                          ? 'Annual (₹799/yr)'
                          : 'Monthly (₹99/mo)'
                      }`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Footer with calm Return Option */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 sm:px-8 py-3.5 bg-white/95 border-t border-slate-200/70">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return without subscribing</span>
          </button>

          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Private & cancel anytime
          </span>
        </div>
      </div>
    </div>
  );
};
