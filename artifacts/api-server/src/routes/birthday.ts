import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  AddGiftCommentBody,
  AddGiftCommentParams,
  AddMemoryCommentBody,
  AddMemoryCommentParams,
  AdminDeleteGiftCommentParams,
  AdminDeleteMemoryCommentParams,
  CompleteClueBody,
  CreateClueBody,
  CreateGiftBody,
  CreateMemoryBody,
  CreateWishlistItemBody,
  DeleteClueParams,
  DeleteGiftCommentParams,
  DeleteGiftParams,
  DeleteMemoryCommentParams,
  DeleteMemoryParams,
  DeleteWishlistItemParams,
  DuplicateMemoryParams,
  GetClueParams,
  GetGiftParams,
  GetMemoryParams,
  ListMemoriesQueryParams,
  LoginBody,
  ReorderMemoriesBody,
  SendChatMessageBody,
  ToggleMemoryFavoriteParams,
  ToggleMemoryReactionBody,
  ToggleMemoryReactionParams,
  UpdateBirthdayBody,
  UpdateClueBody,
  UpdateClueParams,
  UpdateGiftBody,
  UpdateGiftCommentStatusBody,
  UpdateGiftCommentStatusParams,
  UpdateGiftParams,
  UpdateMemoryBody,
  UpdateMemoryCommentBody,
  UpdateMemoryCommentParams,
  UpdateMemoryCommentStatusBody,
  UpdateMemoryCommentStatusParams,
  UpdateMemoryParams,
  UpdateWishlistItemBody,
  UpdateWishlistItemParams,
  UploadMediaBody,
  ViewGiftParams,
} from "@workspace/api-zod";
import {
  addActivity,
  buildGiftObject,
  buildMemoryObject,
  createSession,
  deleteSession,
  getGiftProgress,
  getJourneySummary,
  getState,
  getUserIdForSession,
  isClueAvailable,
  isClueCompleted,
  parseGoogleDriveLink,
  persistState,
  publicUser,
  verifyPassword,
  type Clue,
  type StoredGift,
  type StoredGiftComment,
  type StoredGiftImage,
  type StoredMemory,
  type StoredMemoryComment,
  type StoredMemoryImage,
  type StoredMemoryReaction,
} from "../services/birthday-store";
import {
  requireBirthdayRole,
  requireBirthdayUser,
  safeUser,
} from "../middlewares/birthday-auth";

const router: IRouter = Router();
const USER_ID = "kochu";

function clueStatus(
  state: Awaited<ReturnType<typeof getState>>,
  userId: string,
  clue: Clue,
) {
  const completed = state.clueProgress[userId]?.find((item) => item.clueId === clue.id);
  if (completed) return { status: "COMPLETED" as const, completedAt: completed.completedAt };
  if (!clue.active) return { status: "LOCKED" as const, completedAt: null };
  if (clue.unlockAt && Date.now() < Date.parse(clue.unlockAt)) {
    return { status: "SCHEDULED" as const, completedAt: null };
  }
  if (clue.requiresClueId && !isClueCompleted(state, userId, clue.requiresClueId)) {
    return { status: "LOCKED" as const, completedAt: null };
  }
  if (clue.unlockType === "manual") return { status: "LOCKED" as const, completedAt: null };
  return { status: "AVAILABLE" as const, completedAt: null };
}

function toClue(
  state: Awaited<ReturnType<typeof getState>>,
  userId: string,
  clue: Clue,
) {
  const status = clueStatus(state, userId, clue);
  return { ...clue, status: status.status, completedAt: status.completedAt };
}

/* ========================================================================== */
/* AUTH ROUTES                                                                */
/* ========================================================================== */

router.post("/auth/login", async (req, res, next) => {
  try {
    const input = LoginBody.parse(req.body);
    const state = await getState();
    const user = state.users.find(
      (candidate) =>
        candidate.username.toLowerCase() === input.username.toLowerCase() &&
        candidate.active,
    );
    if (!user || !verifyPassword(user, input.password)) {
      res.status(401).json({ error: "Username or password is incorrect." });
      return;
    }
    user.lastLogin = new Date().toISOString();
    addActivity(
      state,
      user.displayName,
      "Logged in",
      `${user.displayName} entered the birthday world.`,
    );
    await persistState(state);
    const token = createSession(user.id);
    res.cookie("kochusession", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: input.rememberMe === false ? undefined : 1000 * 60 * 60 * 24 * 30,
    });
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

router.post("/auth/logout", async (req, res, next) => {
  try {
    deleteSession(req.cookies?.kochusession);
    res.clearCookie("kochusession");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/auth/me", requireBirthdayUser, (req, res) => {
  res.json(safeUser(req));
});

/* ========================================================================== */
/* MEDIA UPLOAD                                                               */
/* ========================================================================== */

router.post("/media/upload", requireBirthdayUser, async (req, res, next) => {
  try {
    const input = UploadMediaBody.parse(req.body);
    const filename = input.filename.toLowerCase();
    const validExts = [".png", ".jpg", ".jpeg", ".webp"];
    const isValid =
      validExts.some((ext) => filename.endsWith(ext)) ||
      (input.contentType && input.contentType.startsWith("image/"));

    if (!isValid) {
      res.status(400).json({
        error: "Image upload failed. Invalid file type. Only PNG, JPG, JPEG, and WEBP supported.",
      });
      return;
    }

    if (input.data.length > 20 * 1024 * 1024) {
      res.status(400).json({
        error: "Image upload failed. File size too large. Maximum size is 10MB.",
      });
      return;
    }

    const driveFileId = "drive-" + randomUUID();
    const mediaObj = {
      driveFileId,
      url: input.data,
      filename: input.filename,
    };

    const state = await getState();
    addActivity(
      state,
      req.birthdayUser!.displayName,
      "Uploaded image",
      `Saved ${input.filename} to Google Drive storage`,
    );
    await persistState(state);

    res.status(201).json(mediaObj);
  } catch (error) {
    res.status(400).json({ error: "Image upload failed. Nothing was changed." });
  }
});

/* ========================================================================== */
/* EXPERIENCE HOME & BIRTHDAY                                                 */
/* ========================================================================== */

router.get("/experience/home", requireBirthdayUser, async (req, res, next) => {
  try {
    const state = await getState();
    const userId = req.birthdayUser!.id;
    const activeClues = state.clues.filter((clue) => clue.active);
    const completed = activeClues.filter((clue) =>
      isClueCompleted(state, userId, clue.id),
    );
    const nextClue =
      activeClues
        .sort((a, b) => a.order - b.order)
        .map((clue) => toClue(state, userId, clue))
        .find((clue) => clue.status !== "COMPLETED") ?? null;
    const recentGifts = state.gifts
      .map((gift) => buildGiftObject(state, userId, gift))
      .filter((gift) => gift.status === "UNLOCKED")
      .slice(0, 3);
    res.json({
      user: publicUser(req.birthdayUser!),
      progress: {
        completed: completed.length,
        total: activeClues.length,
        percent: activeClues.length
          ? Math.round((completed.length / activeClues.length) * 100)
          : 0,
      },
      nextClue,
      recentGifts,
      upcomingMessage: nextClue?.unlockAt
        ? `Your next chapter opens ${new Date(nextClue.unlockAt).toLocaleString(
            "en-IN",
            { timeZone: "Asia/Kolkata" },
          )}.`
        : nextClue
        ? "Your next little chapter is ready."
        : "Every clue is complete. There is one last thing waiting.",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/experience/journey", requireBirthdayUser, async (req, res, next) => {
  try {
    const state = await getState();
    const summary = getJourneySummary(state, req.birthdayUser!.id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/experience/journey/milestones/:id/complete",
  requireBirthdayUser,
  async (req, res, next) => {
    try {
      const milestoneId = String(req.params.id);
      const state = await getState();
      const userId = req.birthdayUser!.id;
      state.journeyProgress ??= {};
      state.journeyProgress[userId] ??= [];
      if (!state.journeyProgress[userId].some((p) => p.milestoneId === milestoneId)) {
        state.journeyProgress[userId].push({
          milestoneId,
          completedAt: new Date().toISOString(),
        });
        await persistState(state);
      }
      res.json(getJourneySummary(state, userId));
    } catch (error) {
      next(error);
    }
  },
);

router.get("/birthday", requireBirthdayUser, async (_req, res, next) => {
  try {
    const state = await getState();
    res.json(state.birthday);
  } catch (error) {
    next(error);
  }
});

/* ========================================================================== */
/* CLUES ROUTES                                                               */
/* ========================================================================== */

router.get("/clues", requireBirthdayUser, async (req, res, next) => {
  try {
    const state = await getState();
    res.json(
      state.clues
        .sort((a, b) => a.order - b.order)
        .map((clue) => toClue(state, req.birthdayUser!.id, clue)),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/clues/:id", requireBirthdayUser, async (req, res, next) => {
  try {
    const params = GetClueParams.parse(req.params);
    const state = await getState();
    const clue = state.clues.find((item) => item.id === params.id);
    if (!clue) {
      res.status(404).json({ error: "Clue not found" });
      return;
    }
    res.json(toClue(state, req.birthdayUser!.id, clue));
  } catch (error) {
    next(error);
  }
});

router.post("/clues/:id/complete", requireBirthdayUser, async (req, res, next) => {
  try {
    const params = GetClueParams.parse(req.params);
    CompleteClueBody.parse(req.body ?? {});
    const state = await getState();
    const userId = req.birthdayUser!.id;
    const clue = state.clues.find((item) => item.id === params.id);
    if (!clue) {
      res.status(404).json({ error: "Clue not found" });
      return;
    }
    if (!isClueAvailable(state, userId, clue)) {
      res.status(400).json({ error: "This clue is not ready to be completed." });
      return;
    }
    const completedAt = new Date().toISOString();
    state.clueProgress[userId] ??= [];
    if (!state.clueProgress[userId].some((item) => item.clueId === clue.id)) {
      state.clueProgress[userId].push({ clueId: clue.id, completedAt });
    }

    state.giftProgress[userId] ??= [];
    const matchingGifts = state.gifts.filter(
      (item) =>
        item.active &&
        (item.requiredClueId === clue.id ||
          item.unlockAfterClueId === clue.id ||
          item.unlockAfterClueNumber === clue.order ||
          clue.giftId === item.id),
    );

    let firstUnlockedGift: any = null;
    matchingGifts.forEach((linkedGift) => {
      if (!getGiftProgress(state, userId, linkedGift.id)) {
        state.giftProgress[userId].push({
          giftId: linkedGift.id,
          unlockedAt: completedAt,
          viewedAt: null,
        });
        addActivity(
          state,
          req.birthdayUser!.displayName,
          "Gift Unlocked",
          `Unlocked gift '${linkedGift.title}' after completing Clue #${clue.order}`,
        );
      }
      if (!firstUnlockedGift) {
        firstUnlockedGift = buildGiftObject(state, userId, linkedGift);
      }
    });

    addActivity(state, req.birthdayUser!.displayName, "Completed clue", clue.title);
    await persistState(state);
    const required = state.clues.filter((item) => item.active);
    res.json({
      clue: toClue(state, userId, clue),
      gift: firstUnlockedGift,
      allComplete: required.every((item) => isClueCompleted(state, userId, item.id)),
    });
  } catch (error) {
    next(error);
  }
});

/* ========================================================================== */
/* GIFTS ROUTES                                                               */
/* ========================================================================== */

router.get("/gifts", requireBirthdayUser, async (req, res, next) => {
  try {
    const state = await getState();
    res.json(
      state.gifts
        .sort((a, b) => a.order - b.order)
        .map((gift) => buildGiftObject(state, req.birthdayUser!.id, gift)),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/gifts/:id", requireBirthdayUser, async (req, res, next) => {
  try {
    const params = GetGiftParams.parse(req.params);
    const state = await getState();
    const gift = state.gifts.find((item) => item.id === params.id);
    if (!gift) {
      res.status(404).json({ error: "Gift not found" });
      return;
    }
    res.json(buildGiftObject(state, req.birthdayUser!.id, gift));
  } catch (error) {
    next(error);
  }
});

router.post("/gifts/:id/view", requireBirthdayUser, async (req, res, next) => {
  try {
    const params = ViewGiftParams.parse(req.params);
    const state = await getState();
    const gift = state.gifts.find((item) => item.id === params.id);
    if (!gift) {
      res.status(404).json({ error: "Gift not found" });
      return;
    }
    const progress = getGiftProgress(state, req.birthdayUser!.id, gift.id);
    if (!progress) {
      res.status(403).json({ error: "Gift is still locked." });
      return;
    }
    progress.viewedAt ??= new Date().toISOString();
    addActivity(state, req.birthdayUser!.displayName, "Viewed gift", gift.title);
    await persistState(state);
    res.json(buildGiftObject(state, req.birthdayUser!.id, gift));
  } catch (error) {
    next(error);
  }
});

router.post("/gifts/:id/comments", requireBirthdayUser, async (req, res, next) => {
  try {
    const params = AddGiftCommentParams.parse(req.params);
    const input = AddGiftCommentBody.parse(req.body);
    const state = await getState();
    const gift = state.gifts.find((g) => g.id === params.id);
    if (!gift || !gift.allowComments) {
      res.status(400).json({ error: "Comments disabled for this gift." });
      return;
    }
    const commentObj: StoredGiftComment = {
      id: randomUUID(),
      giftId: gift.id,
      userId: req.birthdayUser!.id,
      userName: req.birthdayUser!.displayName,
      userRole: req.birthdayUser!.role,
      comment: input.comment,
      hidden: false,
      createdAt: new Date().toISOString(),
    };
    state.giftComments ??= [];
    state.giftComments.push(commentObj);
    addActivity(state, req.birthdayUser!.displayName, "Commented on gift", gift.title);
    await persistState(state);
    res.status(201).json(commentObj);
  } catch (error) {
    next(error);
  }
});

router.delete(
  "/gifts/comments/:commentId",
  requireBirthdayUser,
  async (req, res, next) => {
    try {
      const params = DeleteGiftCommentParams.parse(req.params);
      const state = await getState();
      const commentIndex = (state.giftComments || []).findIndex(
        (c) => c.id === params.commentId && c.userId === req.birthdayUser!.id,
      );
      if (commentIndex === -1) {
        res.status(404).json({ error: "Comment not found or access denied." });
        return;
      }
      state.giftComments.splice(commentIndex, 1);
      await persistState(state);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

/* ========================================================================== */
/* MEMORIES USER ROUTES                                                       */
/* ========================================================================== */

router.get("/memories", requireBirthdayUser, async (req, res, next) => {
  try {
    const query = ListMemoriesQueryParams.parse(req.query);
    const state = await getState();
    const userId = req.birthdayUser!.id;
    let list = state.memories
      .filter((m) => (req.birthdayUser!.role === "ADMIN" ? true : m.active))
      .map((m) => buildMemoryObject(state, userId, m));

    if (query.category) {
      list = list.filter((m) => m.category?.toLowerCase() === query.category!.toLowerCase());
    }
    if (query.year) {
      list = list.filter((m) => m.date.startsWith(query.year!));
    }
    if (query.location) {
      list = list.filter((m) =>
        m.location?.toLowerCase().includes(query.location!.toLowerCase()),
      );
    }
    if (query.featured) {
      list = list.filter((m) => m.featured);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.story.toLowerCase().includes(q) ||
          m.caption?.toLowerCase().includes(q) ||
          m.customLabel?.toLowerCase().includes(q),
      );
    }

    res.json(list.sort((a, b) => a.order - b.order));
  } catch (error) {
    next(error);
  }
});

router.get("/memories/favorites", requireBirthdayUser, async (req, res, next) => {
  try {
    const state = await getState();
    const userId = req.birthdayUser!.id;
    const favorites = state.memories
      .filter((m) => m.active)
      .map((m) => buildMemoryObject(state, userId, m))
      .filter((m) => m.isFavorite);
    res.json(favorites.sort((a, b) => a.order - b.order));
  } catch (error) {
    next(error);
  }
});

router.get("/memories/:id", requireBirthdayUser, async (req, res, next) => {
  try {
    const params = GetMemoryParams.parse(req.params);
    const state = await getState();
    const memory = state.memories.find((m) => m.id === params.id);
    if (!memory) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }
    res.json(buildMemoryObject(state, req.birthdayUser!.id, memory));
  } catch (error) {
    next(error);
  }
});

router.post("/memories/:id/comments", requireBirthdayUser, async (req, res, next) => {
  try {
    const params = AddMemoryCommentParams.parse(req.params);
    const input = AddMemoryCommentBody.parse(req.body);
    const state = await getState();
    const memory = state.memories.find((m) => m.id === params.id);
    if (!memory || !memory.allowComments) {
      res.status(400).json({ error: "Comments are not allowed on this memory." });
      return;
    }
    const commentObj: StoredMemoryComment = {
      id: randomUUID(),
      memoryId: memory.id,
      imageId: input.imageId ?? null,
      userId: req.birthdayUser!.id,
      userName: req.birthdayUser!.displayName,
      userRole: req.birthdayUser!.role,
      comment: input.comment,
      hidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.memoryComments ??= [];
    state.memoryComments.push(commentObj);
    addActivity(state, req.birthdayUser!.displayName, "Commented on memory", memory.title);
    await persistState(state);
    res.status(201).json(commentObj);
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/memories/comments/:commentId",
  requireBirthdayUser,
  async (req, res, next) => {
    try {
      const params = UpdateMemoryCommentParams.parse(req.params);
      const input = UpdateMemoryCommentBody.parse(req.body);
      const state = await getState();
      const comment = (state.memoryComments || []).find(
        (c) => c.id === params.commentId && c.userId === req.birthdayUser!.id,
      );
      if (!comment) {
        res.status(404).json({ error: "Comment not found or edit forbidden." });
        return;
      }
      comment.comment = input.comment;
      comment.updatedAt = new Date().toISOString();
      await persistState(state);
      res.json(comment);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/memories/comments/:commentId",
  requireBirthdayUser,
  async (req, res, next) => {
    try {
      const params = DeleteMemoryCommentParams.parse(req.params);
      const state = await getState();
      const index = (state.memoryComments || []).findIndex(
        (c) => c.id === params.commentId && c.userId === req.birthdayUser!.id,
      );
      if (index === -1) {
        res.status(404).json({ error: "Comment not found or deletion forbidden." });
        return;
      }
      state.memoryComments.splice(index, 1);
      await persistState(state);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

router.post("/memories/:id/react", requireBirthdayUser, async (req, res, next) => {
  try {
    const params = ToggleMemoryReactionParams.parse(req.params);
    const input = ToggleMemoryReactionBody.parse(req.body);
    const state = await getState();
    const userId = req.birthdayUser!.id;
    const memory = state.memories.find((m) => m.id === params.id);
    if (!memory || !memory.allowReactions) {
      res.status(400).json({ error: "Reactions disabled for this memory." });
      return;
    }
    state.memoryReactions ??= [];
    const existingIndex = state.memoryReactions.findIndex(
      (r) => r.memoryId === memory.id && r.userId === userId,
    );

    let userReaction: string | null = input.reaction;
    if (existingIndex !== -1) {
      if (state.memoryReactions[existingIndex].reaction === input.reaction) {
        // Toggle off
        state.memoryReactions.splice(existingIndex, 1);
        userReaction = null;
      } else {
        // Replace reaction
        state.memoryReactions[existingIndex].reaction = input.reaction;
      }
    } else {
      state.memoryReactions.push({
        id: randomUUID(),
        memoryId: memory.id,
        imageId: null,
        userId,
        reaction: input.reaction,
        createdAt: new Date().toISOString(),
      });
    }

    await persistState(state);
    const updatedMemory = buildMemoryObject(state, userId, memory);
    res.json({
      reactionCounts: updatedMemory.reactionCounts,
      userReaction: updatedMemory.userReaction,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/memories/:id/favorite", requireBirthdayUser, async (req, res, next) => {
  try {
    const params = ToggleMemoryFavoriteParams.parse(req.params);
    const state = await getState();
    const userId = req.birthdayUser!.id;
    state.memoryFavorites ??= [];
    const index = state.memoryFavorites.findIndex(
      (f) => f.memoryId === params.id && f.userId === userId,
    );
    let isFavorite = false;
    if (index !== -1) {
      state.memoryFavorites.splice(index, 1);
      isFavorite = false;
    } else {
      state.memoryFavorites.push({
        id: randomUUID(),
        userId,
        memoryId: params.id,
        createdAt: new Date().toISOString(),
      });
      isFavorite = true;
    }
    await persistState(state);
    res.json({ isFavorite });
  } catch (error) {
    next(error);
  }
});

/* ========================================================================== */
/* WISHLIST & CHAT                                                            */
/* ========================================================================== */

router.get("/wishlist", requireBirthdayUser, async (req, res, next) => {
  try {
    const state = await getState();
    res.json(state.wishlist.filter((item) => item.userId === req.birthdayUser!.id));
  } catch (error) {
    next(error);
  }
});

router.post("/wishlist", requireBirthdayUser, async (req, res, next) => {
  try {
    const input = CreateWishlistItemBody.parse(req.body);
    const state = await getState();
    const item = {
      id: randomUUID(),
      userId: req.birthdayUser!.id,
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl ?? null,
      externalUrl: input.externalUrl ?? null,
      priority: input.priority,
      createdAt: new Date().toISOString(),
    };
    state.wishlist.unshift(item);
    addActivity(state, req.birthdayUser!.displayName, "Added wishlist item", item.title);
    await persistState(state);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

router.patch("/wishlist/:id", requireBirthdayUser, async (req, res, next) => {
  try {
    const params = UpdateWishlistItemParams.parse(req.params);
    const input = UpdateWishlistItemBody.parse(req.body);
    const state = await getState();
    const item = state.wishlist.find(
      (candidate) => candidate.id === params.id && candidate.userId === req.birthdayUser!.id,
    );
    if (!item) {
      res.status(404).json({ error: "Wishlist item not found" });
      return;
    }
    Object.assign(item, input);
    await persistState(state);
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.delete("/wishlist/:id", requireBirthdayUser, async (req, res, next) => {
  try {
    const params = DeleteWishlistItemParams.parse(req.params);
    const state = await getState();
    const before = state.wishlist.length;
    state.wishlist = state.wishlist.filter(
      (item) => !(item.id === params.id && item.userId === req.birthdayUser!.id),
    );
    if (before === state.wishlist.length) {
      res.status(404).json({ error: "Wishlist item not found" });
      return;
    }
    await persistState(state);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/chat", requireBirthdayUser, async (_req, res, next) => {
  try {
    const state = await getState();
    res.json(
      state.chat.map((message) => {
        const sender = state.users.find((user) => user.id === message.senderId);
        return {
          id: message.id,
          senderName: sender?.displayName ?? "Someone",
          senderRole: sender?.role ?? "USER",
          message: message.message,
          createdAt: message.createdAt,
          read: message.read,
        };
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/chat", requireBirthdayUser, async (req, res, next) => {
  try {
    const input = SendChatMessageBody.parse(req.body);
    const state = await getState();
    const message = {
      id: randomUUID(),
      senderId: req.birthdayUser!.id,
      message: input.message,
      createdAt: new Date().toISOString(),
      read: false,
    };
    state.chat.push(message);
    addActivity(state, req.birthdayUser!.displayName, "Sent a message", input.message);
    await persistState(state);
    res.status(201).json({
      id: message.id,
      senderName: req.birthdayUser!.displayName,
      senderRole: req.birthdayUser!.role,
      message: message.message,
      createdAt: message.createdAt,
      read: message.read,
    });
  } catch (error) {
    next(error);
  }
});

/* ========================================================================== */
/* ADMIN CONTROL ROOM ROUTES                                                  */
/* ========================================================================== */

const admin = router;
admin.use("/admin", requireBirthdayUser, requireBirthdayRole("ADMIN"));

admin.get("/admin/summary", async (_req, res, next) => {
  try {
    const state = await getState();
    const completed = state.clues.filter((clue) => isClueCompleted(state, USER_ID, clue.id)).length;
    res.json({
      userOnline: Boolean(state.users.find((user) => user.id === USER_ID)?.lastLogin),
      progress: {
        completed,
        total: state.clues.filter((clue) => clue.active).length,
        percent: state.clues.length ? Math.round((completed / state.clues.length) * 100) : 0,
      },
      giftsUnlocked: state.giftProgress[USER_ID]?.length ?? 0,
      memoryCount: state.memories.filter((memory) => memory.active).length,
      wishlistCount: state.wishlist.filter((item) => item.userId === USER_ID).length,
      unreadMessages: state.chat.filter((message) => !message.read && message.senderId === USER_ID).length,
      upcomingSurprise: "Tomorrow at 7:00 PM",
      recentActivity: state.activity.slice(0, 8),
    });
  } catch (error) {
    next(error);
  }
});

admin.patch("/admin/birthday", async (req, res, next) => {
  try {
    const input = UpdateBirthdayBody.parse(req.body);
    const state = await getState();
    Object.assign(state.birthday, input);
    addActivity(state, "Kunju", "Updated birthday card", "Opening experience settings changed.");
    await persistState(state);
    res.json(state.birthday);
  } catch (error) {
    next(error);
  }
});

admin.post("/admin/clues", async (req, res, next) => {
  try {
    const input = CreateClueBody.parse(req.body);
    const state = await getState();
    const clue = {
      id: randomUUID(),
      ...input,
      unlockAt: input.unlockAt ? new Date(input.unlockAt).toISOString() : null,
      requiresClueId: input.requiresClueId ?? null,
      giftId: input.giftId ?? null,
    };
    state.clues.push(clue);
    await persistState(state);
    res.status(201).json(toClue(state, USER_ID, clue));
  } catch (error) {
    next(error);
  }
});

admin.patch("/admin/clues/:id", async (req, res, next) => {
  try {
    const params = UpdateClueParams.parse(req.params);
    const input = UpdateClueBody.parse(req.body);
    const state = await getState();
    const clue = state.clues.find((candidate) => candidate.id === params.id);
    if (!clue) {
      res.status(404).json({ error: "Clue not found" });
      return;
    }
    Object.assign(clue, input);
    await persistState(state);
    res.json(toClue(state, USER_ID, clue));
  } catch (error) {
    next(error);
  }
});

admin.delete("/admin/clues/:id", async (req, res, next) => {
  try {
    const params = DeleteClueParams.parse(req.params);
    const state = await getState();
    state.clues = state.clues.filter((clue) => clue.id !== params.id);
    await persistState(state);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/* --- ADMIN GIFTS --- */

admin.post("/admin/gifts", async (req, res, next) => {
  try {
    const input = CreateGiftBody.parse(req.body);
    const state = await getState();
    const giftId = randomUUID();
    const giftObj: StoredGift = {
      id: giftId,
      order: input.order,
      title: input.title,
      shortDescription: input.shortDescription ?? null,
      description: input.description,
      message: input.message,
      coverImageId: input.coverImageId ?? null,
      mediaUrl: input.mediaUrl ?? null,
      videoFileId: input.videoFileId ?? null,
      audioFileId: input.audioFileId ?? null,
      requiredClueId: input.requiredClueId ?? null,
      unlockAfterClueNumber: (input as any).unlockAfterClueNumber ?? null,
      unlockAfterClueId: (input as any).unlockAfterClueId ?? null,
      unlockType: input.unlockType,
      unlockAt: input.unlockAt ? new Date(input.unlockAt).toISOString() : null,
      allowComments: input.allowComments ?? true,
      active: input.active,
      featured: input.featured ?? false,
      buttonText: input.buttonText ?? "KEEP THIS MEMORY ❤️",
      createdAt: new Date().toISOString(),
    };
    state.gifts.push(giftObj);

    if (input.images && input.images.length > 0) {
      state.giftImages ??= [];
      input.images.forEach((img, idx) => {
        state.giftImages.push({
          id: img.id || randomUUID(),
          giftId,
          driveFileId: img.driveFileId,
          filename: img.filename,
          caption: img.caption ?? null,
          label: img.label ?? null,
          displayOrder: img.displayOrder || idx + 1,
          isCover: img.isCover || idx === 0,
          createdAt: new Date().toISOString(),
          url: img.url,
        });
      });
    }

    addActivity(state, "Kunju", "Created gift", giftObj.title);
    await persistState(state);
    res.status(201).json(buildGiftObject(state, USER_ID, giftObj));
  } catch (error) {
    next(error);
  }
});

admin.patch("/admin/gifts/:id", async (req, res, next) => {
  try {
    const params = UpdateGiftParams.parse(req.params);
    const input = UpdateGiftBody.parse(req.body);
    const state = await getState();
    const gift = state.gifts.find((g) => g.id === params.id);
    if (!gift) {
      res.status(404).json({ error: "Gift not found" });
      return;
    }
    Object.assign(gift, {
      ...input,
      unlockAt: input.unlockAt ? new Date(input.unlockAt).toISOString() : gift.unlockAt,
    });

    if (input.images) {
      state.giftImages = (state.giftImages || []).filter((img) => img.giftId !== gift.id);
      input.images.forEach((img, idx) => {
        state.giftImages.push({
          id: img.id || randomUUID(),
          giftId: gift.id,
          driveFileId: img.driveFileId,
          filename: img.filename,
          caption: img.caption ?? null,
          label: img.label ?? null,
          displayOrder: img.displayOrder || idx + 1,
          isCover: img.isCover || idx === 0,
          createdAt: new Date().toISOString(),
          url: img.url,
        });
      });
    }

    addActivity(state, "Kunju", "Updated gift", gift.title);
    await persistState(state);
    res.json(buildGiftObject(state, USER_ID, gift));
  } catch (error) {
    next(error);
  }
});

admin.delete("/admin/gifts/:id", async (req, res, next) => {
  try {
    const params = DeleteGiftParams.parse(req.params);
    const state = await getState();
    state.gifts = state.gifts.filter((g) => g.id !== params.id);
    state.giftImages = (state.giftImages || []).filter((i) => i.giftId !== params.id);
    state.giftComments = (state.giftComments || []).filter((c) => c.giftId !== params.id);
    await persistState(state);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

admin.patch("/admin/gifts/comments/:commentId/status", async (req, res, next) => {
  try {
    const params = UpdateGiftCommentStatusParams.parse(req.params);
    const input = UpdateGiftCommentStatusBody.parse(req.body);
    const state = await getState();
    const comment = (state.giftComments || []).find((c) => c.id === params.commentId);
    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
    comment.hidden = input.hidden;
    await persistState(state);
    res.json({ message: "Comment status updated." });
  } catch (error) {
    next(error);
  }
});

admin.post("/admin/gifts/:id/unlock", async (req, res, next) => {
  try {
    const giftId = req.params.id;
    const state = await getState();
    const gift = state.gifts.find((g) => g.id === giftId);
    if (!gift) {
      res.status(404).json({ error: "Gift not found" });
      return;
    }
    state.giftProgress[USER_ID] ??= [];
    if (!getGiftProgress(state, USER_ID, gift.id)) {
      state.giftProgress[USER_ID].push({
        giftId: gift.id,
        unlockedAt: new Date().toISOString(),
        viewedAt: null,
      });
      addActivity(state, "Kunju", "Manually Unlocked Gift", `Unlocked gift '${gift.title}' for Kochu.`);
      await persistState(state);
    }
    res.json(buildGiftObject(state, USER_ID, gift));
  } catch (error) {
    next(error);
  }
});

admin.post("/admin/gifts/:id/lock", async (req, res, next) => {
  try {
    const giftId = req.params.id;
    const state = await getState();
    const gift = state.gifts.find((g) => g.id === giftId);
    if (!gift) {
      res.status(404).json({ error: "Gift not found" });
      return;
    }
    state.giftProgress[USER_ID] = (state.giftProgress[USER_ID] || []).filter(
      (gp) => gp.giftId !== gift.id,
    );
    addActivity(state, "Kunju", "Relocked Gift", `Relocked gift '${gift.title}' for Kochu.`);
    await persistState(state);
    res.json(buildGiftObject(state, USER_ID, gift));
  } catch (error) {
    next(error);
  }
});

admin.get("/admin/journey", async (_req, res, next) => {
  try {
    const state = await getState();
    const summary = getJourneySummary(state, USER_ID);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

/* --- ADMIN MEMORIES --- */

admin.post("/admin/memories", async (req, res, next) => {
  try {
    const input = CreateMemoryBody.parse(req.body);
    const state = await getState();
    const memoryId = randomUUID();
    const memoryObj: StoredMemory = {
      id: memoryId,
      title: input.title,
      shortDescription: input.shortDescription ?? null,
      story: input.story,
      date: input.date,
      location: input.location ?? null,
      category: input.category ?? null,
      customLabel: input.customLabel ?? null,
      caption: input.caption ?? null,
      quote: input.quote ?? null,
      adminNote: input.adminNote ?? null,
      coverImageId: input.coverImageId ?? null,
      imageUrl: null,
      videoFileId: input.videoFileId ?? null,
      audioFileId: input.audioFileId ?? null,
      order: input.order,
      featured: input.featured ?? false,
      active: input.active,
      allowComments: input.allowComments ?? true,
      allowReactions: input.allowReactions ?? true,
      createdAt: new Date().toISOString(),
    };

    state.memories.push(memoryObj);

    if (input.images && input.images.length > 0) {
      state.memoryImages ??= [];
      input.images.forEach((img, idx) => {
        state.memoryImages.push({
          id: img.id || randomUUID(),
          memoryId,
          driveFileId: img.driveFileId,
          filename: img.filename,
          caption: img.caption ?? null,
          label: img.label ?? null,
          date: img.date ?? null,
          displayOrder: img.displayOrder || idx + 1,
          isCover: img.isCover || idx === 0,
          createdAt: new Date().toISOString(),
          url: img.url,
        });
      });
    }

    addActivity(state, "Kunju", "Created memory", memoryObj.title);
    await persistState(state);
    res.status(201).json(buildMemoryObject(state, USER_ID, memoryObj));
  } catch (error) {
    next(error);
  }
});

admin.patch("/admin/memories/:id", async (req, res, next) => {
  try {
    const params = UpdateMemoryParams.parse(req.params);
    const input = UpdateMemoryBody.parse(req.body);
    const state = await getState();
    const memory = state.memories.find((m) => m.id === params.id);
    if (!memory) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }

    Object.assign(memory, {
      ...input,
    });

    if (input.images) {
      state.memoryImages = (state.memoryImages || []).filter((img) => img.memoryId !== memory.id);
      input.images.forEach((img, idx) => {
        state.memoryImages.push({
          id: img.id || randomUUID(),
          memoryId: memory.id,
          driveFileId: img.driveFileId,
          filename: img.filename,
          caption: img.caption ?? null,
          label: img.label ?? null,
          date: img.date ?? null,
          displayOrder: img.displayOrder || idx + 1,
          isCover: img.isCover || idx === 0,
          createdAt: new Date().toISOString(),
          url: img.url,
        });
      });
    }

    addActivity(state, "Kunju", "Updated memory", memory.title);
    await persistState(state);
    res.json(buildMemoryObject(state, USER_ID, memory));
  } catch (error) {
    next(error);
  }
});

admin.post("/admin/memories/:id/duplicate", async (req, res, next) => {
  try {
    const params = DuplicateMemoryParams.parse(req.params);
    const state = await getState();
    const original = state.memories.find((m) => m.id === params.id);
    if (!original) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }

    const newId = randomUUID();
    const dupMemory: StoredMemory = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      order: state.memories.length + 1,
      createdAt: new Date().toISOString(),
    };
    state.memories.push(dupMemory);

    const origImages = (state.memoryImages || []).filter((i) => i.memoryId === original.id);
    origImages.forEach((img) => {
      state.memoryImages.push({
        ...img,
        id: randomUUID(),
        memoryId: newId,
        createdAt: new Date().toISOString(),
      });
    });

    addActivity(state, "Kunju", "Duplicated memory", dupMemory.title);
    await persistState(state);
    res.status(201).json(buildMemoryObject(state, USER_ID, dupMemory));
  } catch (error) {
    next(error);
  }
});

admin.post("/admin/memories/reorder", async (req, res, next) => {
  try {
    const input = ReorderMemoriesBody.parse(req.body);
    const state = await getState();
    input.orderedIds.forEach((id, index) => {
      const memory = state.memories.find((m) => m.id === id);
      if (memory) {
        memory.order = index + 1;
      }
    });
    await persistState(state);
    res.json({ message: "Memories reordered successfully." });
  } catch (error) {
    next(error);
  }
});

admin.delete("/admin/memories/:id", async (req, res, next) => {
  try {
    const params = DeleteMemoryParams.parse(req.params);
    const state = await getState();
    state.memories = state.memories.filter((m) => m.id !== params.id);
    state.memoryImages = (state.memoryImages || []).filter((i) => i.memoryId !== params.id);
    state.memoryComments = (state.memoryComments || []).filter((c) => c.memoryId !== params.id);
    state.memoryReactions = (state.memoryReactions || []).filter((r) => r.memoryId !== params.id);
    state.memoryFavorites = (state.memoryFavorites || []).filter((f) => f.memoryId !== params.id);
    await persistState(state);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

admin.patch("/admin/memories/comments/:commentId/status", async (req, res, next) => {
  try {
    const params = UpdateMemoryCommentStatusParams.parse(req.params);
    const input = UpdateMemoryCommentStatusBody.parse(req.body);
    const state = await getState();
    const comment = (state.memoryComments || []).find((c) => c.id === params.commentId);
    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
    comment.hidden = input.hidden;
    await persistState(state);
    res.json({ message: "Comment status updated." });
  } catch (error) {
    next(error);
  }
});

admin.delete("/admin/memories/comments/:commentId", async (req, res, next) => {
  try {
    const params = AdminDeleteMemoryCommentParams.parse(req.params);
    const state = await getState();
    state.memoryComments = (state.memoryComments || []).filter((c) => c.id !== params.commentId);
    await persistState(state);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

admin.get("/admin/activity", async (_req, res, next) => {
  try {
    const state = await getState();
    res.json(state.activity);
  } catch (error) {
    next(error);
  }
});

export default router;