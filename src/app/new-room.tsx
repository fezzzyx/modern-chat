import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter, Stack } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { COLORS } from "../../constants/theme";

export default function NewRoomScreen() {
  const router = useRouter();
  const createRoom = useMutation(api.rooms.createRoom);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Помилка", "Будь ласка, введіть назву кімнати.");
      return;
    }

    setIsLoading(true);
    try {
      const roomId = await createRoom({
        title: title.trim(),
        description: description.trim() || undefined,
      });
      router.back();
      router.push(`/chat/${roomId}`);
    } catch (error) {
      console.error("Error creating room", error);
      Alert.alert("Помилка", "Не вдалося створити кімнату.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface p-6">
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={handleCreate}
              disabled={isLoading || !title.trim()}
              className={`px-3 py-1.5 rounded-xl bg-primary ${
                isLoading || !title.trim() ? "opacity-50" : ""
              }`}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white text-sm font-bold">Створити</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <View className="gap-4 mt-2">
  <View>
    <Text className="text-textMuted text-xs font-semibold uppercase mb-2">
      Назва кімнати *
    </Text>

    <TextInput
      className="bg-secondary border border-surfaceLight rounded-2xl px-4 py-3.5 text-white text-base"
      placeholder="Наприклад: Обговорення React Native"
      placeholderTextColor={COLORS.textMuted}
      value={title}
      onChangeText={setTitle}
      maxLength={100}
      autoFocus
    />
  </View>

    <View>
        <Text className="text-textMuted text-xs font-semibold uppercase mb-2">
        Опис (необов'язково)
        </Text>

        <TextInput
        className="bg-secondary border border-surfaceLight rounded-2xl px-4 py-3.5 text-white text-base min-h-[100px]"
        placeholder="Короткий опис теми спілкування..."
        placeholderTextColor={COLORS.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        maxLength={300}
        textAlignVertical="top"
        />
    </View>

    {/* Кнопка створення */}
    <TouchableOpacity
        onPress={handleCreate}
        disabled={isLoading || !title.trim()}
        className={`w-full bg-primary rounded-2xl py-4 mt-2 items-center ${
        isLoading || !title.trim() ? "opacity-50" : ""
        }`}
        activeOpacity={0.8}
    >
        {isLoading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
        <Text className="text-white text-base font-bold">
            Створити кімнату
        </Text>
        )}
    </TouchableOpacity>
    </View>
    </View>
  );
}