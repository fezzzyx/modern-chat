import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Отримання списку всіх кімнат
 */
export const listRooms = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("chatRooms").order("desc").collect();
  },
});

/**
 * Отримання інформації про конкретну кімнату
 */
export const getRoom = query({
  args: { roomId: v.id("chatRooms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roomId);
  },
});

/**
 * Створення нової кімнати
 */
export const createRoom = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Потрібна авторизація");
    }

    const roomId = await ctx.db.insert("chatRooms", {
      title: args.title.trim(),
      description: args.description?.trim(),
      creatorId: userId,
      lastMessageAt: Date.now(),
    });

    return roomId;
  },
});

/**
 * Видалення кімнати (тільки автором) разом із повідомленнями
 */
export const deleteRoom = mutation({
  args: {
    roomId: v.id("chatRooms"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Потрібна авторизація");
    }

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Кімнату не знайдено");
    }

    // Перевірка прав: тільки творець може видалити кімнату
    if (room.creatorId !== userId) {
      throw new Error("Forbidden: Видалити кімнату може лише її творець");
    }

    // 1. Видаляємо всі повідомлення кімнати
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) => q.eq("chatRoomId", args.roomId))
      .collect();

    for (const msg of messages) {
      // Якщо до повідомлення прикріплено файл у сховищі — видаляємо його
      if (msg.storageId) {
        await ctx.storage.delete(msg.storageId);
      }
      await ctx.db.delete(msg._id);
    }

    // 2. Видаляємо індикатори набору тексту для цієї кімнати
    const typingRecords = await ctx.db
      .query("typingIndicators")
      .withIndex("by_room", (q) => q.eq("chatRoomId", args.roomId))
      .collect();

    for (const record of typingRecords) {
      await ctx.db.delete(record._id);
    }

    // 3. Видаляємо саму кімнату
    await ctx.db.delete(args.roomId);

    return { success: true };
  },
});