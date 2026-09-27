import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { COLORS } from "../../../constants/theme";

import { ImageViewerModal } from "../../../components/ImageViewerModal";
import { ReplyPreviewBar, ReplyTarget } from "../../../components/ReplyPreviewBar";
import {
  SwipeableMessageItem,
  MessageItemData,
} from "../../../components/SwipeableMessageItem";
import { TypingDots } from "../../../components/TypingDots";

const MESSAGES_PAGE_SIZE = 15;

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const chatRoomId = id as Id<"chatRooms">;

  // ---------------------------------------------------------------------------
  // Room
  // ---------------------------------------------------------------------------

  const room = useQuery(api.rooms.getRoom, {
    roomId: chatRoomId,
  });

  // ---------------------------------------------------------------------------
  // Paginated messages
  // ---------------------------------------------------------------------------

  const {
    results: messages,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.messages.getPaginatedMessages,
    { chatRoomId },
    {
      initialNumItems: MESSAGES_PAGE_SIZE,
    }
  );

  // ---------------------------------------------------------------------------
  // Current user
  // ---------------------------------------------------------------------------

  const currentUser = useQuery(api.users.currentUser);

  // ---------------------------------------------------------------------------
  // Typing users
  // ---------------------------------------------------------------------------

  const typingUsers = useQuery(api.typing.getTypingUsers, {
    chatRoomId,
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const sendMessage = useMutation(api.messages.sendMessage);
  const sendMediaMessage = useMutation(api.messages.sendMediaMessage);
  const generateUploadUrl = useMutation(
    api.messages.generateUploadUrl
  );
  const editMessage = useMutation(api.messages.editMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const setTyping = useMutation(api.typing.setTyping);

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [inputText, setInputText] = useState("");
  const [editingMessageId, setEditingMessageId] =
    useState<Id<"messages"> | null>(null);

  const [selectedImageUri, setSelectedImageUri] =
    useState<string | null>(null);

  const [fullscreenImage, setFullscreenImage] =
    useState<string | null>(null);

  const [replyTarget, setReplyTarget] =
    useState<ReplyTarget | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------

  const flatListRef = useRef<FlatList>(null);
  const lastTypingCallRef = useRef(0);

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  const handleLoadMore = () => {
    if (status !== "CanLoadMore") {
      return;
    }

    loadMore(MESSAGES_PAGE_SIZE);
  };

  // ---------------------------------------------------------------------------
  // Typing indicator
  // ---------------------------------------------------------------------------

  const handleTextChange = (text: string) => {
    setInputText(text);

    const now = Date.now();

    if (now - lastTypingCallRef.current > 1500) {
      lastTypingCallRef.current = now;

      setTyping({ chatRoomId }).catch((error) => {
        console.error("setTyping error:", error);
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Pick image
  // ---------------------------------------------------------------------------

  const pickImage = async () => {
    try {
      const { status: permissionStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionStatus !== "granted") {
        Alert.alert(
          "Дозвіл потрібен",
          "Надайте доступ до медіатеки для надсилання фотографій."
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.8,
        });

      if (!result.canceled && result.assets[0]?.uri) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("pickImage error:", error);

      Alert.alert(
        "Помилка",
        "Не вдалося вибрати зображення"
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Start reply
  // ---------------------------------------------------------------------------

  const handleStartReply = (msg: MessageItemData) => {
    setReplyTarget({
      messageId: msg._id,
      senderName: msg.senderName,
      text:
        msg.content ||
        (msg.imageUrl ? "📷 Фотографія" : ""),
    });

    // Cancel editing mode
    setEditingMessageId(null);
  };

  // ---------------------------------------------------------------------------
  // Send / edit message
  // ---------------------------------------------------------------------------

  const handleSend = async () => {
    const text = inputText.trim();

    if ((!text && !selectedImageUri) || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      // -----------------------------------------------------------------------
      // Edit existing message
      // -----------------------------------------------------------------------

      if (editingMessageId) {
        await editMessage({
          messageId: editingMessageId,
          content: text,
        });

        setEditingMessageId(null);
      }

      // -----------------------------------------------------------------------
      // Send image
      // -----------------------------------------------------------------------

      else if (selectedImageUri) {
        const uploadUrl = await generateUploadUrl();

        const fileResponse =
          await globalThis.fetch(selectedImageUri);

        if (!fileResponse.ok) {
          throw new Error(
            "Не вдалося прочитати вибране зображення"
          );
        }

        const blob = await fileResponse.blob();

        const uploadResult = await globalThis.fetch(
          uploadUrl,
          {
            method: "POST",
            headers: {
              "Content-Type":
                blob.type || "image/jpeg",
            },
            body: blob,
          }
        );

        if (!uploadResult.ok) {
          throw new Error(
            "Не вдалося завантажити зображення"
          );
        }

        const { storageId } =
          await uploadResult.json();

        await sendMediaMessage({
          chatRoomId,
          storageId,
          caption: text || undefined,

          replyToId: replyTarget
            ? (replyTarget.messageId as Id<"messages">)
            : undefined,

          replyToSender:
            replyTarget?.senderName,

          replyToText:
            replyTarget?.text,
        });

        setSelectedImageUri(null);
        setReplyTarget(null);
      }

      // -----------------------------------------------------------------------
      // Send text
      // -----------------------------------------------------------------------

      else {
        await sendMessage({
          chatRoomId,
          content: text,

          replyToId: replyTarget
            ? (replyTarget.messageId as Id<"messages">)
            : undefined,

          replyToSender:
            replyTarget?.senderName,

          replyToText:
            replyTarget?.text,
        });

        setReplyTarget(null);
      }

      setInputText("");
    } catch (error) {
      console.error("handleSend error:", error);

      Alert.alert(
        "Помилка",
        "Не вдалося надіслати повідомлення"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Message long press
  // ---------------------------------------------------------------------------

  const handleMessageLongPress = (
    item: MessageItemData
  ) => {
    const isOwn =
      item.senderId === currentUser?._id;

    const options: any[] = [
      {
        text: "Відповісти",
        onPress: () =>
          handleStartReply(item),
      },
    ];

    if (isOwn) {
      // Edit
      if (item.content) {
        options.push({
          text: "Редагувати",

          onPress: () => {
            setEditingMessageId(item._id);
            setInputText(item.content || "");
            setReplyTarget(null);
          },
        });
      }

      // Delete
      options.push({
        text: "Видалити",
        style: "destructive",

        onPress: () => {
          Alert.alert(
            "Видалити повідомлення?",
            "Ви впевнені, що хочете видалити повідомлення?",
            [
              {
                text: "Скасувати",
                style: "cancel",
              },

              {
                text: "Так, видалити",
                style: "destructive",

                onPress: () =>
                  deleteMessage({
                    messageId: item._id,
                  }),
              },
            ]
          );
        },
      });
    }

    // Cancel
    options.push({
      text: "Скасувати",
      style: "cancel",
    });

    Alert.alert(
      "Дії з повідомленням",
      undefined,
      options
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
      keyboardVerticalOffset={
        Platform.OS === "ios" ? 90 : 0
      }
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------------------------ */}

      <Stack.Screen
        options={{
          title: room?.title ?? "Чат",

          headerRight: () => (
            <TouchableOpacity
              onPress={() =>
                router.push(
                  `/settings/${chatRoomId}`
                )
              }
              className="p-1"
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Pagination debug */}
      {/* ------------------------------------------------------------------ */}

      <View className="px-4 py-1">
        <Text className="text-xs text-grey">
          {messages.length} messages • {status}
        </Text>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Messages */}
      {/* ------------------------------------------------------------------ */}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        inverted

        renderItem={({ item }) => (
          <SwipeableMessageItem
            item={item as MessageItemData}

            isOwn={
              item.senderId === currentUser?._id
            }

            onLongPress={() =>
              handleMessageLongPress(
                item as MessageItemData
              )
            }

            onReply={handleStartReply}

            onImagePress={(url) =>
              setFullscreenImage(url)
            }

            onAuthorPress={(authorId) =>
              router.push(`/user/${authorId}`)
            }
          />
        )}

        showsVerticalScrollIndicator={false}

        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingVertical: 16,
        }}

        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}

        ListFooterComponent={
          status === "LoadingMore" ? (
            <View className="py-4 items-center w-full">
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
              />
            </View>
          ) : null
        }

        ListEmptyComponent={
          !isLoading ? (
            <View className="py-12 items-center justify-center">
              <Text className="text-grey text-sm text-center">
                У цій кімнаті ще немає повідомлень.
                {"\n"}
                Напишіть першим!
              </Text>
            </View>
          ) : null
        }
      />

      {/* ------------------------------------------------------------------ */}
      {/* Typing indicator */}
      {/* ------------------------------------------------------------------ */}

      {typingUsers &&
        typingUsers.length > 0 && (
          <TypingDots
            typingUsers={typingUsers}
          />
        )}

      {/* ------------------------------------------------------------------ */}
      {/* Reply preview */}
      {/* ------------------------------------------------------------------ */}

      {replyTarget && (
        <ReplyPreviewBar
          replyTarget={replyTarget}
          onCancel={() =>
            setReplyTarget(null)
          }
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Editing indicator */}
      {/* ------------------------------------------------------------------ */}

      {editingMessageId && (
        <View className="flex-row items-center justify-between px-4 py-2 bg-surfaceLight border-t border-surface">
          <View className="flex-row items-center flex-1 mr-2">
            <Ionicons
              name="pencil"
              size={16}
              color={COLORS.primary}
              style={{ marginRight: 6 }}
            />

            <Text className="text-white text-xs font-semibold">
              Редагування повідомлення
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setEditingMessageId(null);
              setInputText("");
            }}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Selected image preview */}
      {/* ------------------------------------------------------------------ */}

      {selectedImageUri && (
        <View className="flex-row items-center px-4 py-2 bg-surfaceLight border-t border-surface">
          <Image
            source={{
              uri: selectedImageUri,
            }}
            className="w-12 h-12 rounded-lg mr-3"
          />

          <Text className="text-white text-xs flex-1">
            Фото прикріплено
          </Text>

          <TouchableOpacity
            onPress={() =>
              setSelectedImageUri(null)
            }
          >
            <Ionicons
              name="close-circle"
              size={22}
              color={COLORS.danger}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Input */}
      {/* ------------------------------------------------------------------ */}

      <View className="flex-row items-center p-3 bg-surface border-t border-surfaceLight">
        {/* Image button */}

        <TouchableOpacity
          onPress={pickImage}
          disabled={isSubmitting}
          className="mr-2 p-2 rounded-full bg-surfaceLight"
        >
          <Ionicons
            name="image-outline"
            size={22}
            color={COLORS.primary}
          />
        </TouchableOpacity>

        {/* Text input */}

        <TextInput
          className="flex-1 bg-background text-white px-4 py-2.5 rounded-full text-base border border-surfaceLight mr-2"

          placeholder={
            editingMessageId
              ? "Змініть текст..."
              : replyTarget
              ? `Відповідь для ${replyTarget.senderName}...`
              : selectedImageUri
              ? "Додайте підпис до фото..."
              : "Напишіть повідомлення..."
          }

          placeholderTextColor={
            COLORS.textMuted
          }

          value={inputText}
          onChangeText={handleTextChange}
          multiline
        />

        {/* Send button */}

        <TouchableOpacity
          onPress={handleSend}

          disabled={
            (!inputText.trim() &&
              !selectedImageUri) ||
            isSubmitting
          }

          className={`w-11 h-11 rounded-full items-center justify-center bg-primary ${
            (!inputText.trim() &&
              !selectedImageUri) ||
            isSubmitting
              ? "opacity-50"
              : "active:opacity-80"
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Ionicons
              name={
                editingMessageId
                  ? "checkmark"
                  : "send"
              }
              size={20}
              color="#FFFFFF"
            />
          )}
        </TouchableOpacity>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Fullscreen image */}
      {/* ------------------------------------------------------------------ */}

      <ImageViewerModal
        visible={!!fullscreenImage}
        imageUrl={fullscreenImage}
        onClose={() =>
          setFullscreenImage(null)
        }
      />
    </KeyboardAvoidingView>
  );
}

