import { useEffect } from "react";
import { useConvexAuth } from "@convex-dev/auth/react";
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter, useSegments } from "expo-router";

export default function InitialLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthScreen = segments[0] === "(auth)";

    if (isAuthenticated) {
      if (inAuthScreen) {
        router.replace("/(app)");
      }
    } else {
      if (!inAuthScreen) {
        router.replace("/(auth)/login");
      }
    }

    SplashScreen.hideAsync();
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}