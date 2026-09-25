import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/theme";

export default function ProfileScreen() {
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();

  const handleSignOut = async () => {
  console.log("1. handleSignOut started");

  try {
    console.log("2. calling signOut");
    await signOut();
    console.log("3. signOut completed");
  } catch (error) {
    console.error("4. signOut failed:", error);
  }
};

  if (user === undefined) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface p-6 items-center">
      <View className="w-24 h-24 rounded-full bg-secondary border-2 border-primary/40 items-center justify-center mt-6 mb-4">
        {user?.image ? (
          <Image
            source={{ uri: user.image }}
            className="w-full h-full rounded-full"
          />
        ) : (
          <Ionicons
            name="person"
            size={44}
            color={COLORS.primary}
          />
        )}
      </View>

      <Text className="text-white text-2xl font-bold">
        {user?.name ?? "Користувач"}
      </Text>

      <Text className="text-textMuted text-sm mt-1">
        {user?.email}
      </Text>

      <TouchableOpacity
        onPress={() => {
    console.log("LOGOUT CLICKED");
    handleSignOut();
  }}
        className="w-full bg-danger/20 border border-danger/30 rounded-2xl py-4 mt-12 flex-row items-center justify-center"
        activeOpacity={0.8}
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color={COLORS.danger}
          style={{ marginRight: 8 }}
        />

        <Text className="text-danger text-base font-bold">
          Вийти з акаунту
        </Text>
      </TouchableOpacity>
    </View>
  );
}