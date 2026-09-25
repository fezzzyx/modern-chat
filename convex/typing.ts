import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const TYPING_TIMEOUT_MS = 3000; // 3 секунди тайм-аут

/**
 * Оновлює мітку часу набору тексту для поточного користувача
 */
export const setTyping = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const user = await ctx.db.get(userId);
    if (!user) return;

    // Шукаємо існуючий запис користувача для цієї кімнати
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_user_and_room", (q) =>
        q.eq("userId", userId).eq("chatRoomId", args.chatRoomId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { lastTypedAt: now });
    } else {
      await ctx.db.insert("typingIndicators", {
        chatRoomId: args.chatRoomId,
        userId,
        userName: user.name ?? user.email ?? "Співрозмовник",
        lastTypedAt: now,
      });
    }
  },
});

/**
 * Отримує імена користувачів, які зараз друкують у кімнаті
 */
export const getTypingUsers = query({
  args: {
    chatRoomId: v.id("chatRooms"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const threshold = Date.now() - TYPING_TIMEOUT_MS;

    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_room", (q) => q.eq("chatRoomId", args.chatRoomId))
      .filter((q) => q.gt(q.field("lastTypedAt"), threshold))
      .collect();

    // Повертаємо імена всіх, хто друкує, крім себе самого
    return indicators
      .filter((ind) => ind.userId !== userId)
      .map((ind) => ind.userName);
  },
});