import {
  View,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { Id } from "../convex/_generated/dataModel";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";

type MessageBubbleProps = {
  message: {
    _id: Id<"messages">;
    senderId: Id<"users">;
    senderName?: string;
    content?: string;
    imageUrl?: string;
    audioUrl?: string;
    audioDuration?: number;
    isEdited?: boolean;
    _creationTime: number;
  };
  currentUserId?: Id<"users">;
  onLongPress?: () => void;
  onImagePress?: (imageUrl: string) => void;
};

export function MessageBubble({
  message,
  currentUserId,
  onLongPress,
  onImagePress,
}: MessageBubbleProps) {
  const isMyMessage = message.senderId === currentUserId;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onLongPress={onLongPress}
      className={`flex-row ${
        isMyMessage ? "justify-end" : "justify-start"
      }`}
    >
      <View
        className={`max-w-[80%] rounded-2xl p-3 ${
          isMyMessage
            ? "bg-primary rounded-br-xs"
            : "bg-secondary rounded-bl-xs"
        }`}
      >
        {/* Sender name */}
        {!isMyMessage && (
          <Text className="text-textMuted text-xs font-semibold mb-1">
            {message.senderName}
          </Text>
        )}

        {/* Image */}
        {message.imageUrl && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress?.(message.imageUrl!)}
          >
            <Image
              source={{ uri: message.imageUrl }}
              className="w-56 h-56 rounded-xl mb-1 bg-surface"
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {/* Voice message */}
        {message.audioUrl && (
          <View className="my-1">
            <VoiceMessagePlayer
              audioUrl={message.audioUrl}
              duration={message.audioDuration}
              isMyMessage={isMyMessage}
            />
          </View>
        )}

        {/* Text */}
        {message.content ? (
          <Text className="text-white text-base leading-5">
            {message.content}
          </Text>
        ) : null}

        {/* Time / edited */}
        <View className="flex-row items-center justify-end mt-1 gap-1">
          {message.isEdited && (
            <Text className="text-white/60 text-[10px] italic">
              (ред.)
            </Text>
          )}

          <Text className="text-white/60 text-[10px]">
            {new Date(message._creationTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}