export type SeedType = 'daisy' | 'sunflower' | 'lavender';

export type FlowerVariant =
  | 'pink-tulip'
  | 'yellow-tulip'
  | 'orange-tulip'
  | 'purple-wildflower'
  | 'daisy'
  | 'sunflower'
  | 'lavender';

export type ReactionType = 'warmth' | 'sunlight' | 'gentle-rain';

export interface SeedOption {
  id: SeedType;
  numberLabel: string;
  name: string;
  tagline: string;
  description: string;
  defaultFlowerVariant: FlowerVariant;
  accentColor: string;
  petalColor: string;
  glowColor: string;
}

export interface Story {
  storyId: string;
  anonymousId: string;
  content: string;
  seedType: SeedType;
  flowerVariant: FlowerVariant;
  contentWarning: string;
  moderationStatus: 'approved' | 'flagged' | 'removed';
  warmthCount: number;
  messageCount: number;
  positionX: number; // 2 to 98 (%)
  positionY: number; // 5 to 88 (% from bottom of meadow)
  scale: number; // 0.5 to 1.4
  createdAt: Date;
  updatedAt: Date;
  isNewlyPlanted?: boolean;
}

export interface PlantedStoryReceipt {
  storyId: string;
  userId: string;
  seedType: SeedType;
  flowerVariant: FlowerVariant;
  preview: string;
  createdAt: Date;
}

export interface SupportiveMessage {
  messageId: string;
  storyId: string;
  anonymousId: string;
  content: string;
  moderationStatus: 'approved' | 'flagged' | 'removed';
  createdAt: Date;
}

export interface KindMessageNotification {
  messageId: string;
  storyId: string;
  storyPreview: string;
  seedType: SeedType;
  flowerVariant: FlowerVariant;
  messageContent: string;
  createdAt: Date;
}

export interface NotificationReadState {
  lastReadAtMs: number;
  readMessageIds: string[];
  existsInCloud?: boolean;
}

export interface Reaction {
  reactionId: string;
  storyId: string;
  reactionType: ReactionType;
  createdAt: Date;
}

export type UserRole = 'member' | 'admin';

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  providerId: string;
  role: UserRole;
  userAgentSummary: string;
  loginCount: number;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginEvent {
  eventId: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  providerId: string;
  userAgentSummary: string;
  loggedInAt: Date;
}

export type SubscriptionPlanTier = 'free' | 'seedling' | 'bloom' | 'sanctuary';
export type SubscriptionBillingCycle = 'monthly' | 'yearly' | 'lifetime' | 'custom';
export type SubscriptionCurrency = 'INR' | 'USD' | 'EUR' | 'GBP';
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'paused'
  | 'expired'
  | 'cancelled';

export interface SubscriptionRecord {
  subscriptionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  planName: SubscriptionPlanTier;
  billingCycle: SubscriptionBillingCycle;
  amountPaid: number;
  currency: SubscriptionCurrency;
  status: SubscriptionStatus;
  notes: string;
  startedAt: string;
  expiresAt: string;
  recordedByUid: string;
  recordedByEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationReportRecord {
  reportId: string;
  targetType: 'story' | 'message';
  targetId: string;
  storyId: string;
  reason: string;
  details: string;
  status: 'pending' | 'reviewed';
  createdAt: Date;
}

export const SUBSCRIPTION_PLAN_CATALOG: {
  id: SubscriptionPlanTier;
  label: string;
  suggestedAmountInr: number;
  summary: string;
  badgeClass: string;
}[] = [
  {
    id: 'free',
    label: 'Free Meadow',
    suggestedAmountInr: 0,
    summary: 'Open anonymous garden access',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    id: 'seedling',
    label: 'Seedling Supporter',
    suggestedAmountInr: 199,
    summary: 'Monthly community supporter tier',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'bloom',
    label: 'Bloom Plus',
    suggestedAmountInr: 499,
    summary: 'Extended sanctuary care & reflection tier',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    id: 'sanctuary',
    label: 'Sanctuary Patron',
    suggestedAmountInr: 1499,
    summary: 'Full patron sponsorship & priority support',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
];

export const SEED_OPTIONS: SeedOption[] = [
  {
    id: 'daisy',
    numberLabel: 'Seed 01',
    name: 'Daisy',
    tagline: 'New beginnings & letting go',
    description: 'Symbolizes new beginnings and letting go.',
    defaultFlowerVariant: 'pink-tulip',
    accentColor: '#F4B8CC',
    petalColor: '#F9D6E2',
    glowColor: 'rgba(244, 184, 204, 0.55)',
  },
  {
    id: 'sunflower',
    numberLabel: 'Seed 02',
    name: 'Sunflower',
    tagline: 'Hope, courage & resilience',
    description: 'Symbolizes hope, courage, and resilience.',
    defaultFlowerVariant: 'yellow-tulip',
    accentColor: '#F7D77D',
    petalColor: '#FCE694',
    glowColor: 'rgba(247, 215, 125, 0.55)',
  },
  {
    id: 'lavender',
    numberLabel: 'Seed 03',
    name: 'Lavender',
    tagline: 'Peace, healing & release',
    description: 'Symbolizes peace, healing, and emotional release.',
    defaultFlowerVariant: 'purple-wildflower',
    accentColor: '#C9B6E4',
    petalColor: '#DFC9F5',
    glowColor: 'rgba(201, 182, 228, 0.55)',
  },
];

export interface AmbientMeadowFlower {
  flowerId: string;
  seedType: SeedType;
  flowerVariant: FlowerVariant;
  positionX: number; // 2 to 98 (%)
  positionY: number; // 5 to 88 (% from bottom of meadow)
  scale: number; // 0.5 to 1.4
}

// 35 living wildflowers arranged across the sunlit meadow — completely story-free on launch
// so every visitor meets a fresh, interactive field ready for real stories to bloom.
export const AMBIENT_MEADOW_FLOWERS: AmbientMeadowFlower[] = [
  { flowerId: 'meadow_bloom_01', seedType: 'daisy', flowerVariant: 'pink-tulip', positionX: 18, positionY: 64, scale: 1.08 },
  { flowerId: 'meadow_bloom_02', seedType: 'sunflower', flowerVariant: 'yellow-tulip', positionX: 29, positionY: 72, scale: 1.12 },
  { flowerId: 'meadow_bloom_03', seedType: 'lavender', flowerVariant: 'purple-wildflower', positionX: 38, positionY: 56, scale: 0.98 },
  { flowerId: 'meadow_bloom_04', seedType: 'daisy', flowerVariant: 'daisy', positionX: 48, positionY: 68, scale: 1.05 },
  { flowerId: 'meadow_bloom_05', seedType: 'sunflower', flowerVariant: 'orange-tulip', positionX: 59, positionY: 62, scale: 1.1 },
  { flowerId: 'meadow_bloom_06', seedType: 'lavender', flowerVariant: 'lavender', positionX: 71, positionY: 70, scale: 1.04 },
  { flowerId: 'meadow_bloom_07', seedType: 'daisy', flowerVariant: 'pink-tulip', positionX: 82, positionY: 64, scale: 1.06 },
  { flowerId: 'meadow_bloom_08', seedType: 'sunflower', flowerVariant: 'sunflower', positionX: 11, positionY: 48, scale: 1.16 },
  { flowerId: 'meadow_bloom_09', seedType: 'lavender', flowerVariant: 'purple-wildflower', positionX: 23, positionY: 38, scale: 1.2 },
  { flowerId: 'meadow_bloom_10', seedType: 'daisy', flowerVariant: 'pink-tulip', positionX: 34, positionY: 42, scale: 1.18 },
  { flowerId: 'meadow_bloom_11', seedType: 'sunflower', flowerVariant: 'yellow-tulip', positionX: 53, positionY: 44, scale: 1.15 },
  { flowerId: 'meadow_bloom_12', seedType: 'lavender', flowerVariant: 'pink-tulip', positionX: 66, positionY: 36, scale: 1.22 },
  { flowerId: 'meadow_bloom_13', seedType: 'daisy', flowerVariant: 'orange-tulip', positionX: 78, positionY: 46, scale: 1.14 },
  { flowerId: 'meadow_bloom_14', seedType: 'sunflower', flowerVariant: 'pink-tulip', positionX: 89, positionY: 54, scale: 1.09 },
  { flowerId: 'meadow_bloom_15', seedType: 'lavender', flowerVariant: 'yellow-tulip', positionX: 43, positionY: 26, scale: 1.26 },
  { flowerId: 'meadow_bloom_16', seedType: 'daisy', flowerVariant: 'daisy', positionX: 7, positionY: 76, scale: 0.84 },
  { flowerId: 'meadow_bloom_17', seedType: 'sunflower', flowerVariant: 'sunflower', positionX: 15, positionY: 82, scale: 0.78 },
  { flowerId: 'meadow_bloom_18', seedType: 'lavender', flowerVariant: 'lavender', positionX: 25, positionY: 85, scale: 0.75 },
  { flowerId: 'meadow_bloom_19', seedType: 'daisy', flowerVariant: 'pink-tulip', positionX: 37, positionY: 80, scale: 0.82 },
  { flowerId: 'meadow_bloom_20', seedType: 'sunflower', flowerVariant: 'orange-tulip', positionX: 49, positionY: 84, scale: 0.76 },
  { flowerId: 'meadow_bloom_21', seedType: 'lavender', flowerVariant: 'purple-wildflower', positionX: 61, positionY: 81, scale: 0.8 },
  { flowerId: 'meadow_bloom_22', seedType: 'daisy', flowerVariant: 'yellow-tulip', positionX: 74, positionY: 83, scale: 0.77 },
  { flowerId: 'meadow_bloom_23', seedType: 'sunflower', flowerVariant: 'daisy', positionX: 86, positionY: 79, scale: 0.83 },
  { flowerId: 'meadow_bloom_24', seedType: 'lavender', flowerVariant: 'lavender', positionX: 94, positionY: 74, scale: 0.86 },
  { flowerId: 'meadow_bloom_25', seedType: 'daisy', flowerVariant: 'orange-tulip', positionX: 6, positionY: 28, scale: 1.24 },
  { flowerId: 'meadow_bloom_26', seedType: 'sunflower', flowerVariant: 'yellow-tulip', positionX: 15, positionY: 16, scale: 1.3 },
  { flowerId: 'meadow_bloom_27', seedType: 'lavender', flowerVariant: 'pink-tulip', positionX: 28, positionY: 14, scale: 1.32 },
  { flowerId: 'meadow_bloom_28', seedType: 'daisy', flowerVariant: 'purple-wildflower', positionX: 56, positionY: 18, scale: 1.28 },
  { flowerId: 'meadow_bloom_29', seedType: 'sunflower', flowerVariant: 'sunflower', positionX: 73, positionY: 13, scale: 1.31 },
  { flowerId: 'meadow_bloom_30', seedType: 'lavender', flowerVariant: 'daisy', positionX: 87, positionY: 22, scale: 1.26 },
  { flowerId: 'meadow_bloom_31', seedType: 'daisy', flowerVariant: 'lavender', positionX: 93, positionY: 36, scale: 1.18 },
  { flowerId: 'meadow_bloom_32', seedType: 'sunflower', flowerVariant: 'pink-tulip', positionX: 43, positionY: 54, scale: 1.04 },
  { flowerId: 'meadow_bloom_33', seedType: 'lavender', flowerVariant: 'orange-tulip', positionX: 65, positionY: 52, scale: 1.06 },
  { flowerId: 'meadow_bloom_34', seedType: 'daisy', flowerVariant: 'yellow-tulip', positionX: 83, positionY: 56, scale: 1.01 },
  { flowerId: 'meadow_bloom_35', seedType: 'sunflower', flowerVariant: 'purple-wildflower', positionX: 11, positionY: 62, scale: 0.96 },
  { flowerId: 'meadow_bloom_36', seedType: 'lavender', flowerVariant: 'sunflower', positionX: 95, positionY: 14, scale: 1.29 },
];

// =========================================================================
// MY SPACE & THE SECRET GARDEN FREEMIUM TYPES (Synced with firebase-blueprint)
// =========================================================================

// Temporary global override: keeps all My Space & Secret Garden features free to everyone
export const ALL_PREMIUM_FEATURES_FREE_FOR_NOW = true;

export type SecretGardenPlanId =
  | 'free'
  | 'secret_garden_monthly'
  | 'secret_garden_annual';

export type SecretGardenStatus =
  | 'free'
  | 'trialing'
  | 'active'
  | 'cancelled'
  | 'expired';

export type SecretGardenBillingCycle = 'none' | 'monthly' | 'annual';

export type SecretGardenPaymentMode =
  | 'none'
  | 'trial_no_card'
  | 'demo_checkout'
  | 'admin_assigned';

export type GardenThemeId =
  | 'meadow'
  | 'twilight'
  | 'blossom_mist'
  | 'golden_hour';

export type GardenBackgroundId =
  | 'classic_sky'
  | 'pastel_dawn'
  | 'starlit_dusk'
  | 'dew_morning';

export type GardenEffectId =
  | 'breeze'
  | 'fireflies'
  | 'sakura_drift'
  | 'sunbeams';

export type ExclusiveFloraPresetId =
  | 'classic'
  | 'moonlight_iris'
  | 'pastel_peony'
  | 'golden_lotus';

export interface GardenCustomisationSettings {
  gardenTheme: GardenThemeId;
  gardenBackground: GardenBackgroundId;
  gardenEffect: GardenEffectId;
  exclusiveFloraPreset: ExclusiveFloraPresetId;
}

export const DEFAULT_GARDEN_CUSTOMISATION: GardenCustomisationSettings = {
  gardenTheme: 'meadow',
  gardenBackground: 'classic_sky',
  gardenEffect: 'breeze',
  exclusiveFloraPreset: 'classic',
};

export interface SecretGardenMembership {
  userId: string;
  planId: SecretGardenPlanId;
  status: SecretGardenStatus;
  hasUsedFreeTrial: boolean;
  trialStartedAt: string;
  trialEndsAt: string;
  billingCycle: SecretGardenBillingCycle;
  priceInr: number;
  startedAt: string;
  nextBillingAt: string;
  autoRenew: boolean;
  paymentMode: SecretGardenPaymentMode;
  gardenTheme: GardenThemeId;
  gardenBackground: GardenBackgroundId;
  gardenEffect: GardenEffectId;
  exclusiveFloraPreset: ExclusiveFloraPresetId;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiaryEntry {
  entryId: string;
  userId: string;
  title: string;
  content: string;
  moodTag: string;
  entryDate: string;
  isMemorySaved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceJournal {
  voiceId: string;
  userId: string;
  title: string;
  durationSeconds: number;
  mimeType: string;
  audioDataUrl: string;
  recordedDate: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MemorySourceType =
  | 'community_story'
  | 'supportive_reply'
  | 'diary_entry';

export type MemoryFolder =
  | 'Quiet Comfort'
  | 'Kind Words'
  | 'Personal Milestones'
  | 'Unsorted';

export interface SavedMemory {
  memoryId: string;
  userId: string;
  sourceType: MemorySourceType;
  sourceId: string;
  anonymousLabel: string;
  title: string;
  excerpt: string;
  flowerVariant: string;
  folder: MemoryFolder;
  personalNote: string;
  savedAt: Date;
}

export const MEMORY_FOLDERS: MemoryFolder[] = [
  'Quiet Comfort',
  'Kind Words',
  'Personal Milestones',
  'Unsorted',
];

export const DIARY_MOOD_TAGS: string[] = [
  'Quiet',
  'Reflective',
  'Heavy',
  'Hopeful',
  'Grateful',
  'Unfiltered',
];

export interface SecretGardenPlanDefinition {
  id: SecretGardenPlanId;
  name: string;
  priceLabel: string;
  priceInr: number;
  billingCycle: SecretGardenBillingCycle;
  tagline: string;
  features: string[];
  badge?: string;
}

export const SECRET_GARDEN_PLANS: SecretGardenPlanDefinition[] = [
  {
    id: 'free',
    name: 'Open Meadow',
    priceLabel: '₹0',
    priceInr: 0,
    billingCycle: 'none',
    tagline: 'Forever open & anonymous',
    features: [
      'Anonymous story planting',
      'Read community stories',
      'Send warmth & supportive replies',
      'Basic sunlit garden & free customisation',
      'Community safety & reporting tools',
    ],
  },
  {
    id: 'secret_garden_monthly',
    name: 'The Secret Garden Monthly',
    priceLabel: '₹99/month',
    priceInr: 99,
    billingCycle: 'monthly',
    tagline: 'First month free · No card needed for trial',
    features: [
      'Private Personal Diary',
      'Private Voice Journaling',
      'My Memories keepsake vault',
      'Chronological Reflection History',
      'Exclusive garden themes, flora & effects',
    ],
  },
  {
    id: 'secret_garden_annual',
    name: 'The Secret Garden Annual',
    priceLabel: '₹799/year',
    priceInr: 799,
    billingCycle: 'annual',
    badge: 'Save 33%',
    tagline: 'First month free · Explicit renewal choice',
    features: [
      'Everything in Monthly Secret Garden',
      'Full year of private journaling & voice notes',
      'All seasonal botanical themes & flora aura',
      'Dedicated ₹400 annual savings vs monthly',
    ],
  },
];

export const GARDEN_THEME_CATALOG: {
  id: GardenThemeId;
  name: string;
  description: string;
  isPremium: boolean;
  swatch: string;
}[] = [
  {
    id: 'meadow',
    name: 'Sunlit Meadow',
    description: 'The original crisp blue sky and sunlit emerald field.',
    isPremium: false,
    swatch: 'from-sky-400 to-emerald-500',
  },
  {
    id: 'blossom_mist',
    name: 'Rosewater Mist',
    description: 'Soft rose-tinted morning air veiled across quiet blooms.',
    isPremium: true,
    swatch: 'from-rose-200 via-pink-100 to-emerald-400',
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour Sanctuary',
    description: 'Warm amber sunlight resting softly over the evening grass.',
    isPremium: true,
    swatch: 'from-amber-200 via-orange-100 to-lime-600',
  },
  {
    id: 'twilight',
    name: 'Lavender Twilight',
    description: 'Dreamy indigo dusk and cool violet stillness for late nights.',
    isPremium: true,
    swatch: 'from-indigo-500 via-purple-300 to-emerald-700',
  },
];

export const GARDEN_BACKGROUND_CATALOG: {
  id: GardenBackgroundId;
  name: string;
  description: string;
  isPremium: boolean;
  tintOverlay: string;
}[] = [
  {
    id: 'classic_sky',
    name: 'Clear Afternoon Sky',
    description: 'Bright coastal breeze & drifting clouds.',
    isPremium: false,
    tintOverlay: 'transparent',
  },
  {
    id: 'pastel_dawn',
    name: 'Pastel Peach Dawn',
    description: 'Blush horizon glow with soft cream clouds.',
    isPremium: true,
    tintOverlay: 'rgba(255, 212, 224, 0.22)',
  },
  {
    id: 'dew_morning',
    name: 'Mint Morning Dew',
    description: 'Crisp sage-mist veil over cool sky.',
    isPremium: true,
    tintOverlay: 'rgba(209, 250, 229, 0.22)',
  },
  {
    id: 'starlit_dusk',
    name: 'Quiet Starlit Dusk',
    description: 'Gentle indigo twilight with faint evening stars.',
    isPremium: true,
    tintOverlay: 'rgba(67, 56, 202, 0.28)',
  },
];

export const GARDEN_EFFECT_CATALOG: {
  id: GardenEffectId;
  name: string;
  description: string;
  isPremium: boolean;
}[] = [
  {
    id: 'breeze',
    name: 'Gentle Meadow Breeze',
    description: 'Original drifting pollen and butterflies.',
    isPremium: false,
  },
  {
    id: 'fireflies',
    name: 'Evening Fireflies',
    description: 'Warm floating lantern sparks gliding above flowers.',
    isPremium: true,
  },
  {
    id: 'sakura_drift',
    name: 'Pastel Petal Drift',
    description: 'Extra soft pink and lavender blossom petals in the wind.',
    isPremium: true,
  },
  {
    id: 'sunbeams',
    name: 'Sanctuary Sunbeams',
    description: 'Luminous golden rays & heightened meadow bokeh.',
    isPremium: true,
  },
];

export const EXCLUSIVE_FLORA_CATALOG: {
  id: ExclusiveFloraPresetId;
  name: string;
  description: string;
  isPremium: boolean;
  auraColor: string;
}[] = [
  {
    id: 'classic',
    name: 'Wild Meadow Mix',
    description: 'Classic tulips, daisies, sunflowers, and wild lavender.',
    isPremium: false,
    auraColor: 'transparent',
  },
  {
    id: 'pastel_peony',
    name: 'Blush Peony Glow',
    description: 'Silky rose halo shimmer around resting blooms.',
    isPremium: true,
    auraColor: 'rgba(244, 184, 204, 0.34)',
  },
  {
    id: 'moonlight_iris',
    name: 'Moonlight Iris Aura',
    description: 'Cool pearl-lavender luminescence on each stem.',
    isPremium: true,
    auraColor: 'rgba(196, 181, 253, 0.36)',
  },
  {
    id: 'golden_lotus',
    name: 'Sunlit Lotus Radiance',
    description: 'Gentle champagne sunlight halo beneath every petal.',
    isPremium: true,
    auraColor: 'rgba(253, 224, 130, 0.36)',
  },
];

// =========================================================================
// MY INNER GARDEN — AI VOICE JOURNALING, MEMORY & EMOTIONAL PATTERNS
// =========================================================================

export type InnerEntryKind = 'voice' | 'text' | 'voice_and_text';
export type InnerStorageChoice = 'audio' | 'transcript' | 'both';

export interface InnerEmotionItem {
  label: string;
  intensity: number; // 1..100 approximate text interpretation
}

export interface InnerJournalEntry {
  entryId: string;
  userId: string;
  entryKind: InnerEntryKind;
  storageChoice: InnerStorageChoice;
  title: string;
  transcript: string;
  durationSeconds: number;
  mimeType: string;
  audioDataUrl: string;
  recordedDate: string; // YYYY-MM-DD
  allowAiAnalysis: boolean;
  aiSummary: string;
  aiReflection: string;
  primaryEmotion: string;
  emotions: InnerEmotionItem[];
  themes: string[];
  emotionConfidenceNote: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InnerReflectionMemory {
  reflectionId: string;
  userId: string;
  periodType: 'weekly' | 'monthly';
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  reflectionText: string;
  gentleTakeaway: string;
  recurringThemes: string[];
  sourceEntryIds: string[];
  entryCountAnalyzed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InnerPrivacyPrefs {
  prefId: string;
  userId: string;
  allowAudioStorageConsent: boolean;
  allowAiProcessingConsent: boolean;
  consentAcknowledgedAt: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InnerAiServerStatus {
  configured: boolean;
  models: {
    transcription: string;
    analysis: string;
  };
  trainingOptOutNote: string;
}

export interface ExtractedThemeItem {
  theme: string;
  description: string;
  frequency: number;
  entryIds: string[];
}

