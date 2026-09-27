import { ConfigContext, ExpoConfig } from "expo/config";

const APP_NAME = "Prostir";
const PACKAGE_NAME = "com.prostir.app";
const SCHEME = "prostir";

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment =
    (process.env.APP_ENV as "development" | "preview" | "production") ||
    "development";

  console.log("⚙️  Поточне середовище збірки:", environment);
  console.log("📦 URL бази даних Convex:", process.env.EXPO_PUBLIC_CONVEX_URL);

  const isDev = environment === "development";

  return {
    ...config,
    name: isDev ? `${APP_NAME} Dev` : APP_NAME,
    slug: "prostir",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: isDev ? `${SCHEME}-dev` : SCHEME,
    userInterfaceStyle: "automatic",

    ios: {
      icon: "./assets/expo.icon",
      bundleIdentifier: isDev ? `${PACKAGE_NAME}.dev` : PACKAGE_NAME,
      infoPlist: {
        NSCameraUsageDescription:
          "Додатку Prostir потрібен доступ до камери для запису круглих відеоповідомлень.",
        NSMicrophoneUsageDescription:
          "Додатку Prostir потрібен доступ до мікрофона для запису звуку у відеоповідомленнях.",
      },
    },

    android: {
      package: isDev ? `${PACKAGE_NAME}.dev` : PACKAGE_NAME,
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
      ],
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#208AEF",
          image: "./assets/images/splash-icon.png",
          imageWidth: 76,
        },
      ],
      "expo-secure-store",
      [
        "expo-audio",
        {
          microphonePermission:
            "Дозвольте Prostir доступ до мікрофона для запису голосових сповіщень до публікацій.",
          recordAudioAndroid: true,
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission:
            "Додатку Prostir потрібен доступ до камери для запису відеокружечків.",
          microphonePermission:
            "Додатку Prostir потрібен доступ до мікрофона для запису звуку у відеокружечках.",
        },
      ],
      ["expo-video"],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};