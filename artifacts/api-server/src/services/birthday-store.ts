import {
  createHmac,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { ReplitConnectors } from "@replit/connectors-sdk";

export type Role = "ADMIN" | "USER";
export type UnlockType = "immediate" | "previous" | "scheduled" | "manual";

export type StoredUser = {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  displayName: string;
  role: Role;
  active: boolean;
  lastLogin: string | null;
};

export type Birthday = {
  id: string;
  title: string;
  subtitle: string;
  greeting: string;
  message: string;
  closing: string;
  buttonText: string;
  heroImage: string | null;
  active: boolean;
};

export type Clue = {
  id: string;
  order: number;
  title: string;
  intro: string;
  text: string;
  instructions: string;
  unlockType: UnlockType;
  unlockAt: string | null;
  requiresClueId: string | null;
  giftId: string | null;
  active: boolean;
};

export type StoredGiftImage = {
  id: string;
  giftId: string;
  driveFileId: string;
  filename: string;
  caption: string | null;
  label: string | null;
  displayOrder: number;
  isCover: boolean;
  createdAt: string;
  url: string;
};

export type StoredGiftComment = {
  id: string;
  giftId: string;
  userId: string;
  userName: string;
  userRole: Role;
  comment: string;
  hidden: boolean;
  createdAt: string;
};

export type StoredGift = {
  id: string;
  order: number;
  title: string;
  shortDescription: string | null;
  description: string;
  message: string;
  coverImageId: string | null;
  mediaUrl: string | null;
  videoFileId: string | null;
  audioFileId: string | null;
  requiredClueId: string | null;
  unlockAfterClueNumber: number | null;
  unlockAfterClueId: string | null;
  unlockType: "clue" | "scheduled" | "manual" | "immediate";
  unlockAt: string | null;
  allowComments: boolean;
  active: boolean;
  featured: boolean;
  buttonText: string | null;
  createdAt: string;
};

export type StoredMemoryImage = {
  id: string;
  memoryId: string;
  driveFileId: string;
  filename: string;
  caption: string | null;
  label: string | null;
  date: string | null;
  displayOrder: number;
  isCover: boolean;
  createdAt: string;
  url: string;
};

export type StoredMemoryComment = {
  id: string;
  memoryId: string;
  imageId: string | null;
  userId: string;
  userName: string;
  userRole: Role;
  comment: string;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StoredMemoryReaction = {
  id: string;
  memoryId: string;
  imageId: string | null;
  userId: string;
  reaction: string;
  createdAt: string;
};

export type StoredMemoryFavorite = {
  id: string;
  userId: string;
  memoryId: string;
  createdAt: string;
};

export type StoredMemory = {
  id: string;
  title: string;
  shortDescription: string | null;
  story: string;
  date: string;
  location: string | null;
  category: string | null;
  customLabel: string | null;
  caption: string | null;
  quote: string | null;
  adminNote: string | null;
  coverImageId: string | null;
  imageUrl: string | null;
  videoFileId: string | null;
  audioFileId: string | null;
  order: number;
  featured: boolean;
  active: boolean;
  allowComments: boolean;
  allowReactions: boolean;
  createdAt: string;
};

export type WishlistItem = {
  id: string;
  userId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  externalUrl: string | null;
  priority: number;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export type Activity = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  createdAt: string;
};

export type JourneyMilestoneType =
  | "birthday_card"
  | "clue"
  | "gift"
  | "memory"
  | "final_surprise";

export type StoredJourneyMilestone = {
  id: string;
  type: JourneyMilestoneType;
  referenceId: string | null;
  title: string;
  order: number;
  weight: number;
  active: boolean;
};

export function parseGoogleDriveLink(
  input: string,
  defaultType: "image" | "video" = "image",
) {
  if (!input || typeof input !== "string") {
    return { driveFileId: null, originalUrl: "", mediaType: "unsupported" as const };
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return { driveFileId: null, originalUrl: "", mediaType: "unsupported" as const };
  }
  let driveFileId: string | null = null;

  const fileDPattern = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const matchD = trimmed.match(fileDPattern);
  if (matchD && matchD[1]) {
    driveFileId = matchD[1];
  }

  if (!driveFileId) {
    const idPattern = /[?&]id=([a-zA-Z0-9_-]+)/;
    const matchId = trimmed.match(idPattern);
    if (matchId && matchId[1]) {
      driveFileId = matchId[1];
    }
  }

  if (!driveFileId) {
    const lh3Pattern = /\/d\/([a-zA-Z0-9_-]+)/;
    const matchLh3 = trimmed.match(lh3Pattern);
    if (matchLh3 && matchLh3[1]) {
      driveFileId = matchLh3[1];
    }
  }

  if (!driveFileId && /^[a-zA-Z0-9_-]{15,70}$/.test(trimmed)) {
    driveFileId = trimmed;
  }

  let mediaType: "image" | "video" | "unsupported" = "unsupported";
  if (driveFileId) {
    const lower = trimmed.toLowerCase();
    if (
      lower.includes("video") ||
      lower.endsWith(".mp4") ||
      lower.endsWith(".mov") ||
      lower.endsWith(".webm") ||
      defaultType === "video"
    ) {
      mediaType = "video";
    } else {
      mediaType = "image";
    }
  }

  return {
    driveFileId,
    originalUrl: trimmed,
    mediaType,
  };
}

export function getGoogleDriveDisplayUrl(
  driveFileId: string | null,
  mediaType: "image" | "video" = "image",
): string | null {
  if (!driveFileId) return null;
  if (driveFileId.startsWith("http://") || driveFileId.startsWith("https://")) {
    return driveFileId;
  }
  if (mediaType === "video") {
    return `https://drive.google.com/file/d/${driveFileId}/preview`;
  }
  return `https://lh3.googleusercontent.com/d/${driveFileId}=w1200`;
}

export type AppState = {
  users: StoredUser[];
  birthday: Birthday;
  clues: Clue[];
  gifts: StoredGift[];
  giftImages: StoredGiftImage[];
  giftComments: StoredGiftComment[];
  memories: StoredMemory[];
  memoryImages: StoredMemoryImage[];
  memoryComments: StoredMemoryComment[];
  memoryReactions: StoredMemoryReaction[];
  memoryFavorites: StoredMemoryFavorite[];
  wishlist: WishlistItem[];
  chat: ChatMessage[];
  activity: Activity[];
  journeyMilestones: StoredJourneyMilestone[];
  journeyProgress: Record<string, { milestoneId: string; completedAt: string }[]>;
  clueProgress: Record<string, { clueId: string; completedAt: string }[]>;
  giftProgress: Record<
    string,
    { giftId: string; unlockedAt: string; viewedAt: string | null }[]
  >;
};

const spreadsheetId =
  process.env.GOOGLE_SPREADSHEET_ID ?? "1FLYHn_uczW0-wb6ecFC2ySCCtLvOxxArEIXdajU07LI";
const requiredSheets = [
  "Users",
  "Birthday",
  "Clues",
  "Gifts",
  "GiftImages",
  "GiftComments",
  "ClueProgress",
  "GiftProgress",
  "Memories",
  "MemoryImages",
  "MemoryComments",
  "MemoryReactions",
  "MemoryFavorites",
  "Wishlist",
  "Chat",
  "Notifications",
  "ActivityLogs",
  "Settings",
];
const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "development-only-session-secret";

let statePromise: Promise<AppState> | null = null;
let writeQueue = Promise.resolve();

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function makeUser(
  id: string,
  username: string,
  password: string,
  displayName: string,
  role: Role,
): StoredUser {
  const salt = randomUUID();
  return {
    id,
    username,
    passwordHash: hashPassword(password, salt),
    salt,
    displayName,
    role,
    active: true,
    lastLogin: null,
  };
}

function seedState(): AppState {
  const mem1Id = "memory-1";
  const mem2Id = "memory-2";
  const gift1Id = "gift-1";
  const gift2Id = "gift-2";

  return {
    users: [
      makeUser("kunju", "Kunju", "Kunju@12", "Kunju", "ADMIN"),
      makeUser("kochu", "Kochu", "Kochu@12", "Kochu", "USER"),
    ],
    birthday: {
      id: "birthday-1",
      title: "Happy Birthday, Kochu",
      subtitle: "I made a little world for you.",
      greeting: "For the girl who makes ordinary days feel like a story",
      message:
        "Tonight is not just about a birthday. It is a small path I made for you — one little chapter at a time, with a few secrets waiting along the way.",
      closing: "There is more waiting for you...",
      buttonText: "NEXT",
      heroImage: null,
      active: true,
    },
    clues: [
      {
        id: "clue-1",
        order: 1,
        title: "The beginning",
        intro: "Every story has a first page.",
        text: "[INSERT YOUR FIRST CLUE HERE]",
        instructions: "Follow the little hint, then come back and tell me you did it.",
        unlockType: "immediate",
        unlockAt: null,
        requiresClueId: null,
        giftId: gift1Id,
        active: true,
      },
      {
        id: "clue-2",
        order: 2,
        title: "A familiar place",
        intro: "The next little secret is somewhere connected to us.",
        text: "[INSERT YOUR SECOND CLUE HERE]",
        instructions: "Look closely. The best clues are usually hiding in plain sight.",
        unlockType: "previous",
        unlockAt: null,
        requiresClueId: "clue-1",
        giftId: gift2Id,
        active: true,
      },
      {
        id: "clue-3",
        order: 3,
        title: "Tomorrow's chapter",
        intro: "Some surprises are worth waiting for.",
        text: "[INSERT YOUR SCHEDULED CLUE HERE]",
        instructions: "This chapter opens when the countdown reaches zero.",
        unlockType: "scheduled",
        unlockAt: "2026-09-30T13:30:00.000Z",
        requiresClueId: "clue-2",
        giftId: "gift-3",
        active: true,
      },
    ],
    gifts: [
      {
        id: gift1Id,
        order: 1,
        title: "A Little Something ❤️",
        shortDescription: "I wanted you to have this memory.",
        description: "Your first surprise is ready to be opened.",
        message: "I still remember how happy we were on this day. Every little detail of your smile lives here.",
        coverImageId: "gift-img-1",
        mediaUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1000&auto=format&fit=crop",
        videoFileId: null,
        audioFileId: null,
        requiredClueId: "clue-1",
        unlockAfterClueNumber: 1,
        unlockAfterClueId: "clue-1",
        unlockType: "clue",
        unlockAt: null,
        allowComments: true,
        active: true,
        featured: true,
        buttonText: "KEEP THIS MEMORY ❤️",
        createdAt: new Date().toISOString(),
      },
      {
        id: gift2Id,
        order: 2,
        title: "The Next Little Surprise ✨",
        shortDescription: "You found another piece of the story.",
        description: "A small treasure wrapped in quiet joy.",
        message: "Some moments stay warm long after they are over. This one is forever yours.",
        coverImageId: "gift-img-2",
        mediaUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1000&auto=format&fit=crop",
        videoFileId: null,
        audioFileId: null,
        requiredClueId: "clue-2",
        unlockAfterClueNumber: 2,
        unlockAfterClueId: "clue-2",
        unlockType: "clue",
        unlockAt: null,
        allowComments: true,
        active: true,
        featured: false,
        buttonText: "KEEP THIS MEMORY ❤️",
        createdAt: new Date().toISOString(),
      },
      {
        id: "gift-3",
        order: 3,
        title: "One More Thing",
        shortDescription: "A future surprise waiting for you.",
        description: "A future surprise, waiting for the right moment.",
        message: "[YOUR THIRD GIFT MESSAGE]",
        coverImageId: null,
        mediaUrl: null,
        videoFileId: null,
        audioFileId: null,
        requiredClueId: "clue-3",
        unlockAfterClueNumber: 3,
        unlockAfterClueId: "clue-3",
        unlockType: "clue",
        unlockAt: null,
        allowComments: true,
        active: true,
        featured: false,
        buttonText: "OPEN MY GIFT ❤️",
        createdAt: new Date().toISOString(),
      },
    ],
    giftImages: [
      {
        id: "gift-img-1",
        giftId: gift1Id,
        driveFileId: "drive-gift-1",
        filename: "gift-cover.jpg",
        caption: "Before the surprise",
        label: "The moment",
        displayOrder: 1,
        isCover: true,
        createdAt: new Date().toISOString(),
        url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1000&auto=format&fit=crop",
      },
      {
        id: "gift-img-2",
        giftId: gift2Id,
        driveFileId: "drive-gift-2",
        filename: "gift-cover-2.jpg",
        caption: "I wish you could have seen my face while preparing this.",
        label: "Surprise",
        displayOrder: 1,
        isCover: true,
        createdAt: new Date().toISOString(),
        url: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1000&auto=format&fit=crop",
      },
    ],
    giftComments: [
      {
        id: "gcomm-1",
        giftId: gift1Id,
        userId: "kochu",
        userName: "Kochu",
        userRole: "USER",
        comment: "This brought the biggest smile to my face! ❤️",
        hidden: false,
        createdAt: new Date().toISOString(),
      },
    ],
    memories: [
      {
        id: mem1Id,
        title: "Our Hyderabad Trip ❤️",
        shortDescription: "Our first big getaway together.",
        story: "I still remember how happy we were that day. Walking under the warm sun, exploring every corner, and laughing until our cheeks hurt.",
        date: "2024-11-15",
        location: "Hyderabad",
        category: "Trips",
        customLabel: "Best view",
        caption: "I could look at this picture forever.",
        quote: "Some days feel like poetry written just for us.",
        adminNote: "Kochu's favorite photo from the fort.",
        coverImageId: "img-1-1",
        imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1000&auto=format&fit=crop",
        videoFileId: null,
        audioFileId: null,
        order: 1,
        featured: true,
        active: true,
        allowComments: true,
        allowReactions: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: mem2Id,
        title: "Coffee & Rain Whispers ☕",
        shortDescription: "A quiet rainy afternoon with warm cups and sweet talks.",
        story: "The rain wouldn't stop, so we stayed in that tiny café by the window for hours. Time stopped moving for a little while.",
        date: "2025-02-14",
        location: "Café Moonlight",
        category: "Favorites",
        customLabel: "That smile ❤️",
        caption: "Your laugh makes every ordinary corner glow.",
        quote: "Happiness is sitting next to you with rain falling outside.",
        adminNote: null,
        coverImageId: "img-2-1",
        imageUrl: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=1000&auto=format&fit=crop",
        videoFileId: null,
        audioFileId: null,
        order: 2,
        featured: true,
        active: true,
        allowComments: true,
        allowReactions: true,
        createdAt: new Date().toISOString(),
      },
    ],
    memoryImages: [
      {
        id: "img-1-1",
        memoryId: mem1Id,
        driveFileId: "drive-file-1",
        filename: "hyderabad-cover.jpg",
        caption: "I still remember how happy we were that day.",
        label: "Hyderabad",
        date: "2024-11-15",
        displayOrder: 1,
        isCover: true,
        createdAt: new Date().toISOString(),
        url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1000&auto=format&fit=crop",
      },
      {
        id: "img-1-2",
        memoryId: mem1Id,
        driveFileId: "drive-file-2",
        filename: "hyderabad-sunset.jpg",
        caption: "The golden light on your hair.",
        label: "Golden hour",
        date: "2024-11-15",
        displayOrder: 2,
        isCover: false,
        createdAt: new Date().toISOString(),
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop",
      },
      {
        id: "img-2-1",
        memoryId: mem2Id,
        driveFileId: "drive-file-3",
        filename: "rainy-day.jpg",
        caption: "The rain outside, warm coffee inside.",
        label: "Warmth",
        date: "2025-02-14",
        displayOrder: 1,
        isCover: true,
        createdAt: new Date().toISOString(),
        url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=1000&auto=format&fit=crop",
      },
    ],
    memoryComments: [
      {
        id: "mcomm-1",
        memoryId: mem1Id,
        imageId: "img-1-1",
        userId: "kochu",
        userName: "Kochu",
        userRole: "USER",
        comment: "I remember this day so clearly ❤️",
        hidden: false,
        createdAt: new Date(Date.now() - 120000).toISOString(),
        updatedAt: new Date(Date.now() - 120000).toISOString(),
      },
      {
        id: "mcomm-2",
        memoryId: mem1Id,
        imageId: "img-1-1",
        userId: "kunju",
        userName: "Kunju",
        userRole: "ADMIN",
        comment: "Me too. One of my favorite photos ever.",
        hidden: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    memoryReactions: [
      {
        id: "mreact-1",
        memoryId: mem1Id,
        imageId: null,
        userId: "kochu",
        reaction: "❤️",
        createdAt: new Date().toISOString(),
      },
    ],
    memoryFavorites: [
      {
        id: "mfav-1",
        userId: "kochu",
        memoryId: mem1Id,
        createdAt: new Date().toISOString(),
      },
    ],
    wishlist: [],
    chat: [
      {
        id: "chat-1",
        senderId: "kunju",
        message: "Did you find the first clue? I am not giving hints that easily.",
        createdAt: new Date().toISOString(),
        read: false,
      },
    ],
    activity: [
      {
        id: "activity-1",
        actor: "System",
        action: "Journey prepared",
        detail: "The birthday world is ready for its first visitor.",
        createdAt: new Date().toISOString(),
      },
    ],
    journeyMilestones: [
      { id: "ms-1", type: "birthday_card", referenceId: "birthday-1", title: "Birthday Card Begins 🎂", order: 1, weight: 1, active: true },
      { id: "ms-2", type: "clue", referenceId: "clue-1", title: "Clue #1: The Beginning 🧩", order: 2, weight: 1, active: true },
      { id: "ms-3", type: "gift", referenceId: gift1Id, title: "Surprise #1 🎁", order: 3, weight: 1, active: true },
      { id: "ms-4", type: "clue", referenceId: "clue-2", title: "Clue #2: A Familiar Place 🧩", order: 4, weight: 1, active: true },
      { id: "ms-5", type: "memory", referenceId: mem1Id, title: "Memory: Our Hyderabad Trip 📸", order: 5, weight: 1, active: true },
      { id: "ms-6", type: "clue", referenceId: "clue-3", title: "Clue #3: Tomorrow's Chapter 🧩", order: 6, weight: 1, active: true },
      { id: "ms-7", type: "gift", referenceId: gift2Id, title: "Surprise #2 🎁", order: 7, weight: 1, active: true },
      { id: "ms-8", type: "final_surprise", referenceId: null, title: "Final Birthday Surprise ✨", order: 8, weight: 2, active: true },
    ],
    journeyProgress: { kochu: [{ milestoneId: "ms-1", completedAt: new Date().toISOString() }] },
    clueProgress: { kochu: [] },
    giftProgress: { kochu: [] },
  };
}

export function getJourneySummary(state: AppState, userId: string) {
  state.journeyMilestones ??= seedState().journeyMilestones;
  state.journeyProgress ??= seedState().journeyProgress;

  const userProgress = state.journeyProgress[userId] || [];
  const activeMilestones = state.journeyMilestones
    .filter((m) => m.active)
    .sort((a, b) => a.order - b.order);

  let completedCount = 0;
  let completedWeight = 0;
  let totalWeight = 0;

  const milestones = activeMilestones.map((m) => {
    let completed = false;
    let completedAt: string | null = null;

    const prog = userProgress.find((p) => p.milestoneId === m.id);
    if (prog) {
      completed = true;
      completedAt = prog.completedAt;
    } else if (m.type === "clue" && m.referenceId) {
      completed = isClueCompleted(state, userId, m.referenceId);
      if (completed) {
        const clueProg = state.clueProgress[userId]?.find((cp) => cp.clueId === m.referenceId);
        completedAt = clueProg?.completedAt || new Date().toISOString();
      }
    } else if (m.type === "gift" && m.referenceId) {
      const giftProg = getGiftProgress(state, userId, m.referenceId);
      completed = Boolean(giftProg);
      completedAt = giftProg?.unlockedAt || null;
    } else if (m.type === "memory" && m.referenceId) {
      const favorite = (state.memoryFavorites || []).some((f) => f.memoryId === m.referenceId && f.userId === userId);
      const commented = (state.memoryComments || []).some((c) => c.memoryId === m.referenceId && c.userId === userId);
      if (favorite || commented) {
        completed = true;
        completedAt = new Date().toISOString();
      }
    }

    totalWeight += m.weight;
    if (completed) {
      completedCount++;
      completedWeight += m.weight;
    }

    return {
      ...m,
      status: completed ? ("COMPLETED" as const) : ("LOCKED" as const),
      completedAt,
    };
  });

  const totalCount = activeMilestones.length;
  const percent = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  const upcomingMilestone = milestones.find((m) => m.status !== "COMPLETED") || null;

  return {
    completedCount,
    totalCount,
    percent,
    completedWeight,
    totalWeight,
    milestones,
    upcomingMilestone,
    remainingCount: totalCount - completedCount,
  };
}

type SheetsRequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

async function sheetsRequest(path: string, init?: SheetsRequestInit): Promise<any> {
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy("google-sheet", path, init);
  if (!response.ok) {
    throw new Error(`Google Sheets request failed with ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

async function ensureSheets(): Promise<void> {
  try {
    const metadata = await sheetsRequest(
      `/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    );
    const existing = new Set<string>(
      (metadata.sheets ?? []).map((sheet: any) => sheet.properties.title),
    );
    const missing = requiredSheets.filter((title) => !existing.has(title));
    if (missing.length > 0) {
      await sheetsRequest(`/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requests: missing.map((title) => ({
            addSheet: { properties: { title } },
          })),
        }),
      });
    }
  } catch (err) {
    console.warn("Google Sheets connection bypassed or offline:", err);
  }
}

async function readState(): Promise<AppState | null> {
  try {
    const result = await sheetsRequest(
      `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("Settings!A:B")}`,
    );
    const row = (result.values ?? []).find(
      (values: string[]) => values[0] === "appState",
    );
    if (!row?.[1]) return null;
    return JSON.parse(row[1]) as AppState;
  } catch {
    return null;
  }
}

async function writeState(state: AppState): Promise<void> {
  try {
    await sheetsRequest(
      `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("Settings!A:B")}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          range: "Settings!A:B",
          majorDimension: "ROWS",
          values: [["key", "value"], ["appState", JSON.stringify(state)]],
        }),
      },
    );
  } catch (err) {
    console.warn("Could not write state to Google Sheets:", err);
  }
}

export async function getState(): Promise<AppState> {
  if (!statePromise) {
    statePromise = (async () => {
      await ensureSheets();
      const stored = await readState();
      const state = stored ?? seedState();
      // Ensure missing nested arrays exist if upgraded from older state schema
      state.giftImages ??= seedState().giftImages;
      state.giftComments ??= seedState().giftComments;
      state.memoryImages ??= seedState().memoryImages;
      state.memoryComments ??= seedState().memoryComments;
      state.memoryReactions ??= seedState().memoryReactions;
      state.memoryFavorites ??= seedState().memoryFavorites;
      if (!stored) await writeState(state);
      return state;
    })();
  }
  return statePromise;
}

export async function persistState(state: AppState): Promise<void> {
  writeQueue = writeQueue.then(() => writeState(state));
  await writeQueue;
}

export function verifyPassword(user: StoredUser, password: string): boolean {
  const provided = Buffer.from(hashPassword(password, user.salt), "hex");
  const stored = Buffer.from(user.passwordHash, "hex");
  return provided.length === stored.length && timingSafeEqual(provided, stored);
}

export function createSession(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      issuedAt: Date.now(),
    }),
  ).toString("base64url");

  const signature = createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function getUserIdForSession(token: string | undefined): string | null {
  if (!token) return null;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expectedSignature = createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );

    return typeof decoded.userId === "string" ? decoded.userId : null;
  } catch {
    return null;
  }
}

export function deleteSession(_token: string | undefined): void {
  // Sessions are stateless. Logout is handled by clearing the cookie.
}

export function addActivity(
  state: AppState,
  actor: string,
  action: string,
  detail: string,
): void {
  state.activity.unshift({
    id: randomUUID(),
    actor,
    action,
    detail,
    createdAt: new Date().toISOString(),
  });
  state.activity = state.activity.slice(0, 50);
}

export function isClueCompleted(
  state: AppState,
  userId: string,
  clueId: string,
): boolean {
  return state.clueProgress[userId]?.some((item) => item.clueId === clueId) ?? false;
}

export function isClueAvailable(state: AppState, userId: string, clue: Clue): boolean {
  if (!clue.active || isClueCompleted(state, userId, clue.id)) return false;
  if (clue.unlockAt && Date.now() < Date.parse(clue.unlockAt)) return false;
  if (clue.requiresClueId && !isClueCompleted(state, userId, clue.requiresClueId)) {
    return false;
  }
  return clue.unlockType !== "manual";
}

export function getGiftProgress(
  state: AppState,
  userId: string,
  giftId: string,
): { giftId: string; unlockedAt: string; viewedAt: string | null } | null {
  return state.giftProgress[userId]?.find((item) => item.giftId === giftId) ?? null;
}

export function buildMemoryObject(
  state: AppState,
  userId: string,
  memory: StoredMemory,
) {
  const images = (state.memoryImages || [])
    .filter((img) => img.memoryId === memory.id)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((img) => ({
      ...img,
      url: getGoogleDriveDisplayUrl(img.driveFileId, "image") || img.url,
    }));
  const coverImg = images.find((i) => i.isCover || i.id === memory.coverImageId) || images[0];
  const comments = (state.memoryComments || [])
    .filter((c) => c.memoryId === memory.id && (userId === "kunju" || !c.hidden))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const reactions = (state.memoryReactions || []).filter((r) => r.memoryId === memory.id);
  const reactionCounts: Record<string, number> = {};
  reactions.forEach((r) => {
    reactionCounts[r.reaction] = (reactionCounts[r.reaction] || 0) + 1;
  });
  const userReaction = reactions.find((r) => r.userId === userId)?.reaction || null;
  const isFavorite = (state.memoryFavorites || []).some(
    (f) => f.memoryId === memory.id && f.userId === userId,
  );

  return {
    ...memory,
    imageUrl: coverImg?.url || (memory.imageUrl ? getGoogleDriveDisplayUrl(memory.imageUrl, "image") : null),
    coverImageId: coverImg?.id || memory.coverImageId || null,
    images,
    comments,
    reactionCounts,
    userReaction,
    isFavorite,
    commentCount: comments.length,
  };
}

export function buildGiftObject(
  state: AppState,
  userId: string,
  gift: StoredGift,
) {
  const progress = getGiftProgress(state, userId, gift.id);
  const scheduledLocked = gift.unlockAt && Date.now() < Date.parse(gift.unlockAt);
  const status: "LOCKED" | "SCHEDULED" | "UNLOCKED" = progress
    ? "UNLOCKED"
    : scheduledLocked
    ? "SCHEDULED"
    : "LOCKED";
  const images = (state.giftImages || [])
    .filter((img) => img.giftId === gift.id)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((img) => ({
      ...img,
      url: getGoogleDriveDisplayUrl(img.driveFileId, "image") || img.url,
    }));
  const coverImg = images.find((i) => i.isCover || i.id === gift.coverImageId) || images[0];
  const comments = (state.giftComments || [])
    .filter((c) => c.giftId === gift.id && (userId === "kunju" || !c.hidden))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return {
    ...gift,
    unlockAfterClueNumber: gift.unlockAfterClueNumber ?? null,
    unlockAfterClueId: gift.unlockAfterClueId ?? gift.requiredClueId ?? null,
    mediaUrl: coverImg?.url || (gift.mediaUrl ? getGoogleDriveDisplayUrl(gift.mediaUrl, "image") : null),
    coverImageId: coverImg?.id || gift.coverImageId || null,
    status,
    viewedAt: progress?.viewedAt || null,
    images,
    comments,
    commentCount: comments.length,
  };
}

export function publicUser(user: StoredUser) {
  return { id: user.id, displayName: user.displayName, role: user.role };
}
