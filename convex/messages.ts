import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
/**
 * Отримання списку повідомлень у вказаній кімнаті
 * в хронологічному порядку.
 */
export const listMessages = query({
  args: {
    chatRoomId: v.id("chatRooms"),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) =>
        q.eq("chatRoomId", args.chatRoomId)
      )
      .order("asc")
      .collect();
  },
});

/**
 * Відправка текстового повідомлення.
 */
export const sendMessage = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    content: v.string(),

    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Unauthorized: Потрібна авторизація");
    }

    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User not found: Користувача не знайдено");
    }

    const trimmedContent = args.content.trim();

    if (!trimmedContent) {
      throw new Error("Message content cannot be empty");
    }

    const createdAt = Date.now();
    const senderName =
      user.name ??
      user.email ??
      "Користувач";

    const messageId = await ctx.db.insert("messages", {
      chatRoomId: args.chatRoomId,
      senderId: userId,

      senderName,
      senderPhoto: user.image,

      content: trimmedContent,

      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,

      createdAt,
    });

    await ctx.db.patch(args.chatRoomId, {
      lastMessage: `${senderName}: ${trimmedContent}`,
      lastMessageAt: createdAt,
    });

    return messageId;
  },
});

/**
 * Редагування власного текстового повідомлення.
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Unauthorized: Потрібна авторизація");
    }

    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found: Повідомлення не знайдено");
    }

    if (message.senderId !== userId) {
      throw new Error(
        "Forbidden: Ви можете редагувати лише власні повідомлення"
      );
    }

    const trimmedContent = args.content.trim();

    if (!trimmedContent) {
      throw new Error("Повідомлення не може бути порожнім");
    }

    await ctx.db.patch(args.messageId, {
      content: trimmedContent,
      isEdited: true,
    });

    // Перевіряємо, чи це повідомлення досі є останнім.
    const room = await ctx.db.get(message.chatRoomId);

    if (room) {
      const latestMessage = await ctx.db
        .query("messages")
        .withIndex("by_chat_room", (q) =>
          q.eq("chatRoomId", message.chatRoomId)
        )
        .order("desc")
        .first();

      if (latestMessage?._id === message._id) {
        await ctx.db.patch(message.chatRoomId, {
          lastMessage: `${
            message.senderName ?? "Користувач"
          }: ${trimmedContent}`,
        });
      }
    }
  },
});

/**
 * Видалення власного повідомлення.
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Unauthorized: Потрібна авторизація");
    }

    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found: Повідомлення не знайдено");
    }

    // Спочатку перевіряємо власника.
    if (message.senderId !== userId) {
      throw new Error(
        "Forbidden: Ви можете видаляти лише власні повідомлення"
      );
    }

    // Видаляємо пов'язаний storage-файл.
    if (message.storageId) {
      await ctx.storage.delete(message.storageId);
    }

    if (message.audioStorageId) {
      await ctx.storage.delete(message.audioStorageId);
    }

    if (message.videoStorageId) {
      await ctx.storage.delete(message.videoStorageId);
    }

    await ctx.db.delete(args.messageId);

    // Знаходимо нове останнє повідомлення.
    const lastRemainingMessage = await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) =>
        q.eq("chatRoomId", message.chatRoomId)
      )
      .order("desc")
      .first();

    if (lastRemainingMessage) {
      let lastMessage = "Повідомлення";

      if (lastRemainingMessage.isVideoNote) {
        lastMessage = "🎥 Відеоповідомлення";
      } else if (lastRemainingMessage.audioUrl) {
        lastMessage = "🎤 Голосове повідомлення";
      } else if (lastRemainingMessage.imageUrl) {
        lastMessage = "📷 Фотографія";
      } else if (lastRemainingMessage.content) {
        lastMessage = lastRemainingMessage.content;
      } else if (lastRemainingMessage.text) {
        // Сумісність зі старими повідомленнями.
        lastMessage = lastRemainingMessage.text;
      }

      await ctx.db.patch(message.chatRoomId, {
        lastMessage: `${
          lastRemainingMessage.senderName ?? "Користувач"
        }: ${lastMessage}`,
        lastMessageAt:
          lastRemainingMessage.createdAt ??
          lastRemainingMessage._creationTime,
      });
    } else {
      await ctx.db.patch(message.chatRoomId, {
        lastMessage: "Повідомлень немає",
        lastMessageAt: Date.now(),
      });
    }
  },
});

/**
 * Відправка повідомлення із зображенням.
 */
export const sendMediaMessage = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),

    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Unauthorized: Потрібна авторизація");
    }

    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("Користувача не знайдено");
    }

    const imageUrl = await ctx.storage.getUrl(args.storageId);

    if (!imageUrl) {
      throw new Error(
        "Не вдалося отримати посилання на збережений файл"
      );
    }

    const createdAt = Date.now();
    const senderName =
      user.name ??
      user.email ??
      "Користувач";

    const messageId = await ctx.db.insert("messages", {
      chatRoomId: args.chatRoomId,
      senderId: userId,

      senderName,
      senderPhoto: user.image,

      content: args.caption?.trim() || undefined,

      imageUrl,
      storageId: args.storageId,

      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,

      createdAt,
    });

    await ctx.db.patch(args.chatRoomId, {
      lastMessage: `${senderName}: 📷 Фотографія`,
      lastMessageAt: createdAt,
    });

    return messageId;
  },
});

/**
 * Відправка голосового повідомлення.
 */
export const sendAudioMessage = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    audioStorageId: v.id("_storage"),
    audioDuration: v.number(),

    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Необхідно авторизуватися");
    }

    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("Користувача не знайдено");
    }

    const audioUrl = await ctx.storage.getUrl(args.audioStorageId);

    if (!audioUrl) {
      throw new Error("Не вдалося отримати URL аудіофайлу");
    }

    const createdAt = Date.now();
    const senderName =
      user.name ??
      user.email?.split("@")[0] ??
      "Користувач";

    const messageId = await ctx.db.insert("messages", {
      chatRoomId: args.chatRoomId,
      senderId: userId,

      senderName,
      senderPhoto: user.image,

      audioUrl,
      audioStorageId: args.audioStorageId,
      audioDuration: args.audioDuration,

      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,

      createdAt,
    });

    await ctx.db.patch(args.chatRoomId, {
      lastMessage: "🎤 Голосове повідомлення",
      lastMessageAt: createdAt,
    });

    return messageId;
  },
});

/**
 * Генерація URL для завантаження файлу в Convex Storage.
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Необхідно авторизуватися");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Відправка відеокружечка.
 */

export const getPaginatedMessages = query({
  args: {
    chatRoomId: v.id("chatRooms"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    const paginated = await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) => q.eq("chatRoomId", args.chatRoomId))
      .order("desc")
      .paginate(args.paginationOpts);

    if (paginated.page.length === 0) {
      return paginated;
    }

    const messagesWithSender = await Promise.all(
      paginated.page.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);

        return {
          ...msg,
          sender: {
            _id: sender?._id,
            name: sender?.name ?? "Користувач",
            username: sender?.username,
            image: sender?.image,
          },
        };
      })
    );

    return {
      ...paginated,
      page: messagesWithSender,
    };
  },
});

export const sendVideoNoteMessage = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    videoStorageId: v.id("_storage"),
    videoDuration: v.number(),

    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Необхідно авторизуватися");
    }

    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("Користувача не знайдено");
    }

    const videoUrl = await ctx.storage.getUrl(args.videoStorageId);

    if (!videoUrl) {
      throw new Error("Не вдалося отримати URL відеофайлу");
    }

    const createdAt = Date.now();
    const senderName =
      user.name ??
      user.email ??
      "Користувач";

    const messageId = await ctx.db.insert("messages", {
      chatRoomId: args.chatRoomId,
      senderId: userId,

      senderName,
      senderPhoto: user.image,

      videoUrl,
      videoStorageId: args.videoStorageId,
      videoDuration: args.videoDuration,
      isVideoNote: true,

      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,

      createdAt,
    });

    await ctx.db.patch(args.chatRoomId, {
      lastMessage: `${senderName}: 🎥 Відеоповідомлення`,
      lastMessageAt: createdAt,
    });

    return messageId;
  },
});
