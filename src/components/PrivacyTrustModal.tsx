import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  ShieldCheck,
  Download,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  LogIn,
  FileCode2,
  MicOff,
  Database,
} from 'lucide-react';
import {
  DiaryEntry,
  InnerJournalEntry,
  InnerPrivacyPrefs,
  InnerReflectionMemory,
  SavedMemory,
  VoiceJournal,
} from '../types/garden';
import {
  downloadUserVaultExport,
  permanentlyWipeUserVault,
  WipeVaultReport,
} from '../services/privacyVaultService';
import { signInWithGoogleAndRecord } from '../services/authAccountService';

export type PrivacyTrustTab = 'overview' | 'ownership';

interface PrivacyTrustModalProps {
  isOpen: boolean;
  initialTab?: PrivacyTrustTab;
  currentUser: User | null;
  diaryEntries: DiaryEntry[];
  innerEntries: InnerJournalEntry[];
  innerReflections: InnerReflectionMemory[];
  voiceJournals: VoiceJournal[];
  memories: SavedMemory[];
  innerPrivacyPrefs: InnerPrivacyPrefs | null;
  onClose: () => void;
}

const SAMPLE_PUBLIC_PAYLOAD = {
  storyId: 'bloom_9f2a8c1d',
  storyText: 'I finally let go of something I held onto for three years.',
  seedType: 'daisy',
  flowerVariant: 'soft-cream',
  positionX: 48.2,
  positionY: 61.7,
  warmthCount: 1,
  createdAt: '<serverTimestamp>',
  isApproved: true,
};

const OMITTED_IDENTITY_FIELDS = [
  'userId (never attached)',
  'email (never attached)',
  'displayName (never attached)',
  'ipAddress (never stored)',
  'trackingCookies (none)',
];

export const PrivacyTrustModal: React.FC<PrivacyTrustModalProps> = ({
  isOpen,
  initialTab = 'overview',
  currentUser,
  diaryEntries,
  innerEntries,
  innerReflections,
  voiceJournals,
  memories,
  innerPrivacyPrefs,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<PrivacyTrustTab>(initialTab);

  // Data ownership & permanent wipe state
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const [wipeReport, setWipeReport] = useState<WipeVaultReport | null>(null);
  const [ownershipFeedback, setOwnershipFeedback] = useState<string | null>(null);
  const [ownershipError, setOwnershipError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Sync initial tab when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setOwnershipError(null);
      setOwnershipFeedback(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signInWithGoogleAndRecord();
    } catch {
      // Popup closed or cancelled
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleExportData = () => {
    if (!currentUser) return;
    setOwnershipError(null);
    downloadUserVaultExport({
      userEmail: currentUser.email || 'Signed-in Member',
      diaryEntries,
      voiceJournals,
      memories,
      innerEntries,
      innerReflections,
      innerPrivacyPrefs,
    });
    setOwnershipFeedback(
      'Downloaded your complete private data archive as a local JSON file.'
    );
  };

  const handlePermanentWipe = async () => {
    if (!currentUser || wipeConfirmText.trim().toUpperCase() !== 'WIPE') return;
    setIsWiping(true);
    setOwnershipError(null);
    setOwnershipFeedback(null);
    setWipeReport(null);

    try {
      const report = await permanentlyWipeUserVault(currentUser.uid);
      setWipeReport(report);
      setWipeConfirmText('');
      setOwnershipFeedback(
        `Permanent wipe complete. Removed ${report.totalDeleted} private ${
          report.totalDeleted === 1 ? 'record' : 'records'
        } across all 6 owner-only collections and cleared browser storage.`
      );
    } catch (err) {
      setOwnershipError(
        err instanceof Error
          ? err.message
          : 'Unable to wipe private data right now. Please try again.'
      );
    } finally {
      setIsWiping(false);
    }
  };

  const totalPrivateItems =
    diaryEntries.length +
    voiceJournals.length +
    memories.length +
    innerEntries.length +
    innerReflections.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-trust-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/45 backdrop-blur-md"
    >
      <div className="relative w-full max-w-4xl rounded-2xl sm:rounded-3xl bg-[#FAF8F5] shadow-2xl border border-white/90 max-h-[94dvh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="shrink-0 px-4 sm:px-7 pt-4 sm:pt-6 pb-3.5 bg-white/90 border-b border-slate-200/80 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Unsaid Privacy &amp; Trust Center</span>
              </div>
              <h2
                id="privacy-trust-heading"
                className="font-editorial text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight"
              >
                Verifiable privacy, never just promises.
              </h2>
              <p className="text-xs text-slate-600">
                Inspect exactly what leaves your browser, or export and permanently wipe your private account data at any time.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Privacy and Trust Center"
              className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2-Tab Segmented Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {(
              [
                {
                  id: 'overview',
                  label: 'How We Protect You',
                  icon: ShieldCheck,
                },
                {
                  id: 'ownership',
                  label: 'Export & Wipe Data',
                  icon: Download,
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200/75 text-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto garden-scroll px-4 sm:px-7 py-5 space-y-5">
          {/* TAB 1: HOW WE PROTECT YOU */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <section className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900">
                    <FileCode2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <h3 className="text-sm font-semibold">
                      Zero-Identity Meadow
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Public flowers and kind replies are written to a strict schema allowlist with no{' '}
                    <code className="font-mono text-[11px] text-slate-800">
                      userId
                    </code>
                    , email, or IP address. Even while signed in, planting a flower detaches your account identity completely.
                  </p>
                </section>

                <section className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Database className="w-4 h-4 text-emerald-700 shrink-0" />
                    <h3 className="text-sm font-semibold">
                      Owner-Only Private Storage
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Diary pages, voice journals, memories, and Inner Garden entries live under{' '}
                    <code className="font-mono text-[11px] text-slate-800">
                      /userAccounts/&#123;uid&#125;/...
                    </code>{' '}
                    enforced by server-side Firestore Rules—blocked for every other user, encrypted via TLS 1.3 in transit and AES-256 at rest.
                  </p>
                </section>

                <section className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900">
                    <MicOff className="w-4 h-4 text-emerald-700 shrink-0" />
                    <h3 className="text-sm font-semibold">
                      Mic &amp; AI Double Opt-In
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Your microphone is never accessed until you tap Record. AI reflections never receive private entries unless both global AI consent and the per-entry AI switch are explicitly turned on.
                  </p>
                </section>
              </div>

              {/* Live Public Payload Inspector */}
              <section className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-4">
                <div className="space-y-1">
                  <h3 className="font-editorial text-xl font-semibold text-slate-900">
                    Live Public Payload Inspector
                  </h3>
                  <p className="text-xs text-slate-600">
                    When you plant an anonymous flower in the meadow, Firestore security rules enforce this exact allowlisted JSON shape and reject any undocumented field.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-3 p-4 rounded-xl bg-slate-950 text-slate-100 overflow-x-auto">
                    <p className="text-[11px] font-mono text-emerald-300 mb-2">
                      POST /stories/&#123;storyId&#125; · Exact Allowlisted Fields
                    </p>
                    <pre className="text-[11px] font-mono leading-relaxed text-slate-200">
                      {JSON.stringify(SAMPLE_PUBLIC_PAYLOAD, null, 2)}
                    </pre>
                  </div>

                  <div className="lg:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <p className="text-xs font-semibold text-slate-900">
                      Explicitly Omitted &amp; Blocked
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {OMITTED_IDENTITY_FIELDS.map((field) => (
                        <li key={field} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="font-mono text-[11px]">{field}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                      Zero third-party ad pixels, social trackers, or analytics scripts are loaded anywhere in Unsaid.
                    </p>
                  </div>
                </div>
              </section>

              {/* 30-Second Browser DevTools Verification */}
              <section className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-editorial text-xl font-semibold text-slate-900">
                      Verify It Yourself in 30 Seconds
                    </h3>
                    <p className="text-xs text-slate-600">
                      You do not need to take our word for it—check live browser network traffic directly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ownership')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Export or Wipe Data</span>
                  </button>
                </div>

                <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
                  <li className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <p className="font-mono text-[11px] font-semibold text-emerald-800">
                      01 · Open DevTools
                    </p>
                    <p className="leading-relaxed">
                      Press{' '}
                      <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">
                        F12
                      </kbd>{' '}
                      (or Right-click → Inspect) and switch to the <strong>Network</strong> tab filtered by <strong>Fetch/XHR</strong>.
                    </p>
                  </li>
                  <li className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <p className="font-mono text-[11px] font-semibold text-emerald-800">
                      02 · Inspect Writes
                    </p>
                    <p className="leading-relaxed">
                      Plant a flower in the meadow and inspect the outgoing Firestore request payload in real time.
                    </p>
                  </li>
                  <li className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <p className="font-mono text-[11px] font-semibold text-emerald-800">
                      03 · Confirm Anonymity
                    </p>
                    <p className="leading-relaxed">
                      Public flowers transmit zero account IDs, emails, or device identifiers—and no third-party ad requests ever fire.
                    </p>
                  </li>
                </ol>
              </section>
            </>
          )}

          {/* TAB 2: EXPORT & WIPE DATA */}
          {activeTab === 'ownership' && (
            <>
              {ownershipFeedback && (
                <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                  <span>{ownershipFeedback}</span>
                </div>
              )}

              {ownershipError && (
                <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{ownershipError}</span>
                </div>
              )}

              {!currentUser ? (
                <section className="p-6 rounded-2xl bg-white border border-slate-200/80 text-center space-y-3">
                  <Download className="w-7 h-7 text-slate-700 mx-auto" />
                  <h3 className="font-editorial text-2xl font-semibold text-slate-900">
                    Sign in to export or wipe your private data
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                    Because anonymous meadow stories are not linked to any identity, only your signed-in private collections (Diary, Voice Journals, Memories, and Inner Garden) are tied to your account.
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isSigningIn}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs sm:text-sm font-medium cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>
                      {isSigningIn ? 'Signing in...' : 'Sign In with Google'}
                    </span>
                  </button>
                </section>
              ) : (
                <>
                  {/* Live Inventory Across All 5 Collections */}
                  <section className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-editorial text-xl font-semibold text-slate-900">
                          Your Private Data Inventory
                        </h3>
                        <p className="text-xs text-slate-500">
                          Signed in as {currentUser.email || 'Member'} ·{' '}
                          <span className="font-mono tabular-nums font-medium text-slate-800">
                            {totalPrivateItems}
                          </span>{' '}
                          total private records
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {[
                        {
                          label: 'Personal Diary',
                          count: diaryEntries.length,
                        },
                        { label: 'Voice Notes', count: voiceJournals.length },
                        { label: 'Saved Memories', count: memories.length },
                        {
                          label: 'Inner Journals',
                          count: innerEntries.length,
                        },
                        {
                          label: 'AI Reflections',
                          count: innerReflections.length,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-0.5"
                        >
                          <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                            {item.count}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            {item.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* One-Click Local JSON Export */}
                  <section className="p-5 rounded-2xl bg-white border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-editorial text-xl font-semibold text-slate-900">
                        Export Everything You Own
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                        Generates a clean JSON archive directly inside your browser with zero backend upload. All private entries and preferences are included.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportData}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export My Data (JSON)</span>
                    </button>
                  </section>

                  {/* Permanent Data Wipe */}
                  <section className="p-5 rounded-2xl bg-white border border-rose-200 space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-editorial text-xl font-semibold text-rose-900">
                        Permanently Wipe My Private Data
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Immediately and irreversibly deletes every document across all 6 owner-only Firestore subcollections (Personal Diary, Voice Notes, Saved Memories, Inner Garden Journals, AI Reflections, and Privacy Preferences) and clears local browser storage.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                      <input
                        type="text"
                        value={wipeConfirmText}
                        onChange={(e) => setWipeConfirmText(e.target.value)}
                        placeholder='Type "WIPE" to confirm permanent deletion'
                        aria-label="Type WIPE to confirm permanent deletion"
                        className="flex-1 rounded-xl bg-rose-50/40 border border-rose-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                      <button
                        type="button"
                        disabled={
                          isWiping ||
                          wipeConfirmText.trim().toUpperCase() !== 'WIPE'
                        }
                        onClick={handlePermanentWipe}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
                      >
                        {isWiping ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        <span>
                          {isWiping
                            ? 'Wiping Data...'
                            : 'Permanently Wipe My Data'}
                        </span>
                      </button>
                    </div>

                    {wipeReport && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                        <p className="font-semibold text-slate-900">
                          Deletion Receipt ({wipeReport.totalDeleted} total removed)
                        </p>
                        <p className="font-mono text-[11px] tabular-nums text-slate-600">
                          Diary: {wipeReport.byCollection.personalDiary} · Voice:{' '}
                          {wipeReport.byCollection.voiceJournals} · Memories:{' '}
                          {wipeReport.byCollection.memories} · Inner Journals:{' '}
                          {wipeReport.byCollection.innerJournalEntries} ·
                          Reflections: {wipeReport.byCollection.innerReflections}{' '}
                          · Prefs: {wipeReport.byCollection.innerPrivacyPrefs}
                        </p>
                      </div>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-7 py-3 bg-white/95 border-t border-slate-200/80">
          <p className="text-[11px] text-slate-500">
            Zero ad trackers · Strict owner-only Firestore rules · One-click export &amp; wipe
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
