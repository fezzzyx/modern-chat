import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
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

export interface MessageItemData {
  _id: Id<"messages">;
  senderId: Id<"users">;
  senderName: string;
  senderPhoto?: string;
  content?: string;
  imageUrl?: string;
  isEdited?: boolean;
  replyToId?: Id<"messages">;
  replyToSender?: string;
  replyToText?: string;
  _creationTime: number;
}

interface SwipeableMessageItemProps {
  item: MessageItemData;
  isOwn: boolean;
  onLongPress: () => void;
  onReply: (message: MessageItemData) => void;
  onImagePress?: (url: string) => void;
  onAuthorPress?: (userId: Id<"users">) => void;
}

const SWIPE_THRESHOLD = 50;

export const SwipeableMessageItem: React.FC<SwipeableMessageItemProps> = ({
  item,
  isOwn,
  onLongPress,
  onReply,
  onImagePress,
  onAuthorPress,
}) => {
  const translateX = useSharedValue(0);

  const triggerReply = () => {
    onReply(item);
  };

  // Жест свайпу вправо для відповіді
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Дозволяємо тягнути тільки вправо (від 0 до 80)
      if (event.translationX > 0) {
        translateX.value = Math.min(event.translationX, 80);
      }
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(triggerReply)();
      }
      translateX.value = withSpring(0, { damping: 16, stiffness: 200 });
    });

  const animatedBubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => {
    const progress = Math.min(translateX.value / SWIPE_THRESHOLD, 1);
    return {
      opacity: progress,
      transform: [{ scale: 0.5 + progress * 0.5 }],
    };
  });

  return (
    <View className="relative justify-center my-1">
      {/* Прихована іконка відповіді зліва */}
      <Animated.View
        style={animatedIconStyle}
        className="absolute left-2 z-0 items-center justify-center w-8 h-8 rounded-full bg-primary/30"
      >
        <Ionicons name="arrow-undo" size={18} color={COLORS.primary} />
      </Animated.View>

      {/* Сама бульбашка повідомлення із підтримкою жесту */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={animatedBubbleStyle}
          className={`flex-row ${isOwn ? "justify-end" : "justify-start"}`}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onLongPress={onLongPress}
            className={`max-w-[82%] rounded-2xl p-3 ${
              isOwn ? "bg-primary rounded-br-xs" : "bg-secondary rounded-bl-xs"
            }`}
          >
            {/* Автор повідомлення (клікабельний для переходу в профіль) */}
            {!isOwn && (
              <TouchableOpacity
                onPress={() => onAuthorPress?.(item.senderId)}
                activeOpacity={0.7}
                className="mb-1"
              >
                <Text className="text-primary font-bold text-xs">{item.senderName}</Text>
              </TouchableOpacity>
            )}

            {/* Блок цитованого повідомлення (Reply Box) */}
            {item.replyToSender && (
              <View className="mb-2 p-2 rounded-lg bg-surface/50 border-l-2 border-primary">
                <Text className="text-primary font-semibold text-[11px]">
                  {item.replyToSender}
                </Text>
                <Text className="text-white/70 text-xs mt-0.5" numberOfLines={2}>
                  {item.replyToText || "📷 Фотографія"}
                </Text>
              </View>
            )}

            {/* Фотографія (якщо прикріплена) */}
            {item.imageUrl && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onImagePress?.(item.imageUrl!)}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  className="w-56 h-56 rounded-xl mb-1.5 bg-surface"
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}

            {/* Текст повідомлення */}
            {item.content ? (
              <Text className="text-white text-base leading-5">{item.content}</Text>
            ) : null}

            {/* Час та статус редагування */}
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
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};