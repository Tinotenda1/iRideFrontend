// components/RatingModal.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { IRAvatar } from "./IRAvatar";
import { IRButton } from "./IRButton";

interface RatingModalProps {
  visible: boolean;
  title: string;
  subtitle: string;
  userName?: string;
  userImage?: string;
  onSelectRating: (rating: number, comment: string) => void;
  isLoading?: boolean;
}

const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  title,
  subtitle,
  userName,
  userImage,
  onSelectRating,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsLoading(true);
    try {
      await onSelectRating(rating, comment);
      setRating(0);
      setComment("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent={true} // ✅ Extends backdrop behind the status bar
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.backdrop}
      >
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>

          {/* User Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.imageWrapper}>
              <IRAvatar
                source={userImage ? { uri: userImage } : undefined}
                name={userName}
                size={84}
              />
            </View>
            {userName && <Text style={styles.userNameText}>{userName}</Text>}
          </View>

          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Ionicons
                  name={rating >= star ? "star" : "star-outline"}
                  size={42}
                  color={rating >= star ? "#FFCC00" : "#E0E0E0"}
                  style={styles.star}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Tell us more about your experience..."
            placeholderTextColor="#999"
            multiline
            value={comment}
            onChangeText={setComment}
            editable={!isLoading}
          />

          <IRButton
            title="Submit Rating"
            variant="primary"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={rating === 0}
            style={
              rating === 0 ? styles.disabledBtn : { backgroundColor: "#10B981" }
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default RatingModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    justifyContent: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 20,
    textAlign: "center",
  },
  profileSection: { alignItems: "center", marginBottom: 15 },
  imageWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#34C759",
  },
  userNameText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
  },
  starRow: { flexDirection: "row", marginBottom: 24 },
  star: { marginHorizontal: 4 },
  input: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    height: 80,
    textAlignVertical: "top",
    fontSize: 15,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  disabledBtn: { backgroundColor: "#CBD5E1" },
});
