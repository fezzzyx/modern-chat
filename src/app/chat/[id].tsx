import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/theme";
import { Id } from "../../../convex/_generated/dataModel";
import * as ImagePicker from "expo-image-picker";
import { ImageViewerModal } from "../../../components/ImageViewerModal";
import { TypingDots } from "../../../components/TypingDots";

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatRoomId = id as Id<"chatRooms">;
  const router = useRouter();

  // Дані з Convex
  const room = useQuery(api.rooms.getRoom, { roomId: chatRoomId });
  const messages = useQuery(api.messages.listMessages, { chatRoomId });
  const currentUser = useQuery(api.users.currentUser);
  const typingUsers = useQuery(api.typing.getTypingUsers, { chatRoomId });

  // Мутації
  const sendMessage = useMutation(api.messages.sendMessage);
  const sendMediaMessage = useMutation(api.messages.sendMediaMessage);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const editMessage = useMutation(api.messages.editMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const setTyping = useMutation(api.typing.setTyping);

  // Локальний стан
  const [inputText, setInputText] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<Id<"messages"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const lastTypingSentRef = useRef(0);

  // Обробка набору тексту з тротлінгом (1.5 с)
  const handleTextChange = (text: string) => {
    setInputText(text);

    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = now;
      setTyping({ chatRoomId }).catch(() => {});
    }
  };

  // Вибір фото з медіатеки
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  // Відправка повідомлення або збереження редагування
  const handleSend = async () => {
    const text = inputText.trim();
    if ((!text && !selectedImageUri) || isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (editingMessageId) {
        // Режим збереження редагування
        await editMessage({
          messageId: editingMessageId,
          content: text,
        });
        setEditingMessageId(null);
      } else if (selectedImageUri) {
        // Режим завантаження фото в Convex Storage
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(selectedImageUri);
        const blob = await response.blob();

        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type || "image/jpeg" },
          body: blob,
        });

        const { storageId } = await uploadResult.json();

        await sendMediaMessage({
          chatRoomId,
          storageId,
          content: text || undefined,
        });

        setSelectedImageUri(null);
      } else {
        // Звичайна відправка тексту
        await sendMessage({
          chatRoomId,
          content: text,
        });
      }

      setInputText("");
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error(error);
      Alert.alert("Помилка", "Не вдалося надіслати повідомлення");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Меню дій над повідомленням (тільки для власних)
  const handleMessageLongPress = (item: {
    _id: Id<"messages">;
    senderId: Id<"users">;
    content?: string;
  }) => {
    if (item.senderId !== currentUser?._id) return;

    const options: any[] = [];

    if (item.content) {
      options.push({
        text: "Редагувати",
        onPress: () => {
          setEditingMessageId(item._id);
          setInputText(item.content || "");
        },
      });
    }

    options.push({
      text: "Видалити",
      style: "destructive",
      onPress: () => {
        Alert.alert("Видалити повідомлення", "Ви впевнені, що хочете видалити повідомлення?", [
          { text: "Скасувати", style: "cancel" },
          {
            text: "Так, видалити",
            style: "destructive",
            onPress: () => deleteMessage({ messageId: item._id }),
          },
        ]);
      },
    });

    options.push({ text: "Скасувати", style: "cancel" });

    Alert.alert("Дії з повідомленням", undefined, options);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: room?.title ?? "Чат",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/settings/${chatRoomId}`)}
              className="p-1"
            >
              <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Список повідомлень */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isOwn = item.senderId === currentUser?._id;

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() => handleMessageLongPress(item)}
              className={`flex-row ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <View
                className={`max-w-[80%] rounded-2xl p-3 ${
                  isOwn ? "bg-primary rounded-br-xs" : "bg-secondary rounded-bl-xs"
                }`}
              >
                {!isOwn && (
                  <Text className="text-textMuted text-xs font-semibold mb-1">
                    {item.senderName}
                  </Text>
                )}

                {/* Фотографія (якщо надіслана) */}
                {item.imageUrl && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setFullscreenImage(item.imageUrl!)}
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      className="w-56 h-56 rounded-xl mb-1 bg-surface"
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}

                {/* Текст повідомлення */}
                {item.content ? (
                  <Text className="text-white text-base leading-5">{item.content}</Text>
                ) : null}

                {/* Час та позначка (ред.) */}
                <View className="flex-row items-center justify-end mt-1 gap-1">
                  {item.isEdited && (
                    <Text className="text-white/60 text-[10px] italic">(ред.)</Text>
                  )}
                  <Text className="text-white/60 text-[10px]">
                    {new Date(item._creationTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Індикатор набору тексту іншими користувачами */}
      {typingUsers && typingUsers.length > 0 && (
        <TypingDots typingUsers={typingUsers} />
      )}

      {/* Панель активного редагування повідомлення */}
      {editingMessageId && (
        <View className="flex-row items-center justify-between px-4 py-2 bg-surfaceLight border-t border-surface">
          <View className="flex-row items-center flex-1 mr-2">
            <Ionicons name="pencil" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text className="text-white text-xs font-semibold">Редагування повідомлення</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditingMessageId(null);
              setInputText("");
            }}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Прев'ю обраної картинки перед відправкою */}
      {selectedImageUri && (
        <View className="flex-row items-center px-4 py-2 bg-surfaceLight border-t border-surface">
          <Image source={{ uri: selectedImageUri }} className="w-12 h-12 rounded-lg mr-3" />
          <Text className="text-white text-xs flex-1">Фото прикріплено</Text>
          <TouchableOpacity onPress={() => setSelectedImageUri(null)}>
            <Ionicons name="close-circle" size={22} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* Панель введення */}
      <View className="flex-row items-center p-3 bg-surface border-t border-surfaceLight">
        <TouchableOpacity
          onPress={pickImage}
          disabled={isSubmitting}
          className="mr-2 p-2 rounded-full bg-surfaceLight"
        >
          <Ionicons name="image-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        <TextInput
          className="flex-1 bg-background text-white px-4 py-2.5 rounded-full text-base border border-surfaceLight mr-2"
          placeholder={
            editingMessageId
              ? "Змініть текст..."
              : selectedImageUri
              ? "Додайте підпис до фото..."
              : "Напишіть повідомлення..."
          }
          placeholderTextColor={COLORS.textMuted}
          value={inputText}
          onChangeText={handleTextChange}
          multiline
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={(!inputText.trim() && !selectedImageUri) || isSubmitting}
          className={`w-11 h-11 rounded-full items-center justify-center bg-primary ${
            (!inputText.trim() && !selectedImageUri) || isSubmitting
              ? "opacity-50"
              : "active:opacity-80"
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={editingMessageId ? "checkmark" : "send"}
              size={20}
              color="#FFFFFF"
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Модальне вікно для повноекранного перегляду зображення */}
      <ImageViewerModal
        visible={!!fullscreenImage}
        imageUrl={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />
    </KeyboardAvoidingView>
  );
}