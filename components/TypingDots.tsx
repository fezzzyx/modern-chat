import { View, Text, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { COLORS } from "../constants/theme";

type Props = {
  typingUsers: string[];
};

export function TypingDots({ typingUsers }: Props) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: -4,
            duration: 300,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  if (typingUsers.length === 0) return null;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0]} друкує`
      : `${typingUsers.join(", ")} друкують`;

  return (
    <View className="flex-row items-center px-4 py-1.5 bg-background">
      <Text className="text-textMuted text-xs mr-2">{text}</Text>
      <View className="flex-row items-center gap-1">
        <Animated.View
          className="w-1.5 h-1.5 rounded-full bg-primary"
          style={{ transform: [{ translateY: dot1 }] }}
        />
        <Animated.View
          className="w-1.5 h-1.5 rounded-full bg-primary"
          style={{ transform: [{ translateY: dot2 }] }}
        />
        <Animated.View
          className="w-1.5 h-1.5 rounded-full bg-primary"
          style={{ transform: [{ translateY: dot3 }] }}
        />
      </View>
    </View>
  );
}