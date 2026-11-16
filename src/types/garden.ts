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

export interface SupportiveMessage {
  messageId: string;
  storyId: string;
  anonymousId: string;
  content: string;
  moderationStatus: 'approved' | 'flagged' | 'removed';
  createdAt: Date;
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

export const INITIAL_GARDEN_STORIES: Omit<Story, 'createdAt' | 'updatedAt'>[] = [
  {
    storyId: 'seed_story_1048',
    anonymousId: 'Anonymous Soul #1048',
    content:
      "I spent years pretending that everything was okay because I didn't want anyone to worry about me. Whenever someone asked how I was doing, I had a rehearsed smile ready. Sometimes I still wish someone had looked past the smile and noticed how exhausted I really was.",
    seedType: 'daisy',
    flowerVariant: 'pink-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 42,
    messageCount: 2,
    positionX: 18,
    positionY: 64,
    scale: 1.08,
  },
  {
    storyId: 'seed_story_2091',
    anonymousId: 'Anonymous Soul #2091',
    content:
      'I kept the last voicemail my grandmother left me for four years without listening to it because hearing her voice meant accepting she was gone. Yesterday I finally pressed play while sitting in the sun. She just said she saw a yellow bird on her porch and thought of me.',
    seedType: 'sunflower',
    flowerVariant: 'yellow-tulip',
    contentWarning: 'Grief & loss of a loved one',
    moderationStatus: 'approved',
    warmthCount: 68,
    messageCount: 2,
    positionX: 29,
    positionY: 72,
    scale: 1.12,
  },
  {
    storyId: 'seed_story_3114',
    anonymousId: 'Anonymous Soul #3114',
    content:
      'Growing up, I was always the peacekeeper in a loud, angry house. I learned how to read footsteps on the stairs before anyone even opened a door. Even now, living in my own quiet apartment, my shoulders tense up when a floorboard creaks. I am slowly teaching my body that it is safe here.',
    seedType: 'lavender',
    flowerVariant: 'purple-wildflower',
    contentWarning: 'Childhood household tension',
    moderationStatus: 'approved',
    warmthCount: 53,
    messageCount: 1,
    positionX: 38,
    positionY: 56,
    scale: 0.98,
  },
  {
    storyId: 'seed_story_4027',
    anonymousId: 'Anonymous Soul #4027',
    content:
      'I walked away from a ten-year friendship this spring after realizing I was the only one ever apologizing, reaching out, or making space. It hurts to grieve someone who is still alive, but for the first time in years my chest feels light when I wake up.',
    seedType: 'daisy',
    flowerVariant: 'daisy',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 37,
    messageCount: 1,
    positionX: 48,
    positionY: 68,
    scale: 1.05,
  },
  {
    storyId: 'seed_story_5182',
    anonymousId: 'Anonymous Soul #5182',
    content:
      'Nobody tells you how lonely it feels to outgrow the version of yourself that everyone else found convenient. When I started setting small boundaries, people acted like I had become cold. I am planting this here to remind myself that tenderness includes being tender to myself.',
    seedType: 'sunflower',
    flowerVariant: 'orange-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 49,
    messageCount: 1,
    positionX: 59,
    positionY: 62,
    scale: 1.1,
  },
  {
    storyId: 'seed_story_6309',
    anonymousId: 'Anonymous Soul #6309',
    content:
      'After my burnout last winter, I couldn’t read a single page of a book or answer a text message without crying. I felt like a broken machine. Today I cooked a warm meal from scratch and watched the clouds move for twenty minutes without feeling guilty for resting.',
    seedType: 'lavender',
    flowerVariant: 'lavender',
    contentWarning: 'Severe burnout & exhaustion',
    moderationStatus: 'approved',
    warmthCount: 61,
    messageCount: 1,
    positionX: 71,
    positionY: 70,
    scale: 1.04,
  },
  {
    storyId: 'seed_story_7415',
    anonymousId: 'Anonymous Soul #7415',
    content:
      'I packed my entire life into two suitcases at twenty-two to leave a town where I never felt like I belonged. Some nights the homesickness hits me out of nowhere—not for the place I left, but for a version of home I never actually had.',
    seedType: 'daisy',
    flowerVariant: 'pink-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 31,
    messageCount: 1,
    positionX: 82,
    positionY: 64,
    scale: 1.06,
  },
  {
    storyId: 'seed_story_8204',
    anonymousId: 'Anonymous Soul #8204',
    content:
      'I failed the exam I studied two years for, and I was too ashamed to tell my parents for a week. When I finally told my dad with tears streaming down my face, he just hugged me and asked what I wanted for dinner. I didn’t realize how much I needed unconditional grace.',
    seedType: 'sunflower',
    flowerVariant: 'sunflower',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 74,
    messageCount: 1,
    positionX: 11,
    positionY: 48,
    scale: 1.16,
  },
  {
    storyId: 'seed_story_9031',
    anonymousId: 'Anonymous Soul #9031',
    content:
      'There are words I rehearsed in the shower a thousand times that I will never get to say to the person who hurt me. Leaving them in this meadow feels like finally setting down a suitcase full of stones I have been carrying across every year of my twenties.',
    seedType: 'lavender',
    flowerVariant: 'purple-wildflower',
    contentWarning: 'Emotional hurt & closure',
    moderationStatus: 'approved',
    warmthCount: 45,
    messageCount: 1,
    positionX: 23,
    positionY: 38,
    scale: 1.2,
  },
  {
    storyId: 'seed_story_1592',
    anonymousId: 'Anonymous Soul #1592',
    content:
      'Everyone around me seems to be getting engaged, buying homes, or celebrating promotions, while I am just proud that I made it through a difficult year still breathing and still kind. I hope there is room in the world for quiet survival too.',
    seedType: 'daisy',
    flowerVariant: 'pink-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 83,
    messageCount: 2,
    positionX: 34,
    positionY: 42,
    scale: 1.18,
  },
  {
    storyId: 'seed_story_2764',
    anonymousId: 'Anonymous Soul #2764',
    content:
      'I apologized to my younger self tonight for all the times I blamed them for not knowing better. You were just a kid trying to navigate storms that adults couldn’t even handle. You did the best you could with what you knew.',
    seedType: 'sunflower',
    flowerVariant: 'yellow-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 58,
    messageCount: 1,
    positionX: 53,
    positionY: 44,
    scale: 1.15,
  },
  {
    storyId: 'seed_story_3890',
    anonymousId: 'Anonymous Soul #3890',
    content:
      'For a long time I thought healing meant waking up one morning and never feeling sad about the past again. Now I think healing is just noticing that the wind is warm today, even while carrying the memory of winter.',
    seedType: 'lavender',
    flowerVariant: 'pink-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 64,
    messageCount: 1,
    positionX: 66,
    positionY: 36,
    scale: 1.22,
  },
  {
    storyId: 'seed_story_4419',
    anonymousId: 'Anonymous Soul #4419',
    content:
      'I still set two mugs out on the counter some mornings by mistake. Grief is strange like that—it hides in muscle memory long after your mind has understood that life has changed.',
    seedType: 'daisy',
    flowerVariant: 'orange-tulip',
    contentWarning: 'Loss & bereavement',
    moderationStatus: 'approved',
    warmthCount: 52,
    messageCount: 1,
    positionX: 78,
    positionY: 46,
    scale: 1.14,
  },
  {
    storyId: 'seed_story_5673',
    anonymousId: 'Anonymous Soul #5673',
    content:
      'I spent so much of my life trying to be effortless and low-maintenance so nobody would ever feel burdened by loving me. I am finally learning to ask for help when my hands are full.',
    seedType: 'sunflower',
    flowerVariant: 'pink-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 47,
    messageCount: 1,
    positionX: 89,
    positionY: 54,
    scale: 1.09,
  },
  {
    storyId: 'seed_story_6812',
    anonymousId: 'Anonymous Soul #6812',
    content:
      'Sometimes the bravest thing I do all day is forgive myself for the days when I had nothing left to give. If you are reading this and feeling behind in life: you are not late, you are just healing at a human pace.',
    seedType: 'lavender',
    flowerVariant: 'yellow-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 91,
    messageCount: 2,
    positionX: 43,
    positionY: 26,
    scale: 1.26,
  },
  {
    storyId: 'seed_story_1102',
    anonymousId: 'Anonymous Soul #1102',
    content:
      'I cried in my parked car for forty minutes after my shift because nobody saw how hard I was trying to hold my team together while my own life was falling apart. Watching the streetlights come on helped me breathe again.',
    seedType: 'daisy',
    flowerVariant: 'daisy',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 39,
    messageCount: 0,
    positionX: 7,
    positionY: 76,
    scale: 0.84,
  },
  {
    storyId: 'seed_story_2218',
    anonymousId: 'Anonymous Soul #2218',
    content:
      'My dad never said "I love you" out loud, so I spent my twenties thinking I was hard to love. Last week he quietly fixed the squeaky hinge on my front door before driving back home. I am learning to hear care in the small languages people know.',
    seedType: 'sunflower',
    flowerVariant: 'sunflower',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 62,
    messageCount: 0,
    positionX: 15,
    positionY: 82,
    scale: 0.78,
  },
  {
    storyId: 'seed_story_3347',
    anonymousId: 'Anonymous Soul #3347',
    content:
      'For three years I felt guilty every time I laughed because grief felt like something I had to wear like a heavy coat. Now I realize joy does not erase who I lost; it just means I am still alive.',
    seedType: 'lavender',
    flowerVariant: 'lavender',
    contentWarning: 'Grief & healing',
    moderationStatus: 'approved',
    warmthCount: 54,
    messageCount: 0,
    positionX: 25,
    positionY: 85,
    scale: 0.75,
  },
  {
    storyId: 'seed_story_4481',
    anonymousId: 'Anonymous Soul #4481',
    content:
      'I deleted every old message thread tonight so I could stop re-reading promises that were never meant to be kept. My hands shook a little, but my room already feels quieter.',
    seedType: 'daisy',
    flowerVariant: 'pink-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 44,
    messageCount: 0,
    positionX: 37,
    positionY: 80,
    scale: 0.82,
  },
  {
    storyId: 'seed_story_5529',
    anonymousId: 'Anonymous Soul #5529',
    content:
      'I always felt like the backup friend—the one invited last minute or forgotten in group photos. Building a life where I take myself to coffee, museums, and sunny parks has been the kindest rebellion.',
    seedType: 'sunflower',
    flowerVariant: 'orange-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 71,
    messageCount: 0,
    positionX: 49,
    positionY: 84,
    scale: 0.76,
  },
  {
    storyId: 'seed_story_6634',
    anonymousId: 'Anonymous Soul #6634',
    content:
      'I left a career everyone applauded because it was hollowing me out from the inside. Starting over at thirty-one feels terrifying most mornings, yet my chest finally has room for air.',
    seedType: 'lavender',
    flowerVariant: 'purple-wildflower',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 48,
    messageCount: 0,
    positionX: 61,
    positionY: 81,
    scale: 0.8,
  },
  {
    storyId: 'seed_story_7740',
    anonymousId: 'Anonymous Soul #7740',
    content:
      'Sometimes insomnia feels like sitting in a theater after the movie ended, replaying every mistake I made in high school. Tonight I opened my window and listened to the wind in the trees instead.',
    seedType: 'daisy',
    flowerVariant: 'yellow-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 33,
    messageCount: 0,
    positionX: 74,
    positionY: 83,
    scale: 0.77,
  },
  {
    storyId: 'seed_story_8852',
    anonymousId: 'Anonymous Soul #8852',
    content:
      'I grew up believing rest had to be earned through total exhaustion. Today I sat on the grass for fifteen minutes without checking my phone, and nothing collapsed.',
    seedType: 'sunflower',
    flowerVariant: 'daisy',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 57,
    messageCount: 0,
    positionX: 86,
    positionY: 79,
    scale: 0.83,
  },
  {
    storyId: 'seed_story_9913',
    anonymousId: 'Anonymous Soul #9913',
    content:
      'I never got the apology I waited years for, and for a long time that kept me tethered to the past. Today I am accepting that closure is something I can give myself.',
    seedType: 'lavender',
    flowerVariant: 'lavender',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 66,
    messageCount: 0,
    positionX: 94,
    positionY: 74,
    scale: 0.86,
  },
  {
    storyId: 'seed_story_1246',
    anonymousId: 'Anonymous Soul #1246',
    content:
      'I moved to a city where nobody knows my name and spent the first month eating cereal over the sink. Yesterday a neighbor smiled and held the elevator for me, and it almost made me cry.',
    seedType: 'daisy',
    flowerVariant: 'orange-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 51,
    messageCount: 0,
    positionX: 6,
    positionY: 28,
    scale: 1.24,
  },
  {
    storyId: 'seed_story_2385',
    anonymousId: 'Anonymous Soul #2385',
    content:
      'Living with chronic pain means grieving plans I made with an older version of my body. Still, there is a quiet courage in finding small joys on low-energy afternoons.',
    seedType: 'sunflower',
    flowerVariant: 'yellow-tulip',
    contentWarning: 'Chronic illness & fatigue',
    moderationStatus: 'approved',
    warmthCount: 63,
    messageCount: 0,
    positionX: 15,
    positionY: 16,
    scale: 1.3,
  },
  {
    storyId: 'seed_story_3492',
    anonymousId: 'Anonymous Soul #3492',
    content:
      'I hid my panic attacks in bathroom stalls for years because I thought needing help made me weak. Opening up to a therapist last month lifted half a mountain off my shoulders.',
    seedType: 'lavender',
    flowerVariant: 'pink-tulip',
    contentWarning: 'Anxiety & panic',
    moderationStatus: 'approved',
    warmthCount: 77,
    messageCount: 0,
    positionX: 28,
    positionY: 14,
    scale: 1.32,
  },
  {
    storyId: 'seed_story_4518',
    anonymousId: 'Anonymous Soul #4518',
    content:
      'When my parents divorced, I became the translator between two angry rooms. Now, whenever people raise their voices, I remind myself I am no longer responsible for fixing the storm.',
    seedType: 'daisy',
    flowerVariant: 'purple-wildflower',
    contentWarning: 'Family conflict',
    moderationStatus: 'approved',
    warmthCount: 41,
    messageCount: 0,
    positionX: 56,
    positionY: 18,
    scale: 1.28,
  },
  {
    storyId: 'seed_story_5624',
    anonymousId: 'Anonymous Soul #5624',
    content:
      'I lost my dog last autumn after fourteen years together. Every walk still feels a little crooked without the tug of a leash, yet I am grateful we walked so many miles side by side.',
    seedType: 'sunflower',
    flowerVariant: 'sunflower',
    contentWarning: 'Pet loss & grief',
    moderationStatus: 'approved',
    warmthCount: 84,
    messageCount: 0,
    positionX: 73,
    positionY: 13,
    scale: 1.31,
  },
  {
    storyId: 'seed_story_6739',
    anonymousId: 'Anonymous Soul #6739',
    content:
      'I spent a whole decade shrinking my opinions so nobody would argue with me. Speaking honestly—even when my voice trembles—is the bravest habit I am building.',
    seedType: 'lavender',
    flowerVariant: 'daisy',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 46,
    messageCount: 0,
    positionX: 87,
    positionY: 22,
    scale: 1.26,
  },
  {
    storyId: 'seed_story_7843',
    anonymousId: 'Anonymous Soul #7843',
    content:
      'Some holidays are harder than people admit. If you are spending this season quietly on your couch with tea and a blanket, you are still part of a warm world.',
    seedType: 'daisy',
    flowerVariant: 'lavender',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 59,
    messageCount: 0,
    positionX: 93,
    positionY: 36,
    scale: 1.18,
  },
  {
    storyId: 'seed_story_8951',
    anonymousId: 'Anonymous Soul #8951',
    content:
      'I stayed in a relationship long after the kindness left because I mistook familiarity for safety. Leaving was the loneliest Tuesday of my life, and also the beginning of my peace.',
    seedType: 'sunflower',
    flowerVariant: 'pink-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 72,
    messageCount: 0,
    positionX: 43,
    positionY: 54,
    scale: 1.04,
  },
  {
    storyId: 'seed_story_9127',
    anonymousId: 'Anonymous Soul #9127',
    content:
      'Nobody knows how much courage it took just to brush my teeth and open the curtains this morning. Little victories still count as victories.',
    seedType: 'lavender',
    flowerVariant: 'orange-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 88,
    messageCount: 0,
    positionX: 65,
    positionY: 52,
    scale: 1.06,
  },
  {
    storyId: 'seed_story_3054',
    anonymousId: 'Anonymous Soul #3054',
    content:
      'I used to compare my healing timeline to everyone around me until I realized flowers in the same field never bloom on the exact same week.',
    seedType: 'daisy',
    flowerVariant: 'yellow-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 65,
    messageCount: 0,
    positionX: 83,
    positionY: 56,
    scale: 1.01,
  },
  {
    storyId: 'seed_story_4168',
    anonymousId: 'Anonymous Soul #4168',
    content:
      'I forgave myself today for surviving messy chapters in messy ways. You cannot ask someone who was drowning to swim gracefully.',
    seedType: 'sunflower',
    flowerVariant: 'purple-wildflower',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 79,
    messageCount: 0,
    positionX: 11,
    positionY: 62,
    scale: 0.96,
  },
  {
    storyId: 'seed_story_5280',
    anonymousId: 'Anonymous Soul #5280',
    content:
      'Even on days when my thoughts feel heavy and loud, stepping outside to feel sunlight on my face reminds me that softness still exists in the world.',
    seedType: 'lavender',
    flowerVariant: 'sunflower',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 55,
    messageCount: 0,
    positionX: 95,
    positionY: 14,
    scale: 1.29,
  },
];

export const INITIAL_SUPPORTIVE_MESSAGES: Record<
  string,
  Omit<SupportiveMessage, 'createdAt'>[]
> = {
  seed_story_1048: [
    {
      messageId: 'msg_init_1',
      storyId: 'seed_story_1048',
      anonymousId: 'Kind Gardener #402',
      content: 'I see you now. You never had to carry all of that weight in silence.',
      moderationStatus: 'approved',
    },
    {
      messageId: 'msg_init_2',
      storyId: 'seed_story_1048',
      anonymousId: 'Kind Gardener #819',
      content: 'Thank you for letting your guard rest here. Wishing you gentle, unhurried days ahead.',
      moderationStatus: 'approved',
    },
  ],
  seed_story_2091: [
    {
      messageId: 'msg_init_3',
      storyId: 'seed_story_2091',
      anonymousId: 'Kind Gardener #315',
      content: 'What a tender gift she left for you. Every time you see a yellow bird, I hope you feel her warmth.',
      moderationStatus: 'approved',
    },
  ],
  seed_story_1592: [
    {
      messageId: 'msg_init_4',
      storyId: 'seed_story_1592',
      anonymousId: 'Kind Gardener #704',
      content: 'Staying kind after a hard year is one of the greatest achievements there is. Proud of you.',
      moderationStatus: 'approved',
    },
  ],
};

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

