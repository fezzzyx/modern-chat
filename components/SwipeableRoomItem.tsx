import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { Id } from "../convex/_generated/dataModel";

interface RoomData {
  _id: Id<"chatRooms">;
  title: string;
  description?: string;
  creatorId: Id<"users">;
  lastMessage?: string;
  lastMessageAt?: number;
}

interface SwipeableRoomItemProps {
  room: RoomData;
  isCreator: boolean;
  onPress: () => void;
  onDelete: (roomId: Id<"chatRooms">) => void;
}

const ACTION_WIDTH = 80; // Ширина прихованої кнопки видалення

export const SwipeableRoomItem: React.FC<SwipeableRoomItemProps> = ({
  room,
  isCreator,
  onPress,
  onDelete,
}) => {
  const translateX = useSharedValue(0);

  // Скидання положення картки
  const resetPosition = () => {
    "worklet";
    translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
  };

  const handleDeletePress = () => {
    resetPosition();
    onDelete(room._id);
  };

  // Конфігурація горизонтального жесту Pan
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // Не блокує вертикальний скрол FlatList
    .onUpdate((event) => {
      // Дозволяємо свайп лише вліво (від 0 до -100)
      if (event.translationX <= 0) {
        translateX.value = Math.max(event.translationX, -ACTION_WIDTH - 20);
      } else {
        // Легкий супротив при спробі тягнути вправо
        translateX.value = event.translationX * 0.15;
      }
    })
    .onEnd((event) => {
      if (event.translationX < -ACTION_WIDTH / 2) {
        // Фіксуємо у відкритому стані
        translateX.value = withSpring(-ACTION_WIDTH, { damping: 18, stiffness: 180 });
      } else {
        // Повертаємо назад
        translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  // Анімований стиль для верхньої картки
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Анімована прозорість та масштаб іконки смітника
  const animatedIconStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.abs(translateX.value) / ACTION_WIDTH, 1);
    return {
      opacity: progress,
      transform: [{ scale: 0.6 + 0.4 * progress }],
    };
  });

  return (
    <View className="relative overflow-hidden rounded-2xl mb-3">
      {/* Нижня фонова панель з кнопкою видалення */}
      <View className="absolute inset-0 bg-red-600 rounded-2xl flex-row justify-end items-center pr-5">
        <TouchableOpacity
          onPress={handleDeletePress}
          activeOpacity={0.8}
          className="items-center justify-center h-full px-2"
        >
          <Animated.View style={animatedIconStyle} className="items-center">
            <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
            <Text className="text-white text-[11px] font-bold mt-1">
              {isCreator ? "Видалити" : "Закрити"}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Верхня картка кімнати, що рухається */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedCardStyle}>
          <TouchableOpacity
            onPress={() => {
              if (translateX.value !== 0) {
                resetPosition();
              } else {
                onPress();
              }
            }}
            activeOpacity={0.9}
            className="bg-secondary border border-surfaceLight rounded-2xl p-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1 mr-3">
              {/* Іконка чат-кімнати */}
              <View className="w-12 h-12 rounded-xl bg-surfaceLight items-center justify-center mr-3.5">
                <Ionicons name="chatbubbles" size={22} color={COLORS.primary} />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-white text-base font-bold flex-shrink" numberOfLines={1}>
                    {room.title}
                  </Text>
                  {isCreator && (
                    <View className="bg-primary/20 px-1.5 py-0.5 rounded">
                      <Text className="text-primary text-[10px] font-semibold">автор</Text>
                    </View>
                  )}
                </View>

                {room.lastMessage ? (
                  <Text className="text-textMuted text-xs mt-1" numberOfLines={1}>
                    {room.lastMessage}
                  </Text>
                ) : (
                  <Text className="text-textMuted/60 text-xs italic mt-1" numberOfLines={1}>
                    {room.description || "Повідомлень ще немає"}
                  </Text>
                )}
              </View>
            </View>

            {/* Час або стрілочка */}
            <View className="items-end">
              {room.lastMessageAt ? (
                <Text className="text-textMuted text-[10px] mb-1">
                  {new Date(room.lastMessageAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              ) : null}
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};