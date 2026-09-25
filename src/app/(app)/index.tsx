import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { COLORS } from "../../../constants/theme";

export default function HomeScreen() {
  const router = useRouter();
  const rooms = useQuery(api.rooms.listRooms);
  const user = useQuery(api.users.currentUser);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              className="mr-3 w-9 h-9 rounded-full bg-secondary border border-surfaceLight items-center justify-center"
              activeOpacity={0.8}
            >
              <Ionicons name="person" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/new-room")}
              className="w-9 h-9 rounded-full bg-primary items-center justify-center"
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />

      {rooms === undefined ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : rooms.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-16 h-16 rounded-3xl bg-secondary items-center justify-center mb-4">
            <Ionicons name="chatbubbles-outline" size={32} color={COLORS.textMuted} />
          </View>
          <Text className="text-white text-lg font-bold text-center">
            Немає активних кімнат
          </Text>
          <Text className="text-textMuted text-sm text-center mt-1">
            Створіть першу кімнату за допомогою кнопки «+» угорі
          </Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/chat/${item._id}`)}
              className="bg-secondary border border-surfaceLight rounded-2xl p-4 flex-row items-center justify-between active:opacity-80"
              activeOpacity={0.8}
            >
              <View className="flex-1 mr-3">
                <Text className="text-white text-base font-bold" numberOfLines={1}>
                  {item.title}
                </Text>
                {item.description ? (
                  <Text className="text-textMuted text-sm mt-0.5" numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
                {item.lastMessage ? (
                  <Text className="text-primary text-xs mt-1.5" numberOfLines={1}>
                    Останнє: {item.lastMessage}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}