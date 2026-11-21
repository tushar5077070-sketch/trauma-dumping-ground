import React, { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  LogIn,
  FileCode2,
  MicOff,
  Database,
  Sparkles,
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
  clearActiveVaultPassphrase,
  decryptTextWithPassphrase,
  encryptTextWithPassphrase,
  getActiveVaultPassphrase,
  isEncryptedPayload,
  setActiveVaultPassphrase,
} from '../utils/vaultCrypto';
import {
  decryptExistingVaultEntries,
  downloadUserVaultExport,
  encryptExistingVaultEntries,
  permanentlyWipeUserVault,
  WipeVaultReport,
} from '../services/privacyVaultService';
import { signInWithGoogleAndRecord } from '../services/authAccountService';

export type PrivacyTrustTab = 'overview' | 'encryption' | 'ownership';

interface PrivacyTrustModalProps {
  isOpen: boolean;
  initialTab?: PrivacyTrustTab;
  currentUser: User | null;
  vaultUnlocked: boolean;
  rawDiaryEntries: DiaryEntry[];
  rawInnerEntries: InnerJournalEntry[];
  rawInnerReflections: InnerReflectionMemory[];
  decryptedDiaryEntries: DiaryEntry[];
  decryptedInnerEntries: InnerJournalEntry[];
  decryptedInnerReflections: InnerReflectionMemory[];
  voiceJournals: VoiceJournal[];
  memories: SavedMemory[];
  innerPrivacyPrefs: InnerPrivacyPrefs | null;
  onClose: () => void;
}

const SAMPLE_PUBLIC_PAYLOAD = {
  storyId: 'story_9f2a8c1d',
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
  vaultUnlocked,
  rawDiaryEntries,
  rawInnerEntries,
  rawInnerReflections,
  decryptedDiaryEntries,
  decryptedInnerEntries,
  decryptedInnerReflections,
  voiceJournals,
  memories,
  innerPrivacyPrefs,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<PrivacyTrustTab>(initialTab);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [vaultMessage, setVaultMessage] = useState<string | null>(null);
  const [isProcessingVault, setIsProcessingVault] = useState(false);

  // Interactive Live AES-256-GCM Ciphertext Proof
  const [demoPlainText, setDemoPlainText] = useState(
    'Today I felt lighter after saying what I kept inside.'
  );
  const [demoCipherOutput, setDemoCipherOutput] = useState<string | null>(null);
  const [isRunningDemo, setIsRunningDemo] = useState(false);

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
      setVaultError(null);
      setVaultMessage(null);
      setOwnershipError(null);
      setOwnershipFeedback(null);
    }
  }, [isOpen, initialTab]);

  // Count encrypted vs. standard entries across the 3 text-bearing private collections
  const vaultStats = useMemo(() => {
    let encryptedCount = 0;
    let standardCount = 0;
    let sampleEncryptedPayload: string | null = null;

    for (const d of rawDiaryEntries) {
      if (!d.content) continue;
      if (isEncryptedPayload(d.content)) {
        encryptedCount += 1;
        if (!sampleEncryptedPayload) sampleEncryptedPayload = d.content;
      } else {
        standardCount += 1;
      }
    }

    for (const e of rawInnerEntries) {
      if (!e.transcript) continue;
      if (isEncryptedPayload(e.transcript)) {
        encryptedCount += 1;
        if (!sampleEncryptedPayload) sampleEncryptedPayload = e.transcript;
      } else {
        standardCount += 1;
      }
    }

    for (const r of rawInnerReflections) {
      if (!r.reflectionText) continue;
      if (isEncryptedPayload(r.reflectionText)) {
        encryptedCount += 1;
        if (!sampleEncryptedPayload) sampleEncryptedPayload = r.reflectionText;
      } else {
        standardCount += 1;
      }
    }

    return { encryptedCount, standardCount, sampleEncryptedPayload };
  }, [rawDiaryEntries, rawInnerEntries, rawInnerReflections]);

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

  const handleUnlockOrEnableVault = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = passphraseInput.trim();
    if (cleaned.length < 6) {
      setVaultError('Passphrase must be at least 6 characters long.');
      return;
    }

    setIsProcessingVault(true);
    setVaultError(null);
    setVaultMessage(null);

    try {
      // If encrypted entries already exist, verify the passphrase decrypts them before unlocking
      if (vaultStats.sampleEncryptedPayload) {
        try {
          await decryptTextWithPassphrase(
            vaultStats.sampleEncryptedPayload,
            cleaned
          );
        } catch {
          setVaultError(
            'That passphrase did not unlock your existing encrypted entries. Check spelling and capitalization.'
          );
          setIsProcessingVault(false);
          return;
        }
      }

      setActiveVaultPassphrase(cleaned);
      setPassphraseInput('');
      setVaultMessage(
        vaultStats.encryptedCount > 0
          ? 'Vault unlocked in browser memory. Your encrypted entries are now readable.'
          : 'Zero-Knowledge Encryption is active for this session. New private entries will be encrypted in your browser before saving.'
      );
    } catch (err) {
      setVaultError(
        err instanceof Error ? err.message : 'Unable to activate vault encryption.'
      );
    } finally {
      setIsProcessingVault(false);
    }
  };

  const handleLockVault = () => {
    clearActiveVaultPassphrase();
    setVaultError(null);
    setVaultMessage(
      'Vault locked. Your passphrase has been cleared from browser memory.'
    );
  };

  const handleEncryptExisting = async () => {
    const pass = getActiveVaultPassphrase();
    if (!currentUser || !pass) return;
    setIsProcessingVault(true);
    setVaultError(null);
    setVaultMessage(null);

    try {
      const result = await encryptExistingVaultEntries(
        currentUser.uid,
        pass,
        rawDiaryEntries,
        rawInnerEntries,
        rawInnerReflections
      );
      if (result.encryptedCount === 0 && result.skippedCount === 0) {
        setVaultMessage('All eligible entries are already end-to-end encrypted.');
      } else {
        setVaultMessage(
          `Encrypted ${result.encryptedCount} existing ${
            result.encryptedCount === 1 ? 'entry' : 'entries'
          } with AES-256-GCM.${
            result.skippedCount > 0
              ? ` ${result.skippedCount} very long ${
                  result.skippedCount === 1 ? 'entry was' : 'entries were'
                } skipped to stay within database field limits.`
              : ''
          }`
        );
      }
    } catch (err) {
      setVaultError(
        err instanceof Error
          ? err.message
          : 'Unable to encrypt existing entries right now.'
      );
    } finally {
      setIsProcessingVault(false);
    }
  };

  const handleDecryptExisting = async () => {
    const pass = getActiveVaultPassphrase();
    if (!currentUser || !pass) return;
    setIsProcessingVault(true);
    setVaultError(null);
    setVaultMessage(null);

    try {
      const result = await decryptExistingVaultEntries(
        currentUser.uid,
        pass,
        rawDiaryEntries,
        rawInnerEntries,
        rawInnerReflections
      );
      setVaultMessage(
        `Decrypted ${result.decryptedCount} ${
          result.decryptedCount === 1 ? 'entry' : 'entries'
        } back to standard Firestore AES-256 at-rest storage.${
          result.failedCount > 0
            ? ` ${result.failedCount} ${
                result.failedCount === 1 ? 'entry' : 'entries'
              } used a different passphrase and remained encrypted.`
            : ''
        }`
      );
    } catch (err) {
      setVaultError(
        err instanceof Error
          ? err.message
          : 'Unable to decrypt entries right now.'
      );
    } finally {
      setIsProcessingVault(false);
    }
  };

  const handleRunLiveCipherDemo = async () => {
    const sample = demoPlainText.trim();
    if (!sample) return;
    setIsRunningDemo(true);
    try {
      const key =
        getActiveVaultPassphrase() || 'unsaid-local-browser-proof-key';
      const cipher = await encryptTextWithPassphrase(sample, key);
      setDemoCipherOutput(cipher);
    } catch {
      setDemoCipherOutput('Web Crypto API is unavailable in this browser.');
    } finally {
      setIsRunningDemo(false);
    }
  };

  const handleExportData = () => {
    if (!currentUser) return;
    setOwnershipError(null);
    downloadUserVaultExport({
      userEmail: currentUser.email || 'Signed-in Member',
      vaultUnlocked,
      diaryEntries: decryptedDiaryEntries,
      voiceJournals,
      memories,
      innerEntries: decryptedInnerEntries,
      innerReflections: decryptedInnerReflections,
      innerPrivacyPrefs,
    });
    setOwnershipFeedback(
      vaultUnlocked || vaultStats.encryptedCount === 0
        ? 'Downloaded your complete private vault as a local JSON file.'
        : 'Downloaded your private vault JSON. Note: locked Zero-Knowledge entries were exported as locked notices — unlock your vault first if you want readable text.'
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
          : 'Unable to wipe private vault right now. Please try again.'
      );
    } finally {
      setIsWiping(false);
    }
  };

  const totalPrivateItems =
    rawDiaryEntries.length +
    voiceJournals.length +
    memories.length +
    rawInnerEntries.length +
    rawInnerReflections.length;

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
                Inspect what leaves your browser, lock private entries with your own encryption key, or export and wipe everything in one click.
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

          {/* 3-Tab Segmented Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {(
              [
                {
                  id: 'overview',
                  label: 'How We Protect You',
                  icon: ShieldCheck,
                },
                {
                  id: 'encryption',
                  label: vaultUnlocked
                    ? 'Zero-Knowledge Vault · Unlocked'
                    : 'Zero-Knowledge Vault',
                  icon: vaultUnlocked ? Unlock : KeyRound,
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
                      Owner-Only Private Vaults
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
                    Your microphone is never accessed until you tap Record. Gemini AI never receives private entries unless both global AI consent and the per-entry AI switch are explicitly turned on.
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
                    onClick={() => setActiveTab('encryption')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-200" />
                    <span>Set Up Zero-Knowledge Vault</span>
                  </button>
                </div>

                <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
                  <li className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <p className="font-mono text-[11px] font-semibold text-emerald-800">
                      01 · Open DevTools
                    </p>
                    <p className="leading-relaxed">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">F12</kbd> (or Right-click → Inspect) and switch to the <strong>Network</strong> tab filtered by <strong>Fetch/XHR</strong>.
                    </p>
                  </li>
                  <li className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <p className="font-mono text-[11px] font-semibold text-emerald-800">
                      02 · Inspect Writes
                    </p>
                    <p className="leading-relaxed">
                      Plant a flower or save a Zero-Knowledge encrypted diary page and inspect the outgoing Firestore request payload.
                    </p>
                  </li>
                  <li className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <p className="font-mono text-[11px] font-semibold text-emerald-800">
                      03 · Confirm Ciphertext
                    </p>
                    <p className="leading-relaxed">
                      Public flowers show zero identity fields, and Zero-Knowledge vault saves transmit only unreadable{' '}
                      <code className="font-mono text-[10px]">unsaid:e2ee:v1:...</code> ciphertext.
                    </p>
                  </li>
                </ol>
              </section>
            </>
          )}

          {/* TAB 2: ZERO-KNOWLEDGE VAULT */}
          {activeTab === 'encryption' && (
            <>
              {vaultMessage && (
                <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                  <span>{vaultMessage}</span>
                </div>
              )}

              {vaultError && (
                <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{vaultError}</span>
                </div>
              )}

              {!currentUser ? (
                <section className="p-6 rounded-2xl bg-white border border-slate-200/80 text-center space-y-3">
                  <KeyRound className="w-7 h-7 text-emerald-700 mx-auto" />
                  <h3 className="font-editorial text-2xl font-semibold text-slate-900">
                    Sign in to activate your Zero-Knowledge Vault
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                    Once signed in, you can set a personal passphrase that encrypts your Diary, Inner Garden journals, and Reflections inside your browser using Web Crypto AES-256-GCM before anything reaches the database.
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
                  {/* Vault Metrics Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-1">
                      <p className="text-[11px] font-medium text-slate-500">
                        Vault Session State
                      </p>
                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                        {vaultUnlocked ? (
                          <>
                            <Unlock className="w-4 h-4 text-emerald-700" />
                            <span>Unlocked in Browser Memory</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 text-slate-500" />
                            <span>Locked</span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-1">
                      <p className="text-[11px] font-medium text-slate-500">
                        Zero-Knowledge Encrypted
                      </p>
                      <p className="font-mono text-xl font-semibold text-slate-900 tabular-nums">
                        {vaultStats.encryptedCount}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Unreadable without your passphrase
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-1">
                      <p className="text-[11px] font-medium text-slate-500">
                        Standard Vault Entries
                      </p>
                      <p className="font-mono text-xl font-semibold text-slate-900 tabular-nums">
                        {vaultStats.standardCount}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Protected by owner-only Firestore rules
                      </p>
                    </div>
                  </div>

                  {/* Unlock / Set Passphrase or Active Controls */}
                  {!vaultUnlocked ? (
                    <form
                      onSubmit={handleUnlockOrEnableVault}
                      className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-4"
                    >
                      <div className="space-y-1">
                        <h3 className="font-editorial text-xl font-semibold text-slate-900">
                          {vaultStats.encryptedCount > 0
                            ? 'Unlock Your Encrypted Entries'
                            : 'Enable Client-Side Passphrase Encryption'}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {vaultStats.encryptedCount > 0
                            ? 'Enter your personal passphrase to decrypt your private entries inside your browser for this session.'
                            : 'Choose a passphrase you will remember (minimum 6 characters). Your browser derives an AES-256-GCM key using PBKDF2-SHA256 (150,000 iterations) so not even a database administrator can read your raw words.'}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1">
                          <input
                            type={showPassphrase ? 'text' : 'password'}
                            value={passphraseInput}
                            onChange={(e) => setPassphraseInput(e.target.value)}
                            placeholder={
                              vaultStats.encryptedCount > 0
                                ? 'Enter your vault passphrase...'
                                : 'Create a memorable passphrase (min 6 chars)...'
                            }
                            autoComplete="off"
                            className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-3.5 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassphrase((v) => !v)}
                            aria-label={
                              showPassphrase
                                ? 'Hide passphrase'
                                : 'Show passphrase'
                            }
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            {showPassphrase ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={
                            isProcessingVault ||
                            passphraseInput.trim().length < 6
                          }
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer shrink-0"
                        >
                          {isProcessingVault ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Unlock className="w-4 h-4 text-emerald-300" />
                          )}
                          <span>
                            {vaultStats.encryptedCount > 0
                              ? 'Unlock Vault'
                              : 'Activate Encryption'}
                          </span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <section className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <h3 className="font-editorial text-xl font-semibold text-slate-900">
                            Zero-Knowledge Encryption Is Active
                          </h3>
                          <p className="text-xs text-slate-600">
                            New Personal Diary pages, Inner Garden transcripts, and AI Reflections are automatically encrypted before leaving your browser.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleLockVault}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-800 cursor-pointer shrink-0"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Lock Vault Now</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-200/70">
                        <button
                          type="button"
                          disabled={
                            isProcessingVault || vaultStats.standardCount === 0
                          }
                          onClick={handleEncryptExisting}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-45 text-white text-xs font-medium cursor-pointer"
                        >
                          {isProcessingVault ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-emerald-300" />
                          )}
                          <span>
                            Encrypt Existing Entries ({vaultStats.standardCount})
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={
                            isProcessingVault || vaultStats.encryptedCount === 0
                          }
                          onClick={handleDecryptExisting}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-45 text-slate-700 text-xs font-medium cursor-pointer"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>
                            Decrypt All Back to Standard (
                            {vaultStats.encryptedCount})
                          </span>
                        </button>
                      </div>
                    </section>
                  )}

                  {/* Honest Transparency Note */}
                  <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200/80 text-xs text-slate-700 leading-relaxed space-y-1">
                    <p className="font-semibold text-slate-900">
                      Important Note on Recovery &amp; Scope
                    </p>
                    <p>
                      Because your passphrase stays strictly in browser memory and is never saved on Unsaid servers, <strong>it cannot be reset or recovered if forgotten</strong>. Entry prose (Diary content, Inner Garden transcripts, and AI Reflection text) is end-to-end encrypted while dates and optional short titles remain lightweight labels for chronological sorting.
                    </p>
                  </div>
                </>
              )}

              {/* Interactive Live AES-256-GCM Ciphertext Proof (Works Signed In or Out) */}
              <section className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3">
                <div className="space-y-0.5">
                  <h3 className="font-editorial text-xl font-semibold text-slate-900">
                    Live In-Browser Encryption Proof
                  </h3>
                  <p className="text-xs text-slate-600">
                    Test the exact Web Crypto API{' '}
                    <code className="font-mono text-[11px] text-slate-800">
                      AES-256-GCM + PBKDF2-SHA256
                    </code>{' '}
                    routine locally—see the exact ciphertext format written to Firestore.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={demoPlainText}
                    onChange={(e) => setDemoPlainText(e.target.value)}
                    placeholder="Type any private sentence to test encryption..."
                    className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                  <button
                    type="button"
                    disabled={isRunningDemo || !demoPlainText.trim()}
                    onClick={handleRunLiveCipherDemo}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium cursor-pointer shrink-0"
                  >
                    {isRunningDemo ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    )}
                    <span>Preview Ciphertext</span>
                  </button>
                </div>

                {demoCipherOutput && (
                  <div className="p-3.5 rounded-xl bg-slate-950 text-emerald-200 font-mono text-[11px] break-all leading-relaxed">
                    {demoCipherOutput}
                  </div>
                )}
              </section>
            </>
          )}

          {/* TAB 3: EXPORT & WIPE DATA */}
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
                    Sign in to export or wipe your private vault
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
                          Your Private Vault Inventory
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
                          count: rawDiaryEntries.length,
                        },
                        { label: 'Voice Notes', count: voiceJournals.length },
                        { label: 'Saved Memories', count: memories.length },
                        {
                          label: 'Inner Journals',
                          count: rawInnerEntries.length,
                        },
                        {
                          label: 'AI Reflections',
                          count: rawInnerReflections.length,
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
                        Generates a clean JSON archive directly inside your browser with zero backend upload.{' '}
                        {vaultStats.encryptedCount > 0 && !vaultUnlocked
                          ? 'Your Zero-Knowledge Vault is currently locked—unlock it first if you want readable plaintext inside your backup.'
                          : 'All readable private entries and preferences are included.'}
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

                  {/* Permanent Vault Wipe */}
                  <section className="p-5 rounded-2xl bg-white border border-rose-200 space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-editorial text-xl font-semibold text-rose-900">
                        Permanently Wipe My Vault
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Immediately and irreversibly deletes every document across all 6 owner-only Firestore subcollections (Personal Diary, Voice Notes, Saved Memories, Inner Garden Journals, AI Reflections, and Privacy Preferences), clears browser storage, and locks your session.
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
                            ? 'Wiping Vault...'
                            : 'Permanently Wipe My Vault'}
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
            Zero ad trackers · Strict owner-only Firestore rules · Optional browser AES-256-GCM
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
