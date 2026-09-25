import { Modal, View, Image, TouchableOpacity, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
};

export function ImageViewerModal({ visible, imageUrl, onClose }: Props) {
  if (!imageUrl) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-black justify-center items-center relative">
        {/* Кнопка закриття у правому верхньому кутку */}
        <TouchableOpacity
          onPress={onClose}
          className="absolute top-12 right-6 z-20 w-10 h-10 rounded-full bg-surface/80 items-center justify-center"
        >
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Картинка */}
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-4/5"
          resizeMode="contain"
        />
      </SafeAreaView>
    </Modal>
  );
}